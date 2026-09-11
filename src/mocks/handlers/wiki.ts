import { http, HttpResponse } from 'msw';

import { API_PATHS } from '@/shared/config/apiContract';
import {
  AI_SERVICE_ERROR_CODES,
  COMMON_ERROR_CODES,
} from '@/shared/types/errorCodes';

import { aiResponse, nextAiRequestId } from '../lib/ai';
import { findStock } from '../lib/catalog';
import { errorResponse, mockPath, readJsonBody } from '../lib/http';
import { requireAuth } from '../lib/session';
import { findHolding, type MockWikiThesis, store } from '../lib/store';
import { nowKstIso } from '../lib/time';

/**
 * AI 위키 4종 (contracts C80 · `shared/types/ai/wiki.ts`).
 *
 * **이 파일이 새로 생기기 전까지 `handlers/index.ts`가 "목이 없는 경로"로 적어 둔
 * 자리다.** 경로 상수(`API_PATHS.ai.wiki`)와 함께 이번에 만들었다.
 *
 * **상태 유지 범위** — `store.wiki`가 모듈 변수다. 논지 수정·사실 삭제가 그 값을
 * 실제로 바꾸므로 포트폴리오 탭에서 바로 반영되는 것을 볼 수 있고, 새로고침하면
 * 초기 픽스처로 돌아간다.
 *
 * ## 어느 입력이 어느 응답을 내는가
 *
 * | 입력 | 응답 |
 * | --- | --- |
 * | `POST /ai/wiki/theses` `ticker` 없음·6자리가 아님 | `400 INVALID_REQUEST` |
 * | `POST /ai/wiki/theses` `text` 없음·빈 문자열·500자 초과 | `400 INVALID_REQUEST` |
 * | `POST /ai/wiki/theses` **이미 활성 논지가 있는 종목** | `200` — 실패가 아니다. 기존 논지를 `closed` 로 닫고 새 행을 만든다(교체) |
 * | `POST /ai/wiki/theses` 정상 | `content`가 새로 기록된 논지 전체 |
 * | `PUT /ai/wiki/theses/{stockCode}` `text` 없음·빈 문자열·500자 초과 | `400 INVALID_REQUEST` |
 * | `PUT /ai/wiki/theses/{stockCode}` 그 종목에 기록된 논지가 없음 | `404 INSTRUMENT_NOT_FOUND` — 화면이 편집을 여는 행 자체가 기존 논지라 실제로는 나지 않는다 |
 * | `PUT /ai/wiki/theses/{stockCode}` 정상 | `content`가 갱신된 논지 전체(TODO(계약) 재조회 방식이라 화면은 응답을 무시하고 `GET /wiki`를 다시 부른다, ia.md §1) |
 * | `DELETE /ai/wiki/facts/{factId}` 모르는 `factId` | `404 RESOURCE_NOT_FOUND` — 명세에 정의된 코드가 아니라 목이 고른 값이다(P6) |
 * | `DELETE /ai/wiki/facts/{factId}` 정상 | `content: {id, deletedAt}` |
 *
 * **`POST` 갈래는 2026-09-11 에 생겼다** (이슈 #56 · apiSpec v0.8.8 · contracts C97).
 * 그전까지 이 파일은 "AI 서비스가 대화에서 스스로 부르는 경로라 목에도 없다"고
 * 적고 있었다.
 *
 * **`POST` 는 멱등이 아니다.** 논지가 있는 종목에 보내도 `409` 가 아니라 `200` 이고,
 * 기존 논지가 `closed` 로 남은 채 활성 행이 하나 더 생긴다 — 김세민 님이 이슈 #42 에서
 * `record_thesis` 를 "교체" 라고 답했고 서버 구현(`ai/app/wiki/store.py`)도 그렇다.
 * **목이 이 경우를 막으면 화면이 `PUT`·`POST` 를 잘못 갈라도 티가 나지 않는다** —
 * 이력이 한 줄 늘어나는 것으로 드러나야 한다.
 */
/**
 * 논지에 종목 표시명을 붙인다 (openapi `WikiThesisOut.name`, MR !137).
 *
 * **실서버와 같은 폴백을 둔다** — AI 서버는 **원장에서** 이름을 찾고 없으면 티커를
 * 그 자리에 넣는다(`ai/app/api/routes/wiki.py` `_thesis_names`). 목이 항상 이름을
 * 찾아 주면 화면이 그 폴백을 만나 보지 못하고, 실제 배포에서 처음 깨진다.
 *
 * **그래서 종목 카탈로그가 아니라 보유 목록을 본다.** 카탈로그를 보면 상장된 종목은
 * 언제나 이름이 잡혀 폴백이 영영 일어나지 않는다 — 서버가 보는 것은 사용자의 원장이라
 * **매도로 청산한 종목은 이름을 잃는다.** 목에서도 전량 매도하면 그 종목의 논지가
 * `보유하지 않는 종목` 으로 바뀌는 것을 볼 수 있어야 한다(contracts C98).
 */
function withStockName(thesis: MockWikiThesis) {
  const held = findHolding(thesis.ticker);
  return {
    ...thesis,
    name:
      held === undefined
        ? thesis.ticker
        : (findStock(thesis.ticker)?.stockName ?? thesis.ticker),
  };
}

