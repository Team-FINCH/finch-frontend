import { http, HttpResponse } from 'msw';

import { API_PATHS } from '@/shared/config/apiContract';
import {
  AI_FEEDBACK_COMMENT_MAX_LENGTH,
  AI_FEEDBACK_REASONS,
} from '@/shared/types/ai/feedback';
import {
  AI_RELAY_ERROR_CODES,
  AI_SERVICE_ERROR_CODES,
  COMMON_ERROR_CODES,
} from '@/shared/types/errorCodes';

import {
  aiResponse,
  metricSegment,
  nextAiRequestId,
  section,
  textSegment,
} from '../lib/ai';
import { findStock, type MockStock } from '../lib/catalog';
import {
  aiErrorResponse,
  errorResponse,
  mockPath,
  readJsonBody,
  searchParam,
} from '../lib/http';
import { checkIdempotency } from '../lib/idempotency';
import { requireAuth } from '../lib/session';
import { appendChatHistory, findHolding, store } from '../lib/store';
import { nowKstIso, toKstDateString, toKstIsoString } from '../lib/time';

/**
 * AI 중계 6종 (apiSpec §10 · AI 명세 §3~§8). **`briefing` 만 GET 이다** (contracts C3).
 *
 * **`POST /ai/feedback` 은 접수만 하는 일곱 번째 경로다** (contracts C3). 요청·응답 본문은
 * 이슈 #13 11:02 회신과 `ai/docs/openapi.json` 의 `FeedbackIn`·`FeedbackContent` 로 확정됐다.
 *
 * **`GET /ai/chat/conversations/{id}/messages` 는 여덟 번째다** (AI 명세 §4.1 ·
 * FINCH-278). **계약 없음 — 경로는 프론트 추정값이다**
 * (`shared/config/apiContract.ts` `API_PATHS.ai.chatMessages` 주석). `POST
 * /ai/chat` 이 성공할 때마다 `appendChatHistory` 로 `store.chatConversations` 에
 * 쌓아 뒀다가 그대로 돌려준다 — 실제로 나눈 대화를 복원해야 화면을 오가며
 * 확인할 수 있어서다.
 *
 * **`POST /ai/chat/jobs` 와 `GET /ai/chat/jobs/{jobId}` 는 아홉·열 번째다**
 * (GitLab 이슈 #84 · #90 · FINCH-290 → 298). **응답 모양이 확정됐다**
 * (`frontend/docs/contracts.md` T4). **이 둘도 다른 여덟과 같은 봉투를 쓴다** —
 * 290 판은 봉투 없이 `{jobId, status, result}` 를 주었는데 실제 AI 구현은
 * `aiResponse()` 와 같은 봉투를 유지한다. 갈래 표는 아래 `chatJobs` 블록
 * 주석에 따로 두었다 — 이 표가 이미 길어서다.
 *
 * **(나) `content` 키 유지** — 백엔드는 봉투 필드만 걷어내고 `content` 컨테이너를 그대로 남긴다
 * (GitLab 이슈 #22 회신, 2026-09-02). 각 핸들러는 `content` 본문만 만들고, 재포장 형태는
 * `lib/ai.ts` 의 `aiResponse()` 한 곳에 갇혀 있다.
 *
 * **상태 유지 범위** — 보유 종목이 0개면 진단·원인 분석이 `INSUFFICIENT_DATA` 로 갈린다.
 * 계좌 리셋이 apiSpec v0.7 에서 없어졌으므로(이슈 #27) 그 갈래는 **보유 종목을 전량 매도해서**
 * 본다. `POST /ai/feedback` 이 접수한 평가는 `store.aiFeedback` 에
 * `requestId` 를 키로 남는다 — **누적하지 않고 덮어쓴다**(contracts C66). 그 밖의 본문은
 * 고정 픽스처다.
 *
 * ## 어느 입력이 어느 응답을 내는가
 *
 * | 입력 | 응답 |
 * | --- | --- |
 * | `POST /ai/chat` `message` 가 `upstream` 으로 시작 | `502 AI_UPSTREAM_UNAVAILABLE` — **`requestId` 가 없다** (§10.4) |
 * | `POST /ai/chat` `message` 가 `timeout` 으로 시작 | `504 AI_UPSTREAM_TIMEOUT` — `requestId` 없음 |
 * | `POST /ai/chat` `message` 가 `guardrail` 로 시작 | `422 GUARDRAIL_BLOCKED` — `requestId` 있음 |
 * | `POST /ai/chat` `message` 가 `ratelimit` 으로 시작 | `429 AI_UPSTREAM_RATE_LIMITED` + `detail.reason: 'request_rate_limit'` + `Retry-After: 2` — **자동 재시도가 2초 뒤에 나간다** |
 * | `POST /ai/chat` `message` 가 `budget` 으로 시작 | `429 AI_UPSTREAM_RATE_LIMITED` + `detail.reason: 'daily_token_budget'`, `Retry-After` 없음 — **재시도가 나가지 않는다** (요청 1건으로 끝) |
 * | `POST /ai/chat` 빈 `message` 나 2,000자 초과 | `400 INVALID_REQUEST` |
 * | `POST /ai/stocks/{stockCode}/analysis` 카탈로그에 없는 종목 | `404 INSTRUMENT_NOT_FOUND` (AI 서버 코드가 그대로 통과) |
 * | 분석 · 보유 중이고 활성 논지가 있는 종목(`005930`) | 섹션 **일곱 전부** |
 * | 분석 · 보유 중이고 논지가 없는 종목(`035720`) | `thesisCheck` 가 `null`. **`attention` 의 `title` 도 `null` 이다** — 제목 없는 섹션 |
 * | 분석 · 미보유 종목(`000660` 외) | `myImpact`·`thesisCheck` 둘 다 `null` (contracts C58 · ia.md §4) |
 * | 분석 · `058610` | **섹션 일곱이 전부 `null`** — 200 인데 그릴 본문이 없는 갈래 |
 * | 분석 · `024060` | `risks` 에서 필수 둘(`text`·`segments`)이 빠진 **계약 위반 응답** — 스키마가 거부하는 것을 화면에서 본다 |
 * | 진단·원인 분석 · 보유 종목 0개 | `409 INSUFFICIENT_DATA` — 에러가 아니라 정상 거절이다 (contracts C12) |
 * | `GET /ai/briefing?date=` 에 오늘이 아닌 날짜 | `status: 'empty'` + 빈 `items` (200) |
 * | `POST /ai/orders/preview` 주문 금액이 예수금 초과 | `feasible: false` + `shortfall` — **200 응답의 본문이다** |
 * | `POST /ai/orders/preview` 논지를 기록해 둔 종목(`005930`)이 아닌 주문 | `thesisConflicts: []` — 에러가 아니라 정상이다. 화면은 그 덩어리만 감춘다 (ia.md §4) |
 * | `POST /ai/feedback` `requestId` 누락 · `rating` 열거값 밖 · `reasons` 열거값 밖 · `comment` 1,000자 초과 | `400 INVALID_REQUEST` |
 * | `POST /ai/feedback` 정상 | `content: {recorded: true}` — 같은 `requestId` 로 다시 보내면 앞의 평가를 덮어쓴다 |
 * | `POST /ai/feedback` 모르는 `requestId` | **갈래를 만들지 않았다.** 정상 접수로 답한다 — 아래 참고 |
 * | `GET /ai/chat/conversations/{id}/messages` 모르는(또는 아직 대화한 적 없는) id | 빈 `messages` — 에러가 아니다 (§4.1) |
 *
 * `requestId` 유무가 피드백 슬롯을 붙일 수 있는지를 가른다 (contracts C14). 목이 그 두 갈래를
 * 모두 낸다.
 *
 * **모르는 `requestId` 의 에러 갈래는 만들지 않았다.** apiSpec §11.2 가 그 처리를 "AI 서버 몫"
 * 이라고만 적고 발행 코드를 정하지 않았다. 목이 코드를 골라 버리면 없는 계약이 굳는다.
 * 목은 어느 `requestId` 든 접수하고, 화면은 성공 경로만 이 목으로 확인한다.
 */

