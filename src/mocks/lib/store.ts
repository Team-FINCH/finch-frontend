import {
  INITIAL_CASH_BALANCE,
  RECENT_SEARCH_KEYWORDS_MAX_COUNT,
  RECENT_STOCKS_MAX_COUNT,
} from '@/shared/config/apiContract';

import { nowKstIso } from './time';

/**
 * 목 서버의 가변 상태.
 *
 * **상태 유지 범위 — 모듈 변수다. 새로고침하면 아래 초기값으로 돌아간다.**
 * 주문·충전·관심 종목 추가·삭제·최근 본 종목·최근 검색어·AI 피드백은 한 세션 안에서만 이어진다.
 * 새로고침을 견뎌야 하는 것은 인증 쿠키 하나뿐이라(`lib/session.ts`) 나머지를
 * `localStorage` 로 빼지 않았다. 목 데이터가 브라우저에 눌어붙으면 초기 상태를
 * 다시 보려고 저장소를 뒤지게 된다.
 *
 * 금액·수량은 전부 원 단위 정수다.
 */

export interface MockHolding {
  stockCode: string;
  quantity: number;
  avgBuyPrice: number;
}

export interface MockTransaction {
  transactionId: number;
  /**
   * `WITHDRAWAL` 은 apiSpec v0.8 에서 추가됐다(contracts C87 · FINCH-138).
   * 출금 원장에는 결제 수단이 없어 `paymentMethod` 가 항상 `null` 이다.
   */
  type: 'INITIAL_GRANT' | 'DEPOSIT' | 'WITHDRAWAL' | 'BUY' | 'SELL';
  occurredAt: string;
  stockCode: string | null;
  stockName: string | null;
  price: number | null;
  quantity: number | null;
  amount: number;
  realizedProfit: number | null;
  /** 백분율 */
  realizedProfitRate: number | null;
  /** "가상 카드/가상 계좌이체"에서 **카카오페이/계좌이체**로 바뀌었다 (ia.md §1, 충전 4단계 개편). */
  paymentMethod: 'KAKAOPAY' | 'TRANSFER' | null;
}

/**
 * 위키 사실 · 논지 (AI 명세 §9, `shared/types/ai/wiki.ts`).
 * `store.wiki`가 처음부터 비어 있지 않은 이유 — 포트폴리오 탭 화면을 만드는 시점에
 * 빈 상태만 볼 수 있으면 확정·확인 필요·매수 이유 세 섹션을 눈으로 확인할 방법이
 * 없다. 실제 계정은 apiSpec v0.7.2부터 위키도 빈 채로 시작한다(ia.md §1 "빈 상태").
 */
export interface MockWikiFact {
  id: string;
  text: string;
  source: 'user_stated' | 'derived_from_trades' | 'ai_inferred';
  confidence: 'low' | 'medium' | 'high';
  asOf: string;
  evidence: Record<string, unknown>;
  editable: boolean;
}

export interface MockWikiThesis {
  id: string;
  ticker: string;
  text: string;
  source: 'user_stated' | 'derived_from_trades' | 'ai_inferred';
  status: 'active' | 'closed';
  recordedAt: string;
  horizon: 'short' | 'mid' | 'long' | null;
  linkedTradeId: string | null;
}

export interface MockWatchlistEntry {
  stockCode: string;
  registeredAt: string;
}

export interface MockRecentStock {
  stockCode: string;
  viewedAt: string;
}

/**
 * 최근 검색어 한 건 (apiSpec §6.2). **최근 본 종목과 달리 종목코드가 아니라 문자열이다** —
 * 종목코드로 검색해도 문자열로 저장한다. `keywordId` 는 서버 테이블의 PK 를 대신하는 값이라
 * 한 번 쓴 번호를 삭제·재검색 뒤에 다시 쓰지 않는다.
 */
export interface MockRecentSearchKeyword {
  keywordId: number;
  keyword: string;
  searchedAt: string;
}

