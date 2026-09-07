import { http, HttpResponse } from 'msw';

import { API_PATHS } from '@/shared/config/apiContract';
import {
  AI_SERVICE_ERROR_CODES,
  COMMON_ERROR_CODES,
} from '@/shared/types/errorCodes';

import { aiResponse, nextAiRequestId } from '../lib/ai';
import { errorResponse, mockPath, readJsonBody } from '../lib/http';
import { requireAuth } from '../lib/session';
import { store } from '../lib/store';
import { nowKstIso } from '../lib/time';

/**
 * AI 위키 3종 (contracts C80 · `shared/types/ai/wiki.ts`).
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
 * | `PUT /ai/wiki/theses/{stockCode}` `text` 없음·빈 문자열·500자 초과 | `400 INVALID_REQUEST` |
 * | `PUT /ai/wiki/theses/{stockCode}` 그 종목에 기록된 논지가 없음 | `404 INSTRUMENT_NOT_FOUND` — 화면이 편집을 여는 행 자체가 기존 논지라 실제로는 나지 않는다 |
 * | `PUT /ai/wiki/theses/{stockCode}` 정상 | `content`가 갱신된 논지 전체(TODO(계약) 재조회 방식이라 화면은 응답을 무시하고 `GET /wiki`를 다시 부른다, ia.md §1) |
 * | `DELETE /ai/wiki/facts/{factId}` 모르는 `factId` | `404 RESOURCE_NOT_FOUND` — 명세에 정의된 코드가 아니라 목이 고른 값이다(P6) |
 * | `DELETE /ai/wiki/facts/{factId}` 정상 | `content: {id, deletedAt}` |
 *
 * `POST /wiki/theses`(논지 최초 기록)는 AI 서비스가 대화에서 스스로 부르는 경로라
 * 목에도 없다 — 화면이 호출하지 않는다(ia.md §1).
 */
export const wikiHandlers = [
  http.get(mockPath(API_PATHS.ai.wiki.get), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    return HttpResponse.json(
      aiResponse(
        { profile: store.wiki.profile, theses: store.wiki.theses },
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

      return HttpResponse.json(aiResponse({ ...thesis }, requestId));
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

      return HttpResponse.json(
        aiResponse({ id: factId, deletedAt }, nextAiRequestId()),
      );
    },
  ),
];
