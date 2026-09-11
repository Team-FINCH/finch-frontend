import { http, HttpResponse } from 'msw';

import { API_PATHS } from '@/shared/config/apiContract';

import { findStock } from '../lib/catalog';
import { mockPath } from '../lib/http';
import { requireAuth } from '../lib/session';
import { store } from '../lib/store';

/**
 * 알림함 (FINCH-49 · FINCH-240, apiSpec §6.4 v0.8.9, 이슈 #57).
 *
 * **계약 기준으로 다시 썼다.** 이전 판은 계약이 없어 경로·필드·상태 코드를 전부
 * 프론트가 지어냈고 `POST /inbox/{itemId}/record` 라는 없는 저장 경로까지 갖고
 * 있었다. 매수 이유 저장은 `POST /ai/wiki/theses` 하나이고 알림함 전용 저장 경로는
 * 없다(§6.4) — 그 갈래는 `handlers/wiki.ts` 가 맡는다.
 *
 * ## `record` 항목을 고정 배열로 두지 않는다
 *
 * 계약이 `record` 를 **저장된 알림이 아니라 조회할 때마다 계산하는 값**으로 못박았다 —
 * 보유 수량이 0 보다 큰 종목 가운데 **`active` 논지가 없는 종목**에 하나씩이고, 논지가
 * 생기면 다음 조회부터 빠진다. 그래서 이 목도 `store.holdings` 와 `store.wiki.theses`
 * 를 매 요청마다 대조해서 만든다. 고정 배열로 두면 **시트에서 저장한 뒤 항목이 사라지는
 * 것을 확인할 길이 없다** — 이 목이 실제로 확인해 주어야 하는 것이 그 흐름이다.
 *
 * 초기 픽스처에서는 보유 셋(`005930`·`000660`·`035720`) 가운데 앞의 둘에 활성 논지가
 * 있어 `035720` 하나만 뜬다. 그 시트에서 저장하면 `store.wiki.theses` 에 활성 논지가
 * 생겨 다음 `GET /inbox` 에서 빠진다.
 *
 * ## `wiki`·`news` 는 실제로는 오지 않는다
 *
 * AI 추측 생성기가 없고(이슈 #52) 종목별 소식의 원천도 정해지지 않아 서버는 지금
 * `record` 만 내보낸다. **그래도 목에는 둘을 넣어 둔다** — 화면이 종류별로 다른 곳
 * (`wiki` → 포트폴리오 위키 탭, `news` → 그 종목 상세 AI 탭)으로 보내는데, 원천이
 * 붙는 날까지 그 갈래를 확인할 길이 이것뿐이다.
 *
 * **`wiki` 는 그래도 계산해서 만든다** — 확인이 필요한 추측이 남아 있을 때만 뜬다
 * (`buildWikiItems`). 위키 탭에서 마지막 추측에 답하면 이 항목이 사라지는 것을
 * 목으로 확인할 수 있어야 한다.
 *
 * **상태 유지 범위** — 읽음 표시만 이 파일의 모듈 `Set` 에 남는다. 새로고침하면
 * 전부 미읽음으로 돌아간다.
 */

/**
 * 종목별 마지막 매수 체결 id. 계약의 `tradeId` 는 §7.1 `orderId` 와 같은 값인데,
 * 목 원장(`store.transactions`)은 `transactionId` 만 갖고 있어 그 둘을 잇는 값이 없다.
 * 화면이 쓰는 것은 "숫자를 문자열로 바꿔 `linkedTradeId` 에 넣는다" 뿐이라 픽스처 값을
 * 고정해 둔다. 표에 없는 종목은 보유 수량으로 만든 자리값이 들어간다.
 */
const LAST_BUY_TRADE_ID: Record<string, number> = {
  '005930': 91,
  '000660': 94,
  '035720': 98,
};

/** 종목별 마지막 매수 체결 시각. `record` 항목의 `createdAt` 이 이 값이다. */
const LAST_BUY_AT: Record<string, string> = {
  '005930': '2026-09-02T10:12:00+09:00',
  '000660': '2026-09-04T13:22:00+09:00',
  '035720': '2026-09-11T09:31:00+09:00',
};

interface MockInboxItem {
  itemId: string;
  kind: 'record' | 'wiki' | 'news';
  title: string;
  summary: string;
  unread: boolean;
  createdAt: string;
  stockCode: string | null;
  stockName: string | null;
  tradeId: number | null;
}

/** 읽음 표시된 `itemId`. 계약상 읽음은 뱃지를 끄는 것뿐이고 항목을 없애지 않는다. */
const readItemIds = new Set<string>();

/**
 * 확인이 필요한 추측이 남아 있을 때만 뜨는 항목. `tradeId` 는 `record` 만 값이 있다.
 */
