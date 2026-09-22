import { useEffect, useRef, useState } from 'react';

import { showToast } from '@/shared/hooks/useToastStore';
import {
  isInsufficientDataErrorCode,
  readAiErrorCode,
  readAiErrorMessage,
} from '@/shared/lib/aiErrorRetry';
import {
  formatKstMonthDay,
  formatKstMonthDayTime,
} from '@/shared/lib/formatDate';
import {
  AI_ANALYSIS_SECTION_KEYS,
  type AiAnalysisSection,
  type AiAnalysisSectionKey,
} from '@/shared/types/ai/analysis';
import { type AiCitation } from '@/shared/types/ai/envelope';
import { AiCard } from '@/shared/ui/AiCard';
import { AiFeedbackRow } from '@/shared/ui/AiFeedbackRow';
import { AiSegmentText } from '@/shared/ui/AiSegmentText';
import { AiStatus } from '@/shared/ui/AiStatus';
import { Skeleton } from '@/shared/ui/Skeleton';

import { useStockAnalysis } from '../api/useStockAnalysis';

import {
  AnalysisDetailList,
  type AnalysisDetailEntry,
} from './AnalysisDetailList';
import { AnalysisSourceSheet } from './AnalysisSourceSheet';

/**
 * AI 분석 탭 (프로토타입 `isDtAi` 블록, ia.md §4 슬롯 3번).
 *
 * ## 본문을 그린다 — 무엇을 근거로 어떻게
 *
 * 섹션 다섯(`current`·`changes`·`attention`·`risks`·`nextEvents`)의 키 구성이
 * `ai/docs/openapi.json` 으로 확정됐다(이슈 #15 닫힘, contracts C57~C59). 스키마와
 * 그 근거는 `shared/types/ai/analysis.ts` 에 있다.
 *
 * **개인화 섹션 `myImpact`·`thesisCheck` 는 뺐다**(GitLab 이슈 #92). AI 가 종목
 * 분석을 보유·논지에 무관한 종목 단위 정보로 바꾸면서 그 둘이 응답에서 아예
 * 빠진다 — 매 요청마다 LLM 을 태우고 Guardrail 에 자주 걸려 화면이 늦고 비어
 * 보였다. 나머지 다섯은 아침 배치가 미리 만들어 즉시 나온다.
 *
 * 지키는 규약 넷이다.
 * - **섹션 제목을 화면이 짓지 않고 응답의 `title` 을 그대로 쓴다**(ia.md:447).
 *   `title` 이 없으면 **제목을 그리지 않는다.** 키 이름을 한국어로
 *   옮겨 제목으로 쓰면 AI 가 제목을 바꿀 때 화면이 못 따라간다
 * - **`null` 섹션은 자리를 비운다**(ia.md:452). 접힌 카드도 "정보 없음" 박스도
 *   만들지 않는다
 * - **문장은 `text` 하나로 렌더된다.** `segments` 는 이어 붙이면 `text` 와 정확히
 *   일치하므로(C55) 둘 다 그리면 같은 문장이 두 번 나온다. 수치 강조가 필요할 때만
 *   `segments` 를 순회하고, 조각이 없으면 `text` 를 그대로 쓴다
 * - **표시 순서는 화면이 정한다** — 응답이 객체라 순서가 없다(ia.md §4).
 *   순서는 `AI_ANALYSIS_SECTION_KEYS` 한 곳에 있다
 *
 * ## 왜 검정 카드에 `current` 하나만 넣나
 *
 * design.md §8.3 `AIDetail` 이 **"상세 분석 전체를 하나의 Dark Card에 넣지 않는다"**
 * 와 "기본 Background 위 Flat Section" 을 못박았다. 프로토타입도 AI 탭 맨 위에
 * 검정 카드 하나를 두고 그 아래를 평면 섹션으로 쌓는다. `current` 가 그 자리인
 * 근거는 ia.md §4 가 이 섹션에 기획서의 차별점("현재 가격이 왜 비싸거나 싼지")을
 * 걸어 둔 것이다. `current` 가 없으면 검정 카드는 공통 AI 헤더(§8.4)와 기준 시각만
 * 담는다.
 *
 * **지표 표를 만들지 않는다**(ia.md §4 ★). PER·PBR 을 숫자로 나열하는 순간
 * 기획서가 피하려던 화면이 그대로 나온다. 숫자 강조는 `segments` 로만 한다.
 *
 * ## 그 아래는 이제 평면 섹션이 아니라 접히는 목록이다
 *
 * **검정 카드 아래를 `제목 + 문단` 평면 섹션으로 쌓던 것을 `자세히 보기` 목록으로
 * 접었다** (FINCH-332). §8.3 이 막은 것은 "상세 분석 전체를 하나의 Dark Card
 * 에 넣는 것" 이고 그 금지는 그대로다 — 상세는 여전히 기본 배경 위에 있고 검정
 * 면으로 들어가지 않았다. 바뀐 것은 **넷이 동시에 펼쳐져 있던 것**뿐이다.
 *
 * 평면 섹션 판의 문제는 위계가 아니라 밀도였다. 넷이 36px 간격으로 전부 펼쳐져
 * 있어서 375px 첫 화면에 결론과 다음 섹션의 첫 문단이 함께 들어왔고, 그래서 이 탭이
 * 무엇을 먼저 말하는 화면인지가 화면 자체로 읽히지 않았다. 접으면 순서가
 * `결론 → 훑기 → 고른 것만 읽기` 가 된다. 접는 규칙과 그 근거는
 * `AnalysisDetailList` 주석에 있다.
 *
 * ## 만들지 않은 것
 *
 * `cached`·`cachedAt` 은 항상 `false`/`null` 이라 **캐시 배지를 만들지 않는다.**
 * `nextEvents.events` 도 지금 항상 빈 배열이라(contracts C56) 전용 UI 를 만들지
 * 않았다 — 그 자리를 그리려면 목이 계약보다 관대해져야 한다. 값이 실제로 실려 오면
 * 스키마는 이미 받고 있으니 여기만 고친다.
 *
 * `thesisCheck` 가 `null` 일 때의 논지 입력 유도(`ThesisPromptBlock`)는 **뺐다**
 * (GitLab 이슈 #92). 개인화 섹션 제거로 `thesisCheck` 가 항상 `null` 이 되면서
 * 보유 종목마다 그 카드가 뜨게 됐었다 — 논지 기록 유도는 위키 화면과 채팅이 맡는다.
 *
 * ## 근거는 목록이 아니라 캡션 한 줄이고, 이제 한 탭 뒤에 있다
 *
 * design.md §9 "근거 표기" 가 "뱃지를 쓰지 않는다 … 종류를 나열만 하고 개별 출처로
 * 링크하지 않는다 … `AIDetail` 에서도 같다" 로 못박았고 프로토타입도 캡션 한 줄이다.
 * 그래서 이 화면은 `shared/ui/AiCitationList` 를 쓰지 않는다. `ia.md` §4 표의
 * "`type` 을 **뱃지로 구분한다**" 는 이 판정으로 뒤집혀 같은 MR 에서 캡션으로 고쳤다.
 * 포트폴리오 두 탭은 아직 뱃지 목록이라 `AiCitationList` 자체는 남겨 두었다.
 *
 * **모양은 그대로 두고 자리만 옮겼다** (FINCH-329, 2026-09-18 사용자 결정).
 * 근거·기준 시각·면책이 본문 맨 아래 캡션 두 줄로 상시 노출되던 것을
 * `AnalysisSourceSheet` 로 접었다 — 기준 시각만 진입 줄이 지고 나머지는 시트 안이다.
 *
 * **그 진입 줄이 다시 한 번 올라갔다** (FINCH-332, 2026-09-22 사용자 피드백).
 * 본문 맨 끝에서 결론 카드 바로 아래로 옮겼다 — 329 가 정한 것은 "한 탭 뒤로
 * 접는다" 였고 그 판단은 그대로다. 바뀐 것은 진입 줄의 높이뿐이다.
 * §9 가 "표기를 한 모양으로 통일할지는 미확정" 이라고 남겨 둔 쪽은 **이 티켓이
 * 건드리지 않는다.** 여기서 정한 것은 위치뿐이고, 두 문서(§9 · `ia.md` §4)의 위치
 * 서술을 같은 MR 에서 함께 고쳤다.
 *
 * ## 실패 자리
 *
 * 재시도 버튼을 낼지는 **코드가 정한다** — `AiStatus` 가 `isRetryableAiErrorCode` 로
 * 판정하므로 여기서 따로 고르지 않는다 (ia.md §4).
 * **실패·데이터 부족 자리에는 피드백을 붙이지 않는다** (design.md §10 · ia.md §4).
 * 보유 종목·근거가 없어 분석이 성립하지 않는 경우는 `409 INSUFFICIENT_DATA` 로
 * 오므로(contracts C12) 이 갈래가 아니라 위의 에러 갈래에서 걸린다.
 */