/**
 * `segments[].raw` 의 `unit: 'ratio'` 는 **0~1 소수**다 (AI 명세 §2.1). 화면에 보이는
 * `value` 문자열("1.21%")과 계열이 다르다 — 백엔드 `changeRate` 계열의 백분율이 아니다.
 */

const CHAT_UPSTREAM_UNAVAILABLE_PREFIX = 'upstream';
const CHAT_UPSTREAM_TIMEOUT_PREFIX = 'timeout';
const CHAT_GUARDRAIL_PREFIX = 'guardrail';
const CHAT_RATE_LIMIT_PREFIX = 'ratelimit';
const CHAT_BUDGET_PREFIX = 'budget';

/**
 * `429 AI_UPSTREAM_RATE_LIMITED` 의 두 갈래 문구 (apiSpec §10.4 v0.8.6).
 * **AI 서버가 준 `message` 를 백엔드가 그대로 내려보낸다** — 화면이 문구를 새로
 * 만들지 않으므로 목도 명세에 적힌 문장을 그대로 쓴다.
 */
const CHAT_RATE_LIMIT_MESSAGE =
  '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
const CHAT_BUDGET_MESSAGE =
  '오늘 사용할 수 있는 AI 분석량을 모두 사용했습니다.';

/**
 * 논지를 기록해 둔 종목. `POST /ai/orders/preview` 의 `thesisConflicts` 픽스처가
 * 이 종목의 것이라 다른 종목 주문에는 딸려 나가지 않는다 (AI 명세 §7).
 */
const THESIS_RECORDED_TICKER = '005930';

/**
 * 보유 종목이 없을 때의 정상 거절 (AI 명세 §2.6).
 *
 * **`detail.reason` 을 싣지 않는다.** 열거값은 `llm_key_missing`·`ledger_unavailable` 둘이
 * 전부이고(contracts C63), 보유 종목 없음은 그 둘 중 하나가 아니라 `reason` 자체가 없는
 * 경우다. 프론트가 `reason` 없는 갈래를 반드시 처리해야 하므로 목이 그 갈래를 낸다.
 */
function insufficientData(requestId: string) {
  return aiErrorResponse(
    AI_SERVICE_ERROR_CODES.INSUFFICIENT_DATA,
    '보유 종목이 없어 분석할 수 없어요',
    409,
    requestId,
    { holdingCount: 0 },
  );
}

/**
 * 종목 AI 분석의 섹션 픽스처 (openapi `AnalysisContent`·`AnalysisSections`·
 * `AnalysisSection`, contracts C57~C59 · ia.md §4 3번 슬롯).
 *
 * **목이 계약보다 관대해지지 않게 세 가지를 지킨다.**
 * - `text` 를 손으로 적지 않고 `segments` 를 이어 붙여 만든다 — "이어 붙이면 `text` 와
 *   정확히 일치한다"(C55)를 목이 먼저 어기면 화면이 어느 쪽을 그리든 같다는 전제가 무너진다
 * - 섹션이 `null` 이 되는 조건을 지어내지 않고 **원장 상태에서 끌어낸다** —
 *   `myImpact` 는 미보유일 때, `thesisCheck` 는 활성 논지가 없을 때 `null` 이다(ia.md §4 표).
 *   실제 서버도 같은 이유로 `null` 을 낸다
 * - `supporting`·`challenging`·`events` 는 **빈 배열로 둔다**(C56). 값을 채우면 지금 구현이
 *   내지 않는 것을 목만 내게 된다
 *
 * `cached` 는 항상 `false`, `cachedAt` 은 항상 `null` 이다(C56).
 *
 * **근거 각주(`[^cit_N]`)를 세 갈래로 심어 뒀다** (AI 명세 §2.4 · `envelope.ts`).
 * 서술 안에 각주가 오는 것이 계약인데 목에 없으면 `AiSegmentText` 가 그것을
 * 지우는지를 화면에서 확인할 방법이 없다. 셋은 각각 다른 것을 본다.
 * - `changes` — 정본 `[^cit_1]`. `MOCK_CITATIONS` 에 있는 id 이고 강조 조각 바로 뒤다
 * - `attention` — `MOCK_CITATIONS` 에 **없는** `[^cit_9]`. 가드레일이 반려하는 사유가
 *   `used_citations 에 존재하지 않는 근거` 라 실제로 올 수 있는 값이다
 * - `risks` — 대괄호가 빠진 맨몸 `^cit_2`. 실제 응답 로그에 섞여 나온 형태다
 *
 * 셋 다 화면에는 남지 않아야 한다. 앞 공백까지 걷혀 `…나왔어요.` 로 보이면 맞다.
 */
type AiSegmentFixture = ReturnType<typeof textSegment | typeof metricSegment>;

function analysisSection(title: string | null, parts: AiSegmentFixture[]) {
  return section(title, parts.map((part) => part.value).join(''), parts);
}

/** 등락률 문자열. **부호를 항상 붙인다** (frontConvention §11 등락 표기 규약). */
function changeRateText(rate: number): string {
  return `${rate >= 0 ? '+' : '-'}${(Math.abs(rate) * 100).toFixed(2)}%`;
}

/**
 * `attention` 의 `title` 을 `null` 로 내는 종목.
 * **제목이 없으면 화면이 제목을 그리지 않는다**(ia.md:447)를 볼 자리다.
 * 키 이름을 한국어로 옮겨 제목을 지어내면 이 갈래에서 티가 난다.
 */
const ANALYSIS_TITLELESS_STOCK = '035720';

/**
 * 섹션 일곱이 전부 `null` 인 종목. 시세도 없는 소형주라(`quoteState: 'missing'`)
 * AI 근거가 하나도 모이지 않은 상태를 여기에 붙였다. **200 이고 에러가 아니다** —
 * 화면은 빈 상태 안내로 접는다.
 */
const ANALYSIS_EMPTY_STOCK = '058610';

/**
 * 필수 둘(`text`·`segments`)이 빠진 섹션을 내는 종목. **계약 위반 응답이다.**
 *
 * 목이 계약보다 관대해 실제 백엔드에서만 깨진 사고가 있었으므로, 반대 방향도
 * 화면에서 확인할 수 있게 둔다 — 스키마가 이 응답을 거부해 `SchemaError` 가 나고
 * AI 탭이 에러 자리로 접히는 것이 정상 동작이다. 스키마를 느슨하게 고쳐 이 갈래를
 * 통과시키면 안 된다.
 */
const ANALYSIS_CONTRACT_BREACH_STOCK = '024060';