/**
 * `POST /ai/feedback` 이 접수한 평가 한 건 (AI 명세 §10).
 *
 * **`requestId` 를 키로 덮어쓴다** (contracts C66). 목이 배열이 아니라 맵을 쓰는 이유가
 * 이것이다 — 배열로 쌓으면 누적되지 않는다는 계약을 목이 어긴다. 취소 API 가 없어
 * 지우는 경로도 두지 않았다.
 */
export interface MockAiFeedback {
  requestId: string;
  rating: 'up' | 'down';
  reasons: string[];
  comment: string | null;
  submittedAt: string;
}

interface MockStore {
  cashBalance: number;
  /** 계정 전체 누적 충전액. 되돌릴 경로가 없다 (apiSpec §4.1) */
  depositedAmount: number;
  holdings: MockHolding[];
  watchlist: MockWatchlistEntry[];
  recentStocks: MockRecentStock[];
  /** 최신순이다. `GET /stocks/search/recent` 는 이 순서를 그대로 쓴다 */
  recentSearchKeywords: MockRecentSearchKeyword[];
  nextSearchKeywordId: number;
  /** `requestId` → 마지막 평가. 누적하지 않고 덮어쓴다 (contracts C66) */
  aiFeedback: Record<string, MockAiFeedback>;
  /** 최신순이다. `GET /transactions` 는 이 순서를 그대로 쓴다 */
  transactions: MockTransaction[];
  nextTransactionId: number;
  nextOrderId: number;
  /** 충전 `paymentId`(56, 57, ...) 발급용. 서버가 DB 채번한 숫자다 (`mocks/handlers/deposit.ts`). */
  nextPaymentId: number;
  /** 출금 `withdrawalId` 발급용 (`mocks/handlers/deposit.ts`). */
  nextWithdrawalId: number;
  wiki: { profile: MockWikiFact[]; theses: MockWikiThesis[] };
}