type StockAiTabProps = {
  stockCode: string;
  /**
   * 종목명 (`GET /stocks/{stockCode}` 의 `stockName`).
   *
   * **이 탭 안에서는 더 안 쓴다.** 채팅으로 논지 기록을 유도하던 `ThesisPromptBlock`
   * 이 이 값을 실어 보냈는데 그 블록을 뺐다(GitLab 이슈 #92). 타입에 남긴 이유는
   * `pages/StockDetailPage.tsx` 가 여전히 이 값을 넘기기 때문이다 — 그 파일은 이
   * 작업 범위 밖이다.
   */
  stockName: string;
  /** AI 탭이 열려 있을 때만 부른다 — 안 그러면 차트만 보는 사람에게 AI 요금이 나간다. */
  isActive: boolean;
  /**
   * 보유 중인가 (`GET /stocks/{stockCode}` 의 `holding !== null`).
   *
   * **이 탭 안에서는 더 안 쓴다.** 논지 없음 유도(`ThesisPromptBlock`)가 미보유와
   * 갈리려고 이 값을 받았는데 그 블록을 뺐다(GitLab 이슈 #92). 타입에 남긴 이유는
   * 위 `stockName` 과 같다.
   */
  owned: boolean;
};

/**
 * 검정 카드 안의 `current` 본문 (FINCH-329).
 *
 * ## 세 줄에서 끊는다
 *
 * `current.text` 전문이 그대로 들어가 모바일에서 네 줄을 차지했다. 위 헤드라인까지
 * 더하면 검정 덩어리가 첫 화면의 절반을 먹는데, §8.1 이 이 셸을 **Compact
 * Summary** 로 정하고 §12 가 "긴 문단 금지" 로 적어 둔 자리다.
 *
 * **마침표로 자르지 않는다.** 섹션 문장 수를 프론트가 고를 수 없어서 문장이 하나로
 * 오는 날 자리가 빈다. `line-clamp-3` 은 짧은 응답에는 아무 일도 하지 않는다.
 *
 * ## 넘칠 때만 `더 보기` 를 그린다
 *
 * 접힌 높이(`clientHeight`)와 전체 높이(`scrollHeight`)를 재서 실제로 잘렸을 때만
 * 버튼을 낸다. **늘 그리면 짧은 응답에서 눌러도 아무 일이 없는 버튼이 된다.**
 *
 * `ResizeObserver` 로 다시 재는 이유가 둘이다 — 본문 서체(Pretendard)가 늦게 붙어
 * 줄 수가 바뀌고, 가로 회전·창 크기 변화로도 바뀐다. 한 번만 재면 그 뒤로 어긋난
 * 채로 남는다.
 *
 * ## 시트로 보내지 않는다
 *
 * 펼침이 **그 자리에서** 일어난다. 이 문단은 이 탭의 첫 문장이라, 읽으려고 바닥
 * 시트를 열게 하면 가장 먼저 읽을 것을 가장 멀리 두는 것이 된다. 아래
 * `분석 기준 및 안내` 가 시트인 것과 반대의 판단이다 — 그쪽은 매번 읽는 글이 아니다.
 *
 * **`AiCard` 에 `onClick` 을 주면 안 된다.** 그 경우 셸이 `<button>` 으로 나가는데
 * 여기 버튼이 그 안에 들어가 중첩된다.
 */