const WIKI_ITEM: Omit<MockInboxItem, 'unread'> = {
  itemId: 'wiki-005930-3',
  kind: 'wiki',
  title: '삼성전자, 실적 발표 전에 담으신 것으로 보여요',
  summary: 'FINCH가 이해한 투자 기준이에요. 맞는지 확인해 주세요.',
  createdAt: '2026-09-10T18:04:00+09:00',
  stockCode: '005930',
  stockName: '삼성전자',
  tradeId: null,
};

/**
 * 서버가 아직 내보내지 않는 종류. 위 머리 주석의 "실제로는 오지 않는다" 를 본다.
 */
const STATIC_ITEMS: Omit<MockInboxItem, 'unread'>[] = [
  {
    itemId: 'news-000660-7',
    kind: 'news',
    title: 'SK하이닉스, HBM 증설 계획을 발표했어요',
    summary: '담고 계신 종목의 소식이에요. 분석과 함께 확인해 보세요.',
    createdAt: '2026-09-09T08:00:00+09:00',
    stockCode: '000660',
    stockName: 'SK하이닉스',
    tradeId: null,
  },
];

/**
 * `wiki` 항목은 **확인이 필요한 추측이 하나라도 남아 있을 때만** 만든다
 * (FINCH-246). `record` 를 고정 배열로 두지 않는 것과 같은 이유다 —
 * 위키 탭에서 마지막 추측에 `맞아요`·`아니에요` 로 답하고 나면 확인할 것이 없는데,
 * 고정 배열이면 알림함에 "확인해 주세요" 가 그대로 남아 **답한 것이 반영됐는지
 * 확인할 길이 없다.** 프로토타입도 승격 시 `mail` 에서 `type==="wiki"` 를 걷는다.
 *
 * 항목 자체는 하나뿐이라 종목·문구가 `store.wiki.profile` 의 어느 추측과 이어지지
 * 않는다. 서버가 추측 생성기를 갖게 되면(이슈 #52) 그때 실제 추측에서 만든다.
 */
function buildWikiItems(): Omit<MockInboxItem, 'unread'>[] {
  const hasGuess = store.wiki.profile.some(
    (fact) => fact.source === 'ai_inferred',
  );
  return hasGuess ? [WIKI_ITEM] : [];
}

/** 보유 종목과 활성 논지를 대조해 `record` 항목을 만든다 (§6.4 "`record` 규칙"). */
function buildRecordItems(): Omit<MockInboxItem, 'unread'>[] {
  return store.holdings
    .filter((holding) => holding.quantity > 0)
    .filter(
      (holding) =>
        !store.wiki.theses.some(
          (thesis) =>
            thesis.ticker === holding.stockCode && thesis.status === 'active',
        ),
    )
    .map((holding) => {
      const tradeId =
        LAST_BUY_TRADE_ID[holding.stockCode] ?? holding.quantity + 100;
      const stockName =
        findStock(holding.stockCode)?.stockName ?? holding.stockCode;
      return {
        itemId: `record-${holding.stockCode}-${String(tradeId)}`,
        kind: 'record' as const,
        title: `${stockName}, 왜 담으셨나요?`,
        summary:
          '체결 직후 이유를 적어 두면 AI가 이 기록을 근거로 더 맞는 추천을 해줘요.',
        createdAt:
          LAST_BUY_AT[holding.stockCode] ?? '2026-09-11T09:31:00+09:00',
        stockCode: holding.stockCode,
        stockName,
        tradeId,
      };
    });
}

export const inboxHandlers = [
  http.get(mockPath(API_PATHS.inbox.list), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const items: MockInboxItem[] = [
      ...buildRecordItems(),
      ...buildWikiItems(),
      ...STATIC_ITEMS,
    ]
      .map((item) => ({ ...item, unread: !readItemIds.has(item.itemId) }))
      // 정렬은 서버가 해서 준다 — `createdAt` 내림차순이다.
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return HttpResponse.json({
      unreadCount: items.filter((item) => item.unread).length,
      items,
    });
  }),

  http.post(
    mockPath(API_PATHS.inbox.read(':itemId')),
    ({ request, params }) => {
      const unauthorized = requireAuth(request);
      if (unauthorized !== null) {
        return unauthorized;
      }

      /*
        멱등이다 — 이미 읽은 항목도, 목록에 없는 항목도, 논지가 생겨 빠진 지난
        항목도 전부 `204` 다(§6.4). 존재 여부를 보지 않는 이유가 그것이다.
      */
      if (typeof params.itemId === 'string') {
        readItemIds.add(params.itemId);
      }

      return new HttpResponse(null, { status: 204 });
    },
  ),
];