export const store: MockStore = {
  cashBalance: 1_250_000,
  depositedAmount: 3_000_000,
  holdings: [
    { stockCode: '005930', quantity: 10, avgBuyPrice: 71_200 },
    { stockCode: '000660', quantity: 3, avgBuyPrice: 180_000 },
    { stockCode: '035720', quantity: 20, avgBuyPrice: 45_000 },
  ],
  watchlist: [
    { stockCode: '005930', registeredAt: '2026-08-26T09:12:00+09:00' },
    { stockCode: '000660', registeredAt: '2026-08-27T10:41:00+09:00' },
    { stockCode: '247540', registeredAt: '2026-08-31T13:05:00+09:00' },
    // 시세 없음(quoteState: 'missing') 픽스처. 관심 목록에서 이 상태가 화면에
    // 재현되는 유일한 자리다 (FINCH-265).
    { stockCode: '900140', registeredAt: '2026-09-02T09:30:00+09:00' },
  ],
  recentStocks: [
    { stockCode: '000660', viewedAt: '2026-09-01T15:02:00+09:00' },
    { stockCode: '005930', viewedAt: '2026-09-01T14:48:00+09:00' },
    { stockCode: '068270', viewedAt: '2026-08-31T11:20:00+09:00' },
  ],
  recentSearchKeywords: [
    { keywordId: 42, keyword: '삼성', searchedAt: '2026-09-01T15:01:00+09:00' },
    {
      keywordId: 41,
      keyword: '하이닉스',
      searchedAt: '2026-09-01T14:40:00+09:00',
    },
    {
      keywordId: 40,
      keyword: '005930',
      searchedAt: '2026-08-31T11:18:00+09:00',
    },
  ],
  nextSearchKeywordId: 43,
  aiFeedback: {},
  transactions: [
    {
      transactionId: 306,
      type: 'WITHDRAWAL',
      occurredAt: '2026-09-02T11:05:44+09:00',
      stockCode: null,
      stockName: null,
      price: null,
      quantity: null,
      amount: 200_000,
      realizedProfit: null,
      realizedProfitRate: null,
      // 출금은 수단을 받지 않는다 (contracts C86·C87).
      paymentMethod: null,
    },
    {
      transactionId: 305,
      type: 'SELL',
      occurredAt: '2026-09-01T13:22:10+09:00',
      stockCode: '068270',
      stockName: '셀트리온',
      price: 178_400,
      quantity: 2,
      amount: 356_800,
      realizedProfit: -11_600,
      realizedProfitRate: -3.15,
      paymentMethod: null,
    },
    {
      transactionId: 304,
      type: 'BUY',
      occurredAt: '2026-08-31T10:04:41+09:00',
      stockCode: '035720',
      stockName: '카카오',
      price: 45_000,
      quantity: 20,
      amount: 900_000,
      realizedProfit: null,
      realizedProfitRate: null,
      paymentMethod: null,
    },
    {
      transactionId: 303,
      type: 'BUY',
      occurredAt: '2026-08-28T09:41:02+09:00',
      stockCode: '000660',
      stockName: 'SK하이닉스',
      price: 180_000,
      quantity: 3,
      amount: 540_000,
      realizedProfit: null,
      realizedProfitRate: null,
      paymentMethod: null,
    },
    {
      transactionId: 302,
      type: 'BUY',
      occurredAt: '2026-08-27T11:15:33+09:00',
      stockCode: '005930',
      stockName: '삼성전자',
      price: 71_200,
      quantity: 10,
      amount: 712_000,
      realizedProfit: null,
      realizedProfitRate: null,
      paymentMethod: null,
    },
    {
      transactionId: 301,
      type: 'DEPOSIT',
      occurredAt: '2026-08-26T14:31:02+09:00',
      stockCode: null,
      stockName: null,
      price: null,
      quantity: null,
      amount: 3_000_000,
      realizedProfit: null,
      realizedProfitRate: null,
      paymentMethod: 'KAKAOPAY',
    },
    {
      transactionId: 300,
      type: 'INITIAL_GRANT',
      occurredAt: '2026-08-25T10:00:00+09:00',
      stockCode: null,
      stockName: null,
      price: null,
      quantity: null,
      amount: INITIAL_CASH_BALANCE,
      realizedProfit: null,
      realizedProfitRate: null,
      paymentMethod: null,
    },
  ],
  nextTransactionId: 307,
  nextOrderId: 101,
  nextPaymentId: 56,
  nextWithdrawalId: 1,
  wiki: {
    /*
      프로토타입 `facts` 픽스처 다섯 줄을 그대로 옮겼다 (proto `facts:[{id:1..5}]`).
      확정 둘(user_stated·derived_from_trades)에 추측 셋이다.

      **추측을 하나만 두면 캐러셀이 캐러셀로 보이지 않는다.** `WikiGuessCarousel`
      은 원래부터 좌우 네비·점 네비·겹친 카드를 갖고 있는데 목에 추측이 하나뿐이라
      그 장치가 전부 접혀 있었다(`facts.length > 1` 분기). 셋이면 겹친 카드 둘까지
      나온다.

      **문구는 프로토타입이 정본이다** — 줄바꿈 위치까지 그대로 옮긴다. 카드가
      `whitespace-pre-line` 으로 그리므로 `\n` 이 실제 줄바꿈이 된다.
    */
    profile: [
      {
        id: 'fact_1',
        text: '배당보다 성장성을 더 중요하게 봐요.',
        source: 'user_stated',
        confidence: 'high',
        asOf: '2026-08-14T10:00:00+09:00',
        evidence: { type: 'conversation', ref: 'conv_01JQZ3M1' },
        editable: true,
      },
      {
        id: 'fact_2',
        text: '반도체 업종에 관심이 높은 편이에요.',
        source: 'derived_from_trades',
        confidence: 'high',
        asOf: '2026-08-26T09:30:00+09:00',
        evidence: { type: 'trade_history' },
        editable: true,
      },
      /*
        ai_inferred(확인 필요) 셋. 프로토타입 `guess:true` 세 줄이다.
        `editable: false` 인 이유는 추측을 지우는 버튼이 확정 사실의 `삭제` 가
        아니라 카드의 `아니에요` 이기 때문이다(proto `deletable: !f.guess`).
      */
      {
        id: 'fact_3',
        text: '손실이 10%를 넘으면\n정리하는 편인가요?',
        source: 'ai_inferred',
        confidence: 'medium',
        asOf: '2026-08-27T21:00:00+09:00',
        evidence: { type: 'trade_history' },
        editable: false,
      },
      {
        id: 'fact_4',
        text: '실적 발표 전에는\n새로 담지 않는 편인가요?',
        source: 'ai_inferred',
        confidence: 'medium',
        asOf: '2026-08-29T21:00:00+09:00',
        evidence: { type: 'trade_history' },
        editable: false,
      },
      {
        id: 'fact_5',
        text: '한 종목에 자산의 30% 이상은\n담지 않으려 하시나요?',
        source: 'ai_inferred',
        confidence: 'medium',
        asOf: '2026-09-01T21:00:00+09:00',
        evidence: { type: 'trade_history' },
        editable: false,
      },
    ],
    theses: [
      {
        id: 'thesis_1',
        ticker: '005930',
        text: 'HBM 증설로 고부가 제품 비중이 늘어날 것으로 보고 담았어요.',
        source: 'user_stated',
        status: 'active',
        recordedAt: '2026-08-20T20:00:00+09:00',
        horizon: 'mid',
        linkedTradeId: null,
      },
      {
        id: 'thesis_2',
        ticker: '000660',
        text: '메모리 업황 반등이 이어질 것 같아서 담았어요.',
        source: 'user_stated',
        status: 'active',
        recordedAt: '2026-08-28T09:50:00+09:00',
        horizon: 'long',
        linkedTradeId: null,
      },
    ],
  },
};