function analysisSections(stock: MockStock) {
  const holding = findHolding(stock.stockCode);
  const thesis = store.wiki.theses.find(
    (entry) => entry.ticker === stock.stockCode && entry.status === 'active',
  );
  // 0~1 소수다. 백엔드 changeRate 계열의 백분율이 아니다 (AI 명세 §2.1).
  const changeRate =
    (stock.currentPrice - stock.previousClose) / stock.previousClose;
  const direction = changeRate >= 0 ? ('up' as const) : ('down' as const);

  return {
    current: analysisSection('현재 상황', [
      textSegment(
        `${stock.stockName}는 ${stock.sector} 업종이고 어제 종가보다 `,
      ),
      metricSegment(
        changeRateText(changeRate),
        changeRate,
        'ratio',
        'price',
        direction,
      ),
      textSegment(
        ' 움직였어요. 반기보고서에 적힌 이익 흐름이 아직 가격에 다 반영되지 않은 구간이에요.',
      ),
    ]),
    changes: analysisSection('최근 변화', [
      textSegment('반기보고서에서 영업이익률이 '),
      metricSegment('19.0%', 0.19, 'ratio', 'filing', 'up'),
      textSegment(
        '로 올라왔고[^cit_1], 공시 이후 3주 동안 같은 방향이 이어졌어요.',
      ),
    ]),
    attention: analysisSection(
      stock.stockCode === ANALYSIS_TITLELESS_STOCK
        ? null
        : '시장이 주목하는 요인',
      [
        textSegment(
          '다음 분기 계약가 인상 폭과 경쟁사 증설 일정을 함께 보고 있어요. 최근 공시에서 같은 주제가 반복해서 나왔어요 [^cit_9].',
        ),
      ],
    ),
    risks: analysisSection('확인해볼 위험', [
      textSegment(
        '증설 투자비가 2027년부터 비용으로 반영돼요. 고객사 재고가 다시 쌓이면 주문이 빠르게 줄고, 최근 1년 최대 낙폭은 ',
      ),
      metricSegment('-22.14%', -0.2214, 'ratio', 'risk_engine', 'down'),
      textSegment('였어요 ^cit_2.'),
    ]),
    // 미보유면 null 이다. 에러가 아니다 (ia.md §4 표 · contracts C58).
    myImpact:
      holding === undefined
        ? null
        : analysisSection('내 계좌에서는', [
            textSegment('보유 '),
            metricSegment(
              `${holding.quantity}주`,
              holding.quantity,
              'count',
              'portfolio_engine',
              null,
            ),
            textSegment(
              '가 계좌에 있어서 이번 변화가 평가손익에 그대로 반영돼요. 포트폴리오 안에서의 비중은 AI 진단에서 함께 볼 수 있어요.',
            ),
          ]),
    // 기록된 활성 논지가 없으면 null 이다 (ia.md §4 표).
    // 제목만 옛 문구로 남겨 둔다 — 서버는 `투자 논지 점검`, 프로토타입은
    // `나의 투자 기준` 이라 아직 값이 안 정해졌다 (FINCH-219).
    thesisCheck:
      thesis === undefined
        ? null
        : {
            ...analysisSection('논지 점검', [
              textSegment('기록한 논지는 “'),
              textSegment(thesis.text),
              textSegment(
                '” 였어요. 공시에서 확인된 이익 흐름은 그 방향과 어긋나지 않았어요.',
              ),
            ]),
            thesis: {
              text: thesis.text,
              recordedAt: thesis.recordedAt,
              source: thesis.source,
            },
            // 항상 빈 배열이다 (contracts C56). 채우면 목만 관대해진다.
            supporting: [],
            challenging: [],
          },
    nextEvents: {
      ...analysisSection('앞으로 확인할 일정', [
        textSegment('다음 실적 발표까지 '),
        metricSegment('20일', 20, 'days', 'filing', null),
        textSegment(
          ' 남았어요. 확정 일정이 공시되면 여기에서 함께 알려드려요.',
        ),
      ]),
      // 항상 빈 배열이다 (contracts C56).
      events: [],
    },
  };
}

/**
 * 답변 픽스처. **동기 경로(`POST /ai/chat`)와 비동기 job 이 같은 것을 쓴다** —
 * 둘이 다른 답을 내면 화면에서 무엇이 바뀐 것인지가 경로 차이인지 본문 차이인지
 * 구분되지 않는다 (FINCH-290).
 *
 * **한 문단 안에 근거 각주(`[^cit_N]`)를 두 개 심어 뒀다** (FINCH-315).
 * 전에는 이 픽스처에 각주가 하나도 없어 채팅 말풍선에 각주가 그대로 새는
 * 버그(사용자가 실제 화면에서 본 것)를 이 목만으로는 재현할 수 없었다. `cit_1`·
 * `cit_2` 는 `MOCK_CITATIONS`(`mocks/lib/ai.ts`)에 있는 id 라 `aiResponse()` 의
 * 기본 `citations` 로 그대로 검증된다.
 */
const CHAT_ANSWER_TEXT =
  '보유 중인 삼성전자는 어제보다 1.21% 내렸어요[^cit_1]. 반도체 업종 전반의 약세 흐름이 함께 언급됐고, 반도체 비중이 62.4%로 높은 편이라 같은 방향으로 함께 움직이기 쉬워요[^cit_2].';

function chatAnswerContent(conversationId: string) {
  return {
    conversationId,
    // answer.title 은 항상 null 이다. 말풍선 제목은 프론트가 정한다 (contracts C53).
    // 세그먼트를 이어 붙이면 CHAT_ANSWER_TEXT 와 정확히 일치해야 한다(contracts C55).
    answer: section(null, CHAT_ANSWER_TEXT, [
      textSegment('보유 중인 삼성전자는 어제보다 '),
      metricSegment('1.21%', -0.0121, 'ratio', 'price', 'down'),
      textSegment(
        ' 내렸어요[^cit_1]. 반도체 업종 전반의 약세 흐름이 함께 언급됐고, 반도체 비중이 ',
      ),
      metricSegment('62.4%', 0.624, 'ratio', 'portfolio_engine', 'up'),
      textSegment('로 높은 편이라 같은 방향으로 함께 움직이기 쉬워요[^cit_2].'),
    ]),
    toolsUsed: ['get_quote', 'get_portfolio'],
  };
}

/**
 * ## AI 채팅 비동기 작업 (FINCH-290 → 298, GitLab 이슈 #84 · #90)
 *
 * **응답 모양은 확정됐지만 백엔드 중계가 아직 없어서, 이 목이 여전히 그 계약의
 * 유일한 구현이다** (`contracts.md` T4). `AiRoute.java` 에 이 두 경로가 없어
 * AI 가 준비돼도 프론트는 닿지 못한다 — 목이 어긋나 있으면 확인할 방법이 없다.
 * 그래서 **AI 구현(`ai/app/api/routes/chat.py` `_job_envelope`)이 내보내는
 * 모양을 그대로 따른다.**
 *
 * **상태 유지 범위** — 접수한 job 을 모듈 변수에 담는다. 새로고침하면 사라진다
 * (`lib/idempotency.ts` 와 같은 방식이고 같은 이유다). 그래서 새로고침 복원을
 * 목으로 확인하려면 job 이 도는 동안 새로고침해야 하고, 그때 프론트는 적어 둔
 * `jobId` 로 조회했다가 404 를 받아 "조회 불가" 갈래로 떨어진다 — 그 갈래도
 * 화면에서 봐야 하는 것이라 일부러 흉내 내지 않는다.
 *
 * **상태는 시각으로 계산한다.** 접수 후 1.5초까지 `queued`, 6초까지 `running`,
 * 그 뒤 `completed`(또는 `failed`)다. **곧바로 `completed` 를 주면 이 기능이 푸는
 * 문제를 재현할 수 없다** — 6초는 답을 기다리다 홈이나 종목 상세로 갔다가 돌아올
 * 수 있는 길이다.
 *
 * | 입력 | 응답 |
 * | --- | --- |
 * | `POST /ai/chat/jobs` `Idempotency-Key` 헤더 없음 | `400 IDEMPOTENCY_KEY_REQUIRED` — job 을 만들지 않는다 |
 * | `POST /ai/chat/jobs` 키가 `a` 로 시작하는 첫 요청 | `409 IDEMPOTENCY_IN_PROGRESS`. 같은 키로 다시 보내면 접수된다 |
 * | `POST /ai/chat/jobs` 이미 처리된 키 + 같은 본문 | 최초의 `202` 와 **같은 `jobId`** — 접수 실패 뒤 재시도가 job 을 둘 만들지 않는 것을 여기서 본다 |
 * | `POST /ai/chat/jobs` `message` 가 `reject` 로 시작 | `503 AI_UPSTREAM_UNAVAILABLE` — **접수 자체가 실패하는 갈래** |
 * | `POST /ai/chat/jobs` 빈 `message` 나 2,000자 초과 | `400 INVALID_REQUEST` |
 * | `POST /ai/chat/jobs` 그 밖 | `202` + 봉투 `content` 에 `jobId`·`status: 'queued'`·`conversationId` |
 * | `GET /ai/chat/jobs/{id}` 접수 1.5초 이내 | `queued` |
 * | `GET /ai/chat/jobs/{id}` 6초 이내 | `running` |
 * | `GET /ai/chat/jobs/{id}` 6초 뒤, `message` 가 `upstream`·`timeout`·`guardrail`·`ratelimit`·`budget` 으로 시작 | `failed` + `content.error` 에 `code`·`message`·`retryable`. **200 응답의 본문이다** |
 * | `GET /ai/chat/jobs/{id}` 6초 뒤, 그 밖 | `completed` + `content.result` 에 동기 경로의 `content`, `citations`·`dataAsOf` 는 봉투 최상위 |
 * | `GET /ai/chat/jobs/{id}` 모르는 `jobId` | `404 RESOURCE_NOT_FOUND` — 다섯 번 연속이면 화면이 기다림을 끝낸다 |
 * | `GET /ai/chat/jobs/{id}` 접수 후 3분 초과 | `404 RESOURCE_NOT_FOUND` — 보존 기간이 지난 갈래. 실제 24시간을 압축한 값이다 |
 *
 * **생성 실패는 이력에 남지 않는다** — `failed` 로 끝나는 job 은
 * `appendChatHistory` 를 부르지 않는다(AI 명세 §4.1, 동기 경로와 같은 규칙).
 * 이력 적재는 **`completed` 를 처음 관측한 때**에 한다. 그래야 "답을 기다리다
 * 나갔고 완료된 뒤에 돌아왔다" 는 경우에 이력이 그 턴을 이미 들고 있는 상태가
 * 재현되고, 프론트가 답을 두 번 그리지 않는지 확인할 수 있다.
 */
