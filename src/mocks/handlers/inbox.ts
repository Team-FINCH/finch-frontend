import { http, HttpResponse } from 'msw';

import { API_PATHS } from '@/shared/config/apiContract';

import { mockPath, readJsonBody } from '../lib/http';
import { requireAuth } from '../lib/session';

/**
 * 알림함 (FINCH-49).
 *
 * **경로·필드·상태 코드 전부 프론트 추정값이다. 백엔드 계약이 없다.**
 * GitLab 이슈 #26 1번으로 목록 조회(항목 종류·제목·요약·연결 대상·미읽음 여부·
 * 미읽음 개수)와 읽음·처리 표시를 물어 두고 회신 대기 중이다. 회신이 오면 이
 * 파일과 `frontend/src/features/inbox/model/types.ts` 를 계약 기준으로 다시 짠다.
 *
 * **상태 유지 범위** — 이 파일 안의 모듈 배열 하나다. 다른 도메인처럼
 * `mocks/lib/store.ts` 에 얹지 않았다 — 그 파일은 계약이 있는 도메인들이 공유하는
 * 자리라, 계약 자체가 없는 이 기능의 상태까지 섞으면 나중에 실제 계약이 왔을 때
 * 걷어낼 자리를 찾기 더 어려워진다.
 *
 * 항목 셋 — `record`(적어야 할 것, 매수 이유 기록) · `wiki`(확인해야 할 것, AI 추측
 * 확인) · `briefing`(읽을 것, 데일리 브리핑). PRD 정의 그대로다(ia.md §1 "알림함").
 */

interface MockInboxItem {
  itemId: string;
  kind: 'record' | 'wiki' | 'briefing';
  title: string;
  summary: string;
  unread: boolean;
  createdAt: string;
  stockCode: string | null;
  stockName: string | null;
}

const inboxItems: MockInboxItem[] = [
  {
    itemId: 'inbox_1',
    kind: 'record',
    title: 'SK하이닉스, 왜 담으셨나요?',
    summary:
      '체결 직후 이유를 적어 두면 AI가 이 기록을 근거로 더 맞는 추천을 해줘요.',
    unread: true,
    createdAt: '2026-09-06T09:31:00+09:00',
    stockCode: '000660',
    stockName: 'SK하이닉스',
  },
  {
    itemId: 'inbox_2',
    kind: 'wiki',
    title: '삼성전자, 실적 발표 전에 담으신 것으로 보여요',
    summary: 'FINCH가 이해한 투자 기준이에요. 맞는지 확인해 주세요.',
    unread: true,
    createdAt: '2026-09-05T18:04:00+09:00',
    stockCode: '005930',
    stockName: '삼성전자',
  },
  {
    itemId: 'inbox_3',
    kind: 'briefing',
    title: '어제의 브리핑을 놓치셨어요',
    summary: '오늘 확인할 소식 3건과 함께 다시 볼 수 있어요.',
    unread: false,
    createdAt: '2026-09-05T08:00:00+09:00',
    stockCode: null,
    stockName: null,
  },
];

export const inboxHandlers = [
  http.get(mockPath(API_PATHS.inbox.list), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    return HttpResponse.json({
      unreadCount: inboxItems.filter((item) => item.unread).length,
      items: inboxItems,
    });
  }),

  http.post(
    mockPath(API_PATHS.inbox.read(':itemId')),
    ({ request, params }) => {
      const unauthorized = requireAuth(request);
      if (unauthorized !== null) {
        return unauthorized;
      }

      const item = inboxItems.find((entry) => entry.itemId === params.itemId);
      if (item !== undefined) {
        item.unread = false;
      }

      return new HttpResponse(null, { status: 204 });
    },
  ),

  http.post(
    mockPath(API_PATHS.inbox.record(':itemId')),
    async ({ request, params }) => {
      const unauthorized = requireAuth(request);
      if (unauthorized !== null) {
        return unauthorized;
      }

      // 본문 검증은 하지 않는다 — 이 경로 자체가 지어낸 것이라 실패 갈래를
      // 계약처럼 굳히지 않는다. 값이 와도 어디에도 반영하지 않고 항목만 닫는다.
      await readJsonBody(request);

      const item = inboxItems.find((entry) => entry.itemId === params.itemId);
      if (item !== undefined) {
        item.unread = false;
      }

      return new HttpResponse(null, { status: 204 });
    },
  ),
];