/** 보유 종목을 찾는다. 없으면 `undefined` 다. */
export function findHolding(stockCode: string): MockHolding | undefined {
  return store.holdings.find((holding) => holding.stockCode === stockCode);
}

/** 원장에 한 줄 남긴다. 목록 맨 앞(최신)에 붙는다. */
export function recordTransaction(
  entry: Omit<MockTransaction, 'transactionId'>,
): MockTransaction {
  const transaction: MockTransaction = {
    ...entry,
    transactionId: store.nextTransactionId,
  };
  store.nextTransactionId += 1;
  store.transactions.unshift(transaction);
  return transaction;
}

/**
 * 최근 본 종목을 갱신한다. `GET /stocks/{stockCode}` 호출 자체가 기록이다 (contracts C51).
 * 중복이면 최상단으로 올리고 최대 30건 FIFO 다.
 */
export function touchRecentStock(stockCode: string): void {
  store.recentStocks = [
    { stockCode, viewedAt: nowKstIso() },
    ...store.recentStocks.filter((entry) => entry.stockCode !== stockCode),
  ].slice(0, RECENT_STOCKS_MAX_COUNT);
}

/**
 * 최근 검색어를 갱신한다. **`GET /stocks/search` 호출 자체가 기록이다** — 최근 본 종목과
 * 같이 별도 등록 API 가 없다(apiSpec §6.2 에 POST 경로가 없다).
 *
 * 같은 검색어면 새 항목을 만들지 않고 `searchedAt` 만 갱신해 최상단으로 올린다
 * (`keywordId` 는 그대로 유지된다 — 이슈 #23 1번 회신). 최대 10건이고 넘치면
 * 가장 오래된 것이 밀려난다.
 */
export function touchRecentSearchKeyword(keyword: string): void {
  const existing = store.recentSearchKeywords.find(
    (entry) => entry.keyword === keyword,
  );
  const searchedAt = nowKstIso();

  if (existing !== undefined) {
    existing.searchedAt = searchedAt;
    store.recentSearchKeywords = [
      existing,
      ...store.recentSearchKeywords.filter((entry) => entry !== existing),
    ];
    return;
  }

  store.recentSearchKeywords = [
    { keywordId: store.nextSearchKeywordId, keyword, searchedAt },
    ...store.recentSearchKeywords,
  ].slice(0, RECENT_SEARCH_KEYWORDS_MAX_COUNT);
  store.nextSearchKeywordId += 1;
}