export const wikiHandlers = [
  http.post(mockPath(API_PATHS.ai.wiki.createThesis), async ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const requestId = nextAiRequestId();
    const body = await readJsonBody(request);
    const ticker = typeof body?.ticker === 'string' ? body.ticker : '';
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const horizon =
      typeof body?.horizon === 'string' ? body.horizon : undefined;
    const linkedTradeId =
      typeof body?.linkedTradeId === 'string' ? body.linkedTradeId : null;

    /*
      경로에 종목이 없으니 `ticker` 가 빠지면 어느 종목인지 알 길이 없다.
      서버 쪽 `ThesisIn.ticker` 가 `min_length=6, max_length=6` 이라 길이도 본다.
    */
    if (ticker.length !== 6) {
      return errorResponse(
        AI_SERVICE_ERROR_CODES.INVALID_REQUEST,
        '종목을 확인해 주세요',
        400,
        { ticker: '6자리 종목코드여야 합니다' },
      );
    }

    if (text === '' || text.length > 500) {
      return errorResponse(
        AI_SERVICE_ERROR_CODES.INVALID_REQUEST,
        '기록 내용을 확인해 주세요',
        400,
        { text: '1자 이상 500자 이하여야 합니다' },
      );
    }

    /*
      이미 활성 논지가 있으면 닫고 새로 남긴다 — 실패시키지 않는다
      (`ai/app/wiki/store.py` `record_thesis`, apiSpec §10.1 "교체").
      활성이 둘이 되지 않는 것이 이 목이 지켜야 할 불변식이다.
    */
    for (const entry of store.wiki.theses) {
      if (entry.ticker === ticker && entry.status === 'active') {
        entry.status = 'closed';
      }
    }

    const created: MockWikiThesis = {
      id: `thesis_${String(store.wiki.theses.length + 1)}`,
      ticker,
      text,
      // 사용자가 직접 적은 것이라 `user_stated` 다 (AI 명세 §9).
      source: 'user_stated',
      status: 'active',
      recordedAt: nowKstIso(),
      horizon:
        horizon === 'short' || horizon === 'mid' || horizon === 'long'
          ? horizon
          : null,
      linkedTradeId,
    };
    store.wiki.theses.push(created);

    return HttpResponse.json(aiResponse(withStockName(created), requestId));
  }),

  http.get(mockPath(API_PATHS.ai.wiki.get), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    return HttpResponse.json(
      aiResponse(
        {
          profile: store.wiki.profile,
          theses: store.wiki.theses.map(withStockName),
        },
        nextAiRequestId(),
      ),
    );
  }),

  http.put(
    mockPath(API_PATHS.ai.wiki.updateThesis(':stockCode')),
    async ({ request, params }) => {
      const unauthorized = requireAuth(request);
      if (unauthorized !== null) {
        return unauthorized;
      }

      const requestId = nextAiRequestId();
      const stockCode = String(params.stockCode);
      const body = await readJsonBody(request);
      const text = typeof body?.text === 'string' ? body.text.trim() : '';
      const horizon =
        typeof body?.horizon === 'string' ? body.horizon : undefined;

      if (text === '' || text.length > 500) {
        return errorResponse(
          AI_SERVICE_ERROR_CODES.INVALID_REQUEST,
          '기록 내용을 확인해 주세요',
          400,
          { text: '1자 이상 500자 이하여야 합니다' },
        );
      }

      const thesis = store.wiki.theses.find(
        (entry) => entry.ticker === stockCode && entry.status === 'active',
      );
      if (thesis === undefined) {
        return errorResponse(
          AI_SERVICE_ERROR_CODES.INSTRUMENT_NOT_FOUND,
          '수정할 매수 이유를 찾을 수 없어요',
          404,
        );
      }

      thesis.text = text;
      // 사용자가 직접 고치면 source 가 user_stated 로 바뀐다 (AI 명세 §9, ia.md §1).
      thesis.source = 'user_stated';
      thesis.recordedAt = nowKstIso();
      if (horizon === 'short' || horizon === 'mid' || horizon === 'long') {
        thesis.horizon = horizon;
      }

      return HttpResponse.json(aiResponse(withStockName(thesis), requestId));
    },
  ),

  http.delete(
    mockPath(API_PATHS.ai.wiki.deleteFact(':factId')),
    ({ request, params }) => {
      const unauthorized = requireAuth(request);
      if (unauthorized !== null) {
        return unauthorized;
      }

      const factId = String(params.factId);
      const fact = store.wiki.profile.find((entry) => entry.id === factId);
      if (fact === undefined) {
        return errorResponse(
          COMMON_ERROR_CODES.RESOURCE_NOT_FOUND,
          '삭제할 기록을 찾을 수 없어요',
          404,
        );
      }

      store.wiki.profile = store.wiki.profile.filter(
        (entry) => entry.id !== factId,
      );
      const deletedAt = nowKstIso();
      /*
       * `reason` 은 선택 파라미터이고 기본은 `user_deleted` 다 (openapi
       * `DeleteReason`, MR !140). 열거값 밖은 400 이 맞지만 이 목은 화면이
       * 항상 둘 중 하나를 싣는 것을 전제로 기본값으로만 접는다.
       */
      const reasonParam = new URL(request.url).searchParams.get('reason');
      const reason =
        reasonParam === 'guess_rejected' ? 'guess_rejected' : 'user_deleted';

      return HttpResponse.json(
        aiResponse({ id: factId, deletedAt, reason }, nextAiRequestId()),
      );
    },
  ),
];