const CHAT_JOB_QUEUED_MS = 1_500;
const CHAT_JOB_DURATION_MS = 6_000;

/**
 * 보존 기간. 지나면 조회가 `404` 다 (AI 명세 §4.2 · `app/chat_jobs.py` `RETENTION`).
 *
 * **실제는 24시간이고 여기서는 3분으로 압축했다.** 24시간을 그대로 쓰면 이 갈래를
 * 눈으로 볼 방법이 없는데, 프론트는 `jobId` 를 `localStorage` 에 적어 두므로
 * **한참 뒤 돌아와 404 를 받는 경로가 실제로 생긴다**. 3분은 답을 기다리다 탭을
 * 백그라운드로 두고(폴링이 멈춘다) 돌아오는 것으로 닿는 길이다. 끝난 job 은
 * 화면이 곧바로 스토리지에서 지우므로 이 갈래에 걸리는 것은 대기 중인 job 뿐이다.
 */
const CHAT_JOB_RETENTION_MS = 3 * 60_000;

/** 접수 자체를 실패시키는 접두사. 생성 실패(아래 다섯)와 문이 다르다. */
const CHAT_JOB_REJECT_PREFIX = 'reject';

interface MockChatJob {
  conversationId: string;
  question: string;
  acceptedAt: number;
  /** 끝났을 때 실패로 낼 본문. `null` 이면 성공으로 끝난다. */
  failure: {
    code: string;
    message: string;
    /**
     * 다시 눌러 볼 가치가 있는가 (이슈 #90). **만든 쪽이 한 줄로 알려준다** —
     * 프론트가 코드별 분기표를 또 들지 않게 하려는 것이 이 필드의 의도다.
     */
    retryable: boolean;
    detail?: Record<string, unknown>;
  } | null;
  /** 이력에 이미 적었나. `completed` 를 처음 관측한 때 한 번만 적는다. */
  historyRecorded: boolean;
}

const chatJobs = new Map<string, MockChatJob>();
let nextChatJobSequence = 0;

/**
 * 생성이 끝났을 때 낼 실패. **동기 경로의 갈래를 그대로 옮긴 것**이라 접두사도
 * 같다 — 화면이 같은 코드를 두 경로에서 같게 다루는지 비교할 수 있어야 한다.
 *
 * **`retryable` 이 함께 실린다** (이슈 #90). AI 의 표는
 * `LLM_TIMEOUT`·`RETRIEVAL_FAILED` 둘만 `true` 다(`app/chat_jobs.py` `RETRYABLE`).
 * 아래 다섯은 그 표에 없는 코드가 섞여 있어 값을 **프론트 코드 분기표와 같게**
 * 맞췄다 — 목이 두 판정을 다르게 내놓으면 있지도 않은 불일치를 화면에서 보게 된다.
 *
 * **`AI_UPSTREAM_*` 는 원래 job 실패 본문에 실릴 수 없는 코드다.** 그 셋은 백엔드가
 * AI 에 닿지 못했을 때 스스로 발행하는 것이라 200 본문이 아니라 HTTP 실패로 온다
 * (apiSpec §10.4). 그래도 남겨 둔 이유는 **290 이 만든 갈래 목록이 화면을 확인하는
 * 수단이어서**다 — 일일 예산 말풍선·분당 한도 말풍선을 지금 볼 수 있는 자리가
 * 여기뿐이다. `detail` 도 같은 성격이다(AI 의 `run_job` 은 세 키만 싣는다).
 */
function chatJobFailureFor(message: string): MockChatJob['failure'] {
  if (message.startsWith(CHAT_UPSTREAM_UNAVAILABLE_PREFIX)) {
    return {
      code: AI_RELAY_ERROR_CODES.UPSTREAM_UNAVAILABLE,
      message: 'AI 응답을 불러오지 못했어요',
      retryable: true,
    };
  }
  if (message.startsWith(CHAT_UPSTREAM_TIMEOUT_PREFIX)) {
    return {
      code: AI_RELAY_ERROR_CODES.UPSTREAM_TIMEOUT,
      message: 'AI 응답이 지연되고 있어요',
      retryable: true,
    };
  }
  if (message.startsWith(CHAT_GUARDRAIL_PREFIX)) {
    return {
      code: AI_SERVICE_ERROR_CODES.GUARDRAIL_BLOCKED,
      message: '투자 권유나 가격 예측에는 답할 수 없어요',
      retryable: false,
    };
  }
  if (message.startsWith(CHAT_RATE_LIMIT_PREFIX)) {
    return {
      code: AI_RELAY_ERROR_CODES.UPSTREAM_RATE_LIMITED,
      message: CHAT_RATE_LIMIT_MESSAGE,
      // 분당 한도는 `Retry-After` 뒤에 다시 누르면 풀린다 (apiSpec §10.4).
      retryable: true,
      detail: { reason: 'request_rate_limit' },
    };
  }
  if (message.startsWith(CHAT_BUDGET_PREFIX)) {
    return {
      code: AI_RELAY_ERROR_CODES.UPSTREAM_RATE_LIMITED,
      message: CHAT_BUDGET_MESSAGE,
      // 자정(KST)까지 풀리지 않는다.
      retryable: false,
      detail: { reason: 'daily_token_budget' },
    };
  }
  return null;
}