function CurrentSummary({ section }: { section: AiAnalysisSection }) {
  const [expanded, setExpanded] = useState(false);
  const [clipped, setClipped] = useState(false);
  const bodyRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = bodyRef.current;
    if (expanded || element === null) {
      return;
    }

    // 1px 여유 — 서브픽셀 반올림으로 두 값이 1 미만 차이로 갈릴 때가 있다.
    const measure = () => {
      setClipped(element.scrollHeight > element.clientHeight + 1);
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [expanded, section.text]);

  return (
    <>
      <span
        ref={bodyRef}
        className={`mt-3 block text-body-2 leading-6 text-pretty text-ai-text-secondary ${
          expanded ? '' : 'line-clamp-3'
        }`}
      >
        <AiSegmentText segments={section.segments} text={section.text} onDark />
      </span>

      {(clipped || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-3 text-caption font-medium text-ai-text-secondary"
        >
          {expanded ? '접기' : '더 보기'}
        </button>
      )}
    </>
  );
}

/**
 * 근거 캡션에 나열할 종류 이름과 그 순서 (ia.md §4 `type` 7종 표).
 *
 * **뱃지 목록이 아니라 캡션 한 줄이다** — design.md §9 "근거 표기" 가 "뱃지를 쓰지
 * 않는다. 응답 블록 최하단에 캡션 한 줄로 종류만 나열한다 … `AIDetail` 에서도
 * 같다" 로 못박았고 프로토타입도 캡션이다(새 디코드 L1994). 그래서 이 화면은
 * `AiCitationList` 를 쓰지 않는다. 개별 출처 제목·발행처·링크를 그리지 않으므로
 * 남는 것은 종류 이름뿐이고, 순서는 응답의 `relevance` 가 아니라 이 배열이 정한다 —
 * 종류 나열의 순서가 응답마다 달라지면 같은 줄이 매번 다르게 읽힌다.
 *
 * 라벨은 ia.md §4 표를 그대로 쓴다. 프로토타입 목이 박아 둔 `공시 · 뉴스 · 자체계산`
 * 은 그 목 데이터의 종류 셋을 편 것이라 문자열을 박지 않고 응답에서 편다.
 */