export const aiHandlers = [
  http.post(
    mockPath(API_PATHS.ai.analysis(':stockCode')),
    ({ request, params }) => {
      const unauthorized = requireAuth(request);
      if (unauthorized !== null) {
        return unauthorized;
      }

      const requestId = nextAiRequestId();
      const stock = findStock(String(params.stockCode));

      if (stock === undefined) {
        // 백엔드는 종목 존재를 미리 검사하지 않는다. AI 서버 코드가 그대로 내려간다 (apiSpec §11.2).
        return aiErrorResponse(
          AI_SERVICE_ERROR_CODES.INSTRUMENT_NOT_FOUND,
          '분석할 수 없는 종목이에요',
          404,
          requestId,
        );
      }

      const dataAsOf = {
        price: nowKstIso(),
        filings: '2026-08-14T09:00:00+09:00',
      };

      // 섹션 일곱이 전부 null 인 갈래. 200 이고 에러가 아니다.
      if (stock.stockCode === ANALYSIS_EMPTY_STOCK) {
        return HttpResponse.json(
          aiResponse(
            {
              ticker: stock.stockCode,
              name: stock.stockName,
              sections: {
                current: null,
                changes: null,
                attention: null,
                risks: null,
                myImpact: null,
                thesisCheck: null,
                nextEvents: null,
              },
            },
            requestId,
            dataAsOf,
          ),
        );
      }

      const sections = analysisSections(stock);

      // 계약 위반 갈래. `risks` 에서 필수 둘을 뺀다 — 스키마가 거부해야 정상이다.
      if (stock.stockCode === ANALYSIS_CONTRACT_BREACH_STOCK) {
        return HttpResponse.json(
          aiResponse(
            {
              ticker: stock.stockCode,
              name: stock.stockName,
              sections: {
                ...sections,
                risks: {
                  title: '확인해볼 위험',
                  cached: false,
                  cachedAt: null,
                },
              },
            },
            requestId,
            dataAsOf,
          ),
        );
      }

      return HttpResponse.json(
        aiResponse(
          { ticker: stock.stockCode, name: stock.stockName, sections },
          requestId,
          dataAsOf,
        ),
      );
    },
  ),

  http.post(mockPath(API_PATHS.ai.chat), async ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const body = await readJsonBody(request);
    const message =
      typeof body?.message === 'string' ? body.message.trim() : '';

    if (message === '' || message.length > 2000) {
      return errorResponse(
        AI_SERVICE_ERROR_CODES.INVALID_REQUEST,
        '질문을 확인해 주세요',
        400,
        { message: '1자 이상 2,000자 이하여야 합니다' },
      );
    }

    // AI 서버에 닿지 못한 두 코드에는 requestId 가 없다
    // (apiSpec §10.4 · GitLab 이슈 #12 4번 회신, 2026-09-02).
    if (message.startsWith(CHAT_UPSTREAM_UNAVAILABLE_PREFIX)) {
      return errorResponse(
        AI_RELAY_ERROR_CODES.UPSTREAM_UNAVAILABLE,
        'AI 응답을 불러오지 못했어요',
        502,
      );
    }

    if (message.startsWith(CHAT_UPSTREAM_TIMEOUT_PREFIX)) {
      return errorResponse(
        AI_RELAY_ERROR_CODES.UPSTREAM_TIMEOUT,
        'AI 응답이 지연되고 있어요',
        504,
      );
    }

    const requestId = nextAiRequestId();

    if (message.startsWith(CHAT_GUARDRAIL_PREFIX)) {
      return aiErrorResponse(
        AI_SERVICE_ERROR_CODES.GUARDRAIL_BLOCKED,
        '투자 권유나 가격 예측에는 답할 수 없어요',
        422,
        requestId,
      );
    }

    /**
     * 429 두 갈래 (apiSpec §10.4 v0.8.6 · MR !195). AI 서버가 응답은 했으므로
     * **`requestId` 가 실린다** — 도달 실패분(502·504)과 반대다.
     *
     * `request_rate_limit` 만 `Retry-After` 를 받는다. 명세가 초 단위 정수에 최소 1을
     * 요구하는데 목은 재시도가 실제로 나가는 것을 눈으로 보려고 2초로 둔다.
     * `daily_token_budget` 에는 **헤더를 붙이지 않는다** — AI 서버가 주지 않는 값이고,
     * 목이 지어내면 자정까지 안 풀릴 요청을 프론트가 다시 보내게 된다.
     */
    if (message.startsWith(CHAT_RATE_LIMIT_PREFIX)) {
      return aiErrorResponse(
        AI_RELAY_ERROR_CODES.UPSTREAM_RATE_LIMITED,
        CHAT_RATE_LIMIT_MESSAGE,
        429,
        requestId,
        { reason: 'request_rate_limit' },
        { 'Retry-After': '2' },
      );
    }

    if (message.startsWith(CHAT_BUDGET_PREFIX)) {
      return aiErrorResponse(
        AI_RELAY_ERROR_CODES.UPSTREAM_RATE_LIMITED,
        CHAT_BUDGET_MESSAGE,
        429,
        requestId,
        { reason: 'daily_token_budget' },
      );
    }

    const conversationId =
      typeof body?.conversationId === 'string' && body.conversationId !== ''
        ? body.conversationId
        : 'conv_mock_0001';

    /**
     * 대화 이력 조회(§4.1 · `GET /ai/chat/conversations/{id}/messages` 아래
     * 핸들러)가 읽을 자리에 남긴다. **성공 갈래에서만 부른다** — 위의 에러
     * 반환문들은 이 줄에 닿지 않으므로 "생성 실패·가드레일 차단은 이력에 안
     * 남는다"(§4.1)가 그대로 지켜진다.
     */
    appendChatHistory(conversationId, message, CHAT_ANSWER_TEXT);

    return HttpResponse.json(
      aiResponse(chatAnswerContent(conversationId), requestId, {
        price: nowKstIso(),
        portfolio: nowKstIso(),
      }),
    );
  }),

  /**
   * 대화 이력 조회 (AI 명세 §4.1 · FINCH-280). **계약 없음 — 경로는 프론트
   * 추정값이다** (`API_PATHS.ai.chatMessages` 주석). 백엔드 중계가 열리면 이
   * 핸들러만 지운다.
   *
   * **봉투가 있다.** 다른 여섯 종과 같은 `aiResponse()` 재포장이다 — 이전 판은
   * 감싸지 않았는데 틀렸다(GitLab 이슈 #79 회신, `shared/types/ai/chat.ts`
   * `AiChatHistorySchema` 주석). 저장된 대화만 돌려주는 조회라 `dataAsOf` 다섯
   * 값은 전부 `null`(기본값), `citations` 는 **빈 배열을 넘겨** 근거를 지어내지
   * 않는다.
   *
   * **모르는 `conversationId` 는 빈 `messages` 를 낸다.** 에러가 아니다 —
   * 존재하지 않거나 다른 사용자의 id 를 구분하지 않는 것도 §4.1 그대로다("소유권
   * 격리는 AI 쪽에서 끝난다"). 목은 로그인한 사용자 하나뿐이라 그 구분 자체가
   * 재현되지 않는다.
   */
  http.get(
    mockPath(API_PATHS.ai.chatMessages(':conversationId')),
    ({ request, params }) => {
      const unauthorized = requireAuth(request);
      if (unauthorized !== null) {
        return unauthorized;
      }

      const conversationId = String(params.conversationId);
      const requestId = nextAiRequestId();
      return HttpResponse.json(
        aiResponse(
          {
            conversationId,
            messages: store.chatConversations[conversationId] ?? [],
          },
          requestId,
          {},
          [],
        ),
      );
    },
  ),

  /**
   * AI 채팅 job 접수 (`POST /ai/chat/jobs` → `202` + `jobId`, GitLab 이슈 #84 ·
   * FINCH-290). **계약은 잠정 확정이다** — 위 `chatJobs` 블록 주석 참고.
   *
   * **멱등성 판정이 본문 검증보다 앞선다** (apiSpec §1.4). 키가 없으면 본문이
   * 틀려도 `IDEMPOTENCY_KEY_REQUIRED` 다 — 주문·출금과 같은 순서다.
   *
   * 백엔드가 이 경로를 `finch.idempotency.paths` 에 태울지는 **아직 미확정**이라
   * (`contracts.md` P41) 목은 태운 쪽을 흉내 낸다. 태우지 않기로 하면 이 핸들러의
   * `checkIdempotency` 한 줄만 빠진다.
   */
  http.post(mockPath(API_PATHS.ai.chatJobs), async ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const body = await readJsonBody(request);

    const idempotency = checkIdempotency(request, body);
    if (idempotency.blocked) {
      return idempotency.response;
    }

    const message =
      typeof body?.message === 'string' ? body.message.trim() : '';

    if (message === '' || message.length > 2000) {
      return errorResponse(
        AI_SERVICE_ERROR_CODES.INVALID_REQUEST,
        '질문을 확인해 주세요',
        400,
        { message: '1자 이상 2,000자 이하여야 합니다' },
      );
    }

    /**
     * **접수 자체가 실패하는 갈래.** 생성 실패(아래 `chatJobFailureFor`)와 문이
     * 달라서 화면이 다르게 다룬다 — 이쪽 실패만 재시도가 같은 멱등성 키를 다시
     * 쓴다(`ChatMessage.retryIdempotencyKey`). 목이 두 문을 다 내지 않으면 그
     * 차이를 화면에서 확인할 수 없다.
     */
    if (message.startsWith(CHAT_JOB_REJECT_PREFIX)) {
      return errorResponse(
        AI_RELAY_ERROR_CODES.UPSTREAM_UNAVAILABLE,
        'AI 요청을 접수하지 못했어요',
        503,
      );
    }

    const conversationId =
      typeof body?.conversationId === 'string' && body.conversationId !== ''
        ? body.conversationId
        : 'conv_mock_0001';

    nextChatJobSequence += 1;
    const jobId = `job_mock_${String(nextChatJobSequence).padStart(4, '0')}`;
    chatJobs.set(jobId, {
      conversationId,
      question: message,
      acceptedAt: Date.now(),
      failure: chatJobFailureFor(message),
      historyRecorded: false,
    });

    /**
     * 같은 키로 다시 오면 이 202 가 그대로 재생된다 — 같은 `jobId` 를 되받으므로
     * 접수 실패 뒤 재시도가 job 을 둘 만들지 않는다.
     *
     * **봉투를 씌운다.** `content` 는 `jobId`·`status`·`conversationId` 셋이고
     * (`create_chat_job` 의 `_job_envelope`), 접수 직후라 `status` 는 언제나
     * `queued` 다. 아직 아무것도 읽지 않았으므로 `dataAsOf` 는 전부 `null`,
     * `citations` 는 빈 배열이다.
     */
    return idempotency.commit(
      202,
      aiResponse(
        { jobId, status: 'queued', conversationId },
        nextAiRequestId(),
        {},
        [],
      ),
    );
  }),

  /**
   * AI 채팅 job 조회 (`GET /ai/chat/jobs/{jobId}`, GitLab 이슈 #84 ·
   * FINCH-290). **계약은 잠정 확정이다.**
   *
   * 상태를 저장하지 않고 **접수 시각에서 계산한다** — 타이머를 돌리면 목이 실제
   * 서버보다 똑똑해져서, 탭을 오래 두고 돌아왔을 때의 동작이 달라진다.
   */
  http.get(mockPath(API_PATHS.ai.chatJob(':jobId')), ({ request, params }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const jobId = String(params.jobId);
    const job = chatJobs.get(jobId);
    const elapsed = job === undefined ? 0 : Date.now() - job.acceptedAt;

    if (job === undefined || elapsed > CHAT_JOB_RETENTION_MS) {
      /**
       * **없는 것·만료된 것·남의 것이 모두 같은 404 다** (AI 명세 §4.2 ·
       * `get_chat_job`). 코드는 `RESOURCE_NOT_FOUND` 로, 290 판이 지어낸
       * `CHAT_JOB_NOT_FOUND` 는 계약에 없는 이름이라 버렸다.
       *
       * **새로고침하면 이 목의 job 이 전부 사라지므로 여기로 온다.** 화면은
       * 조회 실패가 다섯 번 연속되면 기다림을 끝내고 재시도 가능한 실패로
       * 떨어뜨린다(`CHAT_JOB_POLL_FAILURE_LIMIT`) — 그 갈래를 눈으로 보는
       * 자리이기도 하다. 보존 기간이 지난 job 도 같은 자리로 합류한다.
       */
      return errorResponse(
        COMMON_ERROR_CODES.RESOURCE_NOT_FOUND,
        '요청을 찾을 수 없어요',
        404,
      );
    }

    const createdAt = toKstIsoString(new Date(job.acceptedAt));

    /**
     * 진행 중인 job. `result`·`error` 는 둘 다 `null` 이고 `completedAt` 도 아직
     * 없다 — **키를 빼지 않고 `null` 로 싣는다**(contracts C54).
     */
    if (elapsed < CHAT_JOB_DURATION_MS) {
      return HttpResponse.json(
        aiResponse(
          {
            jobId,
            status: elapsed < CHAT_JOB_QUEUED_MS ? 'queued' : 'running',
            conversationId: job.conversationId,
            createdAt,
            completedAt: null,
            result: null,
            error: null,
          },
          nextAiRequestId(),
          {},
          [],
        ),
      );
    }

    if (job.failure !== null) {
      // 생성 실패는 이력에 남지 않는다 (AI 명세 §4.1). `appendChatHistory` 를
      // 부르지 않는 것이 그 규칙의 전부다.
      return HttpResponse.json(
        aiResponse(
          {
            jobId,
            status: 'failed',
            conversationId: job.conversationId,
            createdAt,
            completedAt: nowKstIso(),
            result: null,
            error: job.failure,
          },
          nextAiRequestId(),
          {},
          [],
        ),
      );
    }

    if (!job.historyRecorded) {
      job.historyRecorded = true;
      /**
       * **`completed` 를 처음 관측한 때 이력에 적는다.** 그래야 "답을 기다리다
       * 나갔고 완료된 뒤에 돌아왔다" 는 경우에 이력 조회가 그 턴을 이미 들고
       * 있는 상태가 재현된다 — 프론트가 답을 두 번 그리지 않는지 확인하는
       * 자리가 그곳이다(`appendJobAnswer`).
       */
      appendChatHistory(job.conversationId, job.question, CHAT_ANSWER_TEXT);
    }

    /**
     * 완료. **`result` 는 동기 경로의 `content` 이고 그 답의 `citations`·
     * `dataAsOf` 는 봉투 최상위에 실린다**(`_job_envelope`). 290 판은 `result`
     * 안에 봉투를 통째로 넣었는데 그것이 이번에 고친 어긋남이다.
     */
    return HttpResponse.json(
      aiResponse(
        {
          jobId,
          status: 'completed',
          conversationId: job.conversationId,
          createdAt,
          completedAt: nowKstIso(),
          result: chatAnswerContent(job.conversationId),
          error: null,
        },
        nextAiRequestId(),
        { price: nowKstIso(), portfolio: nowKstIso() },
      ),
    );
  }),

  http.post(mockPath(API_PATHS.ai.diagnosis), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const requestId = nextAiRequestId();
    if (store.holdings.length === 0) {
      return insufficientData(requestId);
    }

    return HttpResponse.json(
      aiResponse(
        {
          riskLevel: 'moderate',
          /** 0~100 정수다. 비율이 아니다 */
          riskScore: 62,
          insufficientHistory: null,
          summary: section(
            '포트폴리오 진단',
            '반도체 두 종목이 전체의 62.4%를 차지해 집중도가 높아요. 최근 1년 최대 낙폭은 -22.14%였어요.',
            [
              textSegment('반도체 두 종목이 전체의 '),
              metricSegment('62.4%', 0.624, 'ratio', 'risk_engine', 'up'),
              textSegment('를 차지해 집중도가 높아요. 최근 1년 최대 낙폭은 '),
              metricSegment('-22.14%', -0.2214, 'ratio', 'risk_engine', 'down'),
              textSegment('였어요.'),
            ],
          ),
          findings: [
            {
              id: 'ticker_concentration',
              category: 'concentration',
              severity: 'high',
              title: '종목 집중도가 높아요',
              text: '가장 비중이 큰 종목 하나가 41.68%예요.',
              segments: [
                textSegment('가장 비중이 큰 종목 하나가 '),
                metricSegment('41.68%', 0.4168, 'ratio', 'risk_engine', 'up'),
                textSegment('예요.'),
              ],
              evidence: {
                tickers: ['005930', '000660'],
                metric: 'top1_weight',
                value: 0.4168,
                threshold: 0.3,
                hhi: 0.3421,
              },
            },
            {
              id: 'sector_concentration',
              category: 'concentration',
              severity: 'medium',
              title: '섹터가 한쪽에 쏠려 있어요',
              text: '반도체 섹터 비중이 62.4%예요.',
              segments: [
                textSegment('반도체 섹터 비중이 '),
                metricSegment('62.4%', 0.624, 'ratio', 'risk_engine', 'up'),
                textSegment('예요.'),
              ],
              evidence: { sector: '반도체', value: 0.624, threshold: 0.4 },
            },
          ],
          // 여기 비율은 전부 0~1 소수다. 등락률 계열이 아니다 (contracts C18 대비).
          indicators: {
            hhi: 0.3421,
            top1Weight: 0.4168,
            top3Weight: 0.9312,
            sectorHhi: 0.4102,
            annualizedVolatility: 0.2841,
            maxDrawdown1y: -0.2214,
            cashRatio: 0.3812,
            /** 배수다. 비율이 아니다 */
            beta: 1.14,
            largeCapWeight: 0.7421,
            /** 배수다. 비율이 아니다 */
            diversificationRatio: 1.08,
            rateSensitivity: 'moderate',
          },
        },
        requestId,
        { portfolio: nowKstIso(), price: nowKstIso() },
      ),
    );
  }),

  http.post(mockPath(API_PATHS.ai.attribution), async ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const body = await readJsonBody(request);
    const period = typeof body?.period === 'string' ? body.period : '1d';

    const requestId = nextAiRequestId();
    if (store.holdings.length === 0) {
      return insufficientData(requestId);
    }

    const summary = section(
      '수익률 원인',
      '이 기간 수익률은 +2.13%였고 그중 종목 선택이 +1.42%를 만들었어요. 카카오는 -0.31%로 발목을 잡았어요.',
      [
        textSegment('이 기간 수익률은 '),
        metricSegment('+2.13%', 0.0213, 'ratio', 'attribution_engine', 'up'),
        textSegment('였고 그중 종목 선택이 '),
        metricSegment('+1.42%', 0.0142, 'ratio', 'attribution_engine', 'up'),
        textSegment('를 만들었어요. 카카오는 '),
        metricSegment('-0.31%', -0.0031, 'ratio', 'attribution_engine', 'down'),
        textSegment('로 발목을 잡았어요.'),
      ],
    );

    return HttpResponse.json(
      aiResponse(
        {
          period,
          start: '2026-08-03',
          end: toKstDateString(new Date()),
          tradingDays: 21,
          // 0~1 소수다. 백엔드 changeRate 의 백분율과 계열이 다르다
          portfolioReturn: 0.0213,
          totalReturn: 0.0213,
          benchmarkReturn: 0.0089,
          excessReturn: 0.0124,
          breakdown: { market: 0.0089, sector: -0.0018, selection: 0.0142 },
          contributors: [
            {
              ticker: '000660',
              name: 'SK하이닉스',
              sector: '반도체',
              weight: 0.2214,
              return: 0.0912,
              contribution: 0.0202,
              heldAtStart: true,
              events: [
                {
                  citationId: 'cit_1',
                  type: 'earnings',
                  title: '2분기 영업이익 시장 기대치 상회',
                  summary: '2분기 영업이익 시장 기대치 상회',
                  eventDate: '2026-08-14',
                  matchedConfidence: 0.81,
                },
              ],
            },
          ],
          detractors: [
            {
              ticker: '035720',
              name: '카카오',
              sector: '인터넷',
              weight: 0.1102,
              return: -0.0281,
              contribution: -0.0031,
              heldAtStart: true,
              events: [],
            },
          ],
          sectors: [
            {
              sector: '반도체',
              portfolioWeight: 0.624,
              benchmarkWeight: 0.412,
              allocation: 0.0031,
              selection: 0.0111,
              proxy: false,
            },
            {
              sector: '인터넷',
              portfolioWeight: 0.1102,
              benchmarkWeight: 0.1841,
              allocation: -0.0018,
              selection: -0.0013,
              proxy: true,
            },
          ],
          notes: ['일부 섹터 벤치마크를 대체 지표로 채웠어요'],
          summary,
          // summary.text · summary.segments 와 같은 값이다. 프론트는 한쪽만 읽는다 (contracts C56)
          text: summary.text,
          segments: summary.segments,
        },
        requestId,
        { portfolio: nowKstIso(), price: nowKstIso(), news: nowKstIso() },
      ),
    );
  }),

  http.post(mockPath(API_PATHS.ai.orderPreview), async ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const body = await readJsonBody(request);
    const orders = Array.isArray(body?.orders) ? body.orders : [];

    const requestId = nextAiRequestId();

    if (orders.length === 0) {
      return errorResponse(
        AI_SERVICE_ERROR_CODES.INVALID_REQUEST,
        '점검할 주문이 없어요',
        400,
        { orders: '1건 이상이어야 합니다' },
      );
    }

    const orderSummary = orders.map((order) => {
      const row = order as {
        ticker?: unknown;
        side?: unknown;
        quantity?: unknown;
        price?: unknown;
      };
      const ticker = typeof row.ticker === 'string' ? row.ticker : '005930';
      const quantity = typeof row.quantity === 'number' ? row.quantity : 1;
      const price =
        typeof row.price === 'number'
          ? row.price
          : (findStock(ticker)?.currentPrice ?? 0);

      return {
        ticker,
        // side 는 소문자다. 백엔드 주문 API 의 BUY/SELL 과 값이 다르다 (AI 명세 §7)
        side: row.side === 'sell' ? 'sell' : 'buy',
        quantity,
        price,
        amount: price * quantity,
      };
    });

    const ordersValue = orderSummary.reduce((sum, row) => sum + row.amount, 0);
    const feasible = ordersValue <= store.cashBalance;

    return HttpResponse.json(
      aiResponse(
        {
          orderSummary,
          ordersValue,
          // 에러가 아니라 200 응답의 본문이다 (AI 명세 §7)
          feasible,
          shortfall: feasible ? null : ordersValue - store.cashBalance,
          before: {
            hhi: 0.3421,
            top1Weight: 0.4168,
            top3Weight: 0.9312,
            sectorHhi: 0.4102,
            annualizedVolatility: 0.2841,
            maxDrawdown1y: -0.2214,
            cashRatio: 0.3812,
            beta: 1.14,
            largeCapWeight: 0.7421,
            diversificationRatio: 1.08,
            rateSensitivity: 'moderate',
            topSectorWeight: 0.624,
          },
          after: {
            hhi: 0.3944,
            top1Weight: 0.4712,
            top3Weight: 0.9512,
            sectorHhi: 0.4581,
            annualizedVolatility: 0.3012,
            maxDrawdown1y: -0.2214,
            cashRatio: 0.2914,
            beta: 1.19,
            largeCapWeight: 0.7712,
            diversificationRatio: 1.02,
            rateSensitivity: 'moderate',
            topSectorWeight: 0.681,
          },
          // 숫자 지표만 담긴다. rateSensitivity 처럼 문자열인 지표는 키째로 빠진다 (AI 명세 §7)
          delta: {
            hhi: 0.0523,
            top1Weight: 0.0544,
            top3Weight: 0.02,
            sectorHhi: 0.0479,
            annualizedVolatility: 0.0171,
            cashRatio: -0.0898,
            beta: 0.05,
            largeCapWeight: 0.0291,
            diversificationRatio: -0.06,
            topSectorWeight: 0.057,
          },
          // text · segments 가 null 이다 — 프리셋 문장은 화면이 만든다 (GitLab #93,
          // AI 명세 §7). title·before·after·threshold 로 `formatOrderPreviewWarningLine`
          // 이 한 줄을 만든다.
          warnings: [
            {
              id: 'ticker_concentration',
              severity: 'high',
              title: '집중도가 더 올라가요',
              metric: 'top1_weight',
              before: 0.4168,
              after: 0.4712,
              threshold: 0.3,
              text: null,
              segments: null,
            },
          ],
          // 논지는 종목별 기록이다. **주문에 오른 종목의 논지만 낸다** (AI 명세 §7 —
          // "주문에 오른 종목의 `user_stated` 논지 중 어긋난 것만"). 어느 종목을
          // 주문해도 이 한 건이 나오면 다른 종목 주문에 근거 없는 참견이 붙고,
          // "배열이 비면 그 덩어리를 통째로 감춘다"(ia.md §4)는 갈래도 볼 수 없다.
          thesisConflicts: orderSummary.some(
            (row) => row.ticker === THESIS_RECORDED_TICKER,
          )
            ? [
                {
                  id: 'thesis_1',
                  ticker: THESIS_RECORDED_TICKER,
                  fact: '반도체 비중을 절반 아래로 줄이겠다고 적었어요',
                  source: 'user_stated',
                  recordedAt: '2026-08-27T21:12:00+09:00',
                  conflict: '이 주문은 반도체 비중을 68.1%로 올려요.',
                  segments: [
                    textSegment('이 주문은 반도체 비중을 '),
                    metricSegment('68.1%', 0.681, 'ratio', 'risk_engine', 'up'),
                    textSegment('로 올려요.'),
                  ],
                },
              ]
            : [],
          // 항상 null 이다 — 프리셋 헤드라인은 화면이 만든다 (GitLab #93, AI 명세 §7).
          summary: null,
        },
        requestId,
        { portfolio: nowKstIso(), price: nowKstIso() },
      ),
    );
  }),

  http.get(mockPath(API_PATHS.ai.briefing), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const requestId = nextAiRequestId();
    const today = toKstDateString(new Date());
    const date = searchParam(request, 'date') ?? today;

    // 오늘이 아닌 날짜는 비어 있다. status: 'empty' 는 오류가 아니라 영역을 숨기는 신호다
    if (date !== today) {
      return HttpResponse.json(
        aiResponse(
          { date, status: 'empty', generatedAt: nowKstIso(), items: [] },
          requestId,
          { portfolio: nowKstIso() },
        ),
      );
    }

    return HttpResponse.json(
      aiResponse(
        {
          date,
          status: 'ready',
          generatedAt: nowKstIso(),
          items: [
            {
              rank: 1,
              category: 'holding_move',
              /** 0~1 소수다 */
              relevanceScore: 0.94,
              title: 'SK하이닉스가 3.39% 올랐어요',
              text: '보유 중인 SK하이닉스가 어제보다 3.39% 올랐어요.',
              segments: [
                textSegment('보유 중인 SK하이닉스가 어제보다 '),
                metricSegment('3.39%', 0.0339, 'ratio', 'price', 'up'),
                textSegment(' 올랐어요.'),
              ],
              relatedTickers: ['000660'],
              deeplink: '/stocks/000660?tab=ai',
              // 최상위 citations(MOCK_CITATIONS)를 가리키는 ID 배열이다 — 객체가
              // 아니다 (GitLab 이슈 #86). cit_1 은 `aiResponse()` 가 봉투 최상위에
              // 함께 싣는다.
              citations: ['cit_1'],
              // 보유 등락이라 이벤트가 아니다 — 둘 다 null (AI 명세 §8, GitLab `#68`).
              // "값이 없으면 줄을 그리지 않는다" 갈래를 이 항목으로 재현한다.
              eventType: null,
              publisher: null,
            },
            {
              rank: 2,
              category: 'holding_move',
              relevanceScore: 0.71,
              title: '카카오는 보합이에요',
              text: '보유 중인 카카오는 어제와 같은 가격이에요.',
              segments: [
                textSegment('보유 중인 카카오는 어제와 같은 가격이에요.'),
              ],
              relatedTickers: ['035720'],
              deeplink: '/stocks/035720?tab=ai',
              citations: [],
              eventType: 'macro',
              publisher: '한국경제',
            },
            {
              rank: 3,
              category: 'earnings',
              relevanceScore: 0.58,
              title: '삼성전자가 1.21% 내렸어요',
              text: '보유 중인 삼성전자가 어제보다 1.21% 내렸어요.',
              segments: [
                textSegment('보유 중인 삼성전자가 어제보다 '),
                metricSegment('1.21%', -0.0121, 'ratio', 'price', 'down'),
                textSegment(' 내렸어요.'),
              ],
              relatedTickers: ['005930'],
              deeplink: '/stocks/005930?tab=ai',
              citations: ['cit_2'],
              eventType: 'earnings',
              publisher: '연합뉴스',
            },
          ],
        },
        requestId,
        { portfolio: nowKstIso(), price: nowKstIso() },
      ),
    );
  }),

  http.post(mockPath(API_PATHS.ai.feedback), async ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const body = await readJsonBody(request);
    const requestId = typeof body?.requestId === 'string' ? body.requestId : '';
    const rating = body?.rating;
    const reasons = body?.reasons;
    const comment = body?.comment;

    /*
     * 요청 키는 camelCase 다 — `request_id` 가 아니라 `requestId` 를 읽는다
     * (GitLab 이슈 #12 3번 회신 · contracts C75). AI 서버로 넘길 때의 snake_case 변환은
     * 백엔드 중계 레이어 몫이라 프론트·목 양쪽 다 camelCase 하나만 쓴다.
     */
    if (requestId === '') {
      return errorResponse(
        AI_SERVICE_ERROR_CODES.INVALID_REQUEST,
        '평가할 응답을 찾을 수 없어요',
        400,
        { requestId: '필수입니다' },
      );
    }

    if (rating !== 'up' && rating !== 'down') {
      return errorResponse(
        AI_SERVICE_ERROR_CODES.INVALID_REQUEST,
        '평가 값이 올바르지 않습니다',
        400,
        { rating: 'up 또는 down 이어야 합니다' },
      );
    }

    const normalizedReasons =
      reasons === undefined || reasons === null ? [] : reasons;
    if (
      !Array.isArray(normalizedReasons) ||
      normalizedReasons.some(
        (reason) =>
          typeof reason !== 'string' ||
          !AI_FEEDBACK_REASONS.includes(
            reason as (typeof AI_FEEDBACK_REASONS)[number],
          ),
      )
    ) {
      return errorResponse(
        AI_SERVICE_ERROR_CODES.INVALID_REQUEST,
        '평가 사유가 올바르지 않습니다',
        400,
        {
          reasons: `${AI_FEEDBACK_REASONS.join(' · ')} 중에서 고를 수 있습니다`,
        },
      );
    }

    if (
      typeof comment === 'string' &&
      comment.length > AI_FEEDBACK_COMMENT_MAX_LENGTH
    ) {
      return errorResponse(
        AI_SERVICE_ERROR_CODES.INVALID_REQUEST,
        '의견이 너무 깁니다',
        400,
        { comment: `${AI_FEEDBACK_COMMENT_MAX_LENGTH}자 이하여야 합니다` },
      );
    }

    /*
     * **같은 `requestId` 는 덮어쓴다** (contracts C66 · AI 명세 §10). 배열에 쌓지 않고
     * 맵에 넣는 것이 그 계약이다. 취소 API 가 없으므로 지우는 경로도 두지 않았다
     * (화면은 재전송으로 수정만 한다).
     */
    store.aiFeedback[requestId] = {
      requestId,
      rating,
      reasons: normalizedReasons as string[],
      comment: typeof comment === 'string' ? comment : null,
      submittedAt: nowKstIso(),
    };

    /*
     * 응답도 다른 여섯 종과 같은 재포장 형태다 (contracts C7). **`requestId` 는 평가 대상의
     * 값을 그대로 되돌려준다** — 접수 응답에 새 번호를 발급하면 화면이 어느 응답의
     * 영수증인지 대조할 수 없다.
     */
    return HttpResponse.json(aiResponse({ recorded: true }, requestId));
  }),
];