const CITATION_TYPE_ORDER = [
  ['filing', '공시'],
  ['financial', '재무제표'],
  ['news', '뉴스'],
  ['price', '시세'],
  ['macro', '거시지표'],
  ['engine', '자체 계산'],
  ['wiki', '내 논지'],
] as const;

function citationTypeLabels(citations: readonly AiCitation[]): string[] {
  const present = new Set(citations.map((citation) => citation.type));
  return CITATION_TYPE_ORDER.filter(([type]) => present.has(type)).map(
    ([, label]) => label,
  );
}

/**
 * 섹션별 고정 캡션. 프로토타입이 `확인해볼 위험` 아래에만 한 줄 두었다
 * (새 디코드 L1946). 제목과 달리 이 문장은 응답에 없는 **시안 문구**라 화면이 갖는다.
 */
const SECTION_CAPTION: Partial<Record<AiAnalysisSectionKey, string>> = {
  risks: '공시와 실적에서 확인한 내용이에요.',
};

export function StockAiTab({ stockCode, isActive }: StockAiTabProps) {
  const analysis = useStockAnalysis(stockCode, isActive);

  if (analysis.isPending) {
    return (
      <div className="mt-6">
        <AiCard label="AI 종목 분석" headline="공시와 뉴스를 확인하고 있어요.">
          {/* AiCard 는 onClick 이 없으면 <section> 으로 나온다. Skeleton 이 <div> 라
              <span> 안에 넣으면 HTML 이 깨진다 — 그래서 여기만 div 로 감싼다. */}
          <div className="mt-4">
            <Skeleton className="mb-2.5 h-3.5 w-[92%]" />
            <Skeleton className="mb-2.5 h-3.5 w-[76%]" />
            <Skeleton className="h-3.5 w-[86%]" />
          </div>
        </AiCard>
      </div>
    );
  }

  if (analysis.isError) {
    const error = analysis.error;
    const code = readAiErrorCode(error);

    /*
     * **데이터 부족은 실패가 아니다** (contracts C12 · design.md L1237-1255).
     * `409 INSUFFICIENT_DATA` 는 정상적인 거절이라 프로토타입도 실패(`aiFail`)와
     * 다른 갈래(`aiShort`)로 두고 제목·문장을 따로 적는다 (새 디코드 L1906–L1911).
     * 전에는 실패 갈래로 흘려보내 제목이 `분석을 불러오지 못했어요` 로 나왔다.
     * 문구는 프로토타입 실측 그대로다 — 여기서 서버 `message` 를 쓰지 않는 이유는
     * 이 자리의 문장이 "왜 실패했나" 가 아니라 "무엇이 쌓이면 켜지나" 이기 때문이다.
     */
    if (isInsufficientDataErrorCode(code)) {
      return (
        <AiStatus
          code={code}
          title="아직 분석할 정보가 충분하지 않아요"
          description={
            <>
              공시와 뉴스가 조금 더 쌓이면
              <br />
              FINCH가 분석해드릴게요.
            </>
          }
        />
      );
    }

    // 문구는 서버가 완성해 준 message 를 쓴다 (컨벤션 §5). 화면이 다시 짓지 않는다.
    const message = readAiErrorMessage(error, '잠시 후 다시 시도해 주세요.');

    return (
      <AiStatus
        code={code}
        title="분석을 불러오지 못했어요"
        description={message}
        onRetry={() => {
          // 실패 화면이 분석 화면으로 통째로 갈리므로 "다시 불러왔다" 는 것은
          // 보이지만, 다시 실패해도 같은 화면이 그대로라 눌린 것인지 알 수 없다.
          // 그래서 성공했을 때만 알린다 (이슈 #54 회신).
          void analysis.refetch().then((result) => {
            if (result.isSuccess) {
              showToast('분석을 다시 불러왔어요.');
            }
          });
        }}
      />
    );
  }

  const { content, requestId, dataAsOf, citations, disclaimer } = analysis.data;

  /**
   * 기준 시각. AI 명세 §2.2 가 "UI 에 반드시 노출한다" 로 적었다 —
   * 시세는 지연될 수 있어 생성 시각과 따로 관리한다. 다섯 원천 중 읽지 않은 것은
   * 키가 빠지는 것이 아니라 `null` 이라(contracts C54) 값이 있는 것만 고른다.
   *
   * **어느 원천이 잡혔는지를 함께 들고 다닌다.** 값 하나만 넘기면 호출부가 그것을
   * 시:분까지 그릴지 날짜까지만 그릴지 정할 수 없다. `filings` 는 날짜 단위 값이라
   * `2026-08-20T15:00:00Z` 로 오고 KST 로 옮기면 자정이다 — 시:분을 붙이면 화면에
   * `00:00 기준` 이 떠서 값이 맞는데도 고장으로 읽힌다. `price` 는 장중에 갱신되는
   * 값이라 시:분이 의미를 갖는다. 그래서 포맷을 원천별로 가른다.
   */
  const asOf =
    dataAsOf.filings !== null
      ? { at: dataAsOf.filings, precision: 'day' as const }
      : dataAsOf.price !== null
        ? { at: dataAsOf.price, precision: 'minute' as const }
        : null;

  /**
   * 온 섹션만 표시 순서대로 고른다. **다섯이 전부 없을 수 있다** — 그때는 아래
   * 안내로 접는다. 요청에서 뺀 섹션은 키째로 빠지고(`exclude_unset`), 근거가
   * 모이지 않으면 값이 `null` 이라(C58) 둘을 함께 걸러야 한다.
   */
  const present = AI_ANALYSIS_SECTION_KEYS.flatMap((key) => {
    const section = content.sections[key] ?? null;
    return section === null ? [] : [{ key, section }];
  });

  const current = content.sections.current ?? null;
  /*
    결론(`current`)은 검정 카드가 지고 나머지는 `자세히 보기` 목록으로 간다.
    캡션은 응답에 없는 시안 문구라 여기서 붙여 넘긴다.
  */
  const detailEntries: AnalysisDetailEntry[] = present
    .filter((entry) => entry.key !== 'current')
    .map((entry) => ({
      key: entry.key,
      section: entry.section,
      caption: SECTION_CAPTION[entry.key],
    }));

  const sourceLabels = citationTypeLabels(citations);

  /*
    기준 시각 문구는 **여기서 완성해 넘긴다** (FINCH-329). 원천이 `filings` 면
    날짜까지, `price` 면 시:분까지라(위 `asOf` 주석) 포맷 판정이 이 파일에만 있어야
    진입 줄과 시트 안이 같은 형식으로 보인다.
  */
  const asOfText =
    asOf === null
      ? null
      : asOf.precision === 'day'
        ? formatKstMonthDay(asOf.at)
        : formatKstMonthDayTime(asOf.at);

  return (
    // 위 여백은 차트 탭과 같은 18px 이다 — `pages/StockDetailPage.tsx` 주석의
    // "탭 내용의 위 여백은 각 탭이 스스로 갖는다(프로토타입 18px)" 근거를
    // 이 탭도 따른다 (2026-09-17 사용자 결정). 전에 `mt-1`(4px)이었던 이유는
    // 남아 있지 않다. 아래 24px 은 프로토타입 실측이다 (새 디코드 L1994).
    <div className="mt-4.5 pb-6">
      <AiCard
        label="AI 종목 분석"
        headline={
          present.length === 0
            ? '분석 본문을 준비하고 있어요.'
            : (current?.title ?? undefined)
        }
      >
        {present.length === 0 ? (
          <span className="mt-3 block text-body-2 text-ai-text-secondary">
            이 종목의 분석 내용은 아직 연결되지 않았어요. 근거와 기준 시각은
            아래 안내에서 확인할 수 있어요.
          </span>
        ) : current === null ? null : (
          <CurrentSummary section={current} />
        )}
      </AiCard>

      {/*
        근거·기준 시각·면책은 **한 줄 뒤로 접힌다** (FINCH-329). 표기 모양은
        그대로 캡션 판이다 — 뱃지도 출처 줄 목록도 되살리지 않는다.

        **그 줄이 이제 본문 끝이 아니라 결론 카드 바로 아래다**
        (FINCH-332). 12px 만 띄워 카드에 붙인다 — 이 줄은 독립한 섹션이
        아니라 위 카드가 말한 결론이 언제 것인지를 밝히는 메타라, 섹션 간격
        36px 을 주면 남남으로 읽힌다. 사유는 `AnalysisSourceSheet` 주석에 있다.

        disclaimer 는 하드코딩하지 않고 응답 값을 그대로 쓴다 — 규제 문구가 바뀌면
        서버만 고치게 하기 위해서다 (envelope.ts 주석).
      */}
      <AnalysisSourceSheet
        className="mt-3"
        asOfText={asOfText}
        sourceLabels={sourceLabels}
        disclaimer={disclaimer}
      />

      {detailEntries.length > 0 && (
        <AnalysisDetailList entries={detailEntries} />
      )}

      {/*
        피드백은 **탭 하단 하나**다 (ia.md:474). 위로 올리지 않는다 — 읽기 전에
        평가를 묻는 꼴이 되고, `requestId` 하나 = 슬롯 하나 규칙이 걸린 자리다.

        위 여백만 20px → 32px 로 벌렸다 (FINCH-332). 목록의 마지막 줄은
        아래 구분선이 없고(`last:border-b-0`) 이 줄은 위 구분선이 있어서, 간격이
        좁으면 그 선이 목록의 다섯째 칸막이처럼 읽힌다. 벌리면 별개 블록이 된다.
        **`AiFeedbackRow` 자체는 고치지 않는다** — 채팅·수익률 분석과 공유하는
        `shared/ui` 라 여기서 크기를 키우면 세 곳이 같이 바뀐다.
      */}
      <AiFeedbackRow requestId={requestId} className="mt-8" />
    </div>
  );
}
