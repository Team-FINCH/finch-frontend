/**
 * 쿼리 키 팩토리 (컨벤션 §4).
 * 호출부에서 문자열 배열을 직접 만들지 않는다. 직접 만들면 무효화 시점에
 * 키가 한 글자 어긋나 캐시가 안 지워지는 사고가 난다.
 *
 * 파라미터 타입을 `CandlePeriod`·`OrderSide` 같은 도메인 유니언이 아니라 `string`
 * 으로 둔 이유 — 이 파일이 `shared/types/**` 를 import 하면 키 팩토리가 도메인
 * 스키마에 묶인다. 유니언은 전부 문자열 리터럴이라 `string` 자리에 그대로 들어가고,
 * 값이 틀렸는지는 호출부의 인자 타입이 이미 잡는다.
 */
export const queryKeys = {
  health: {
    all: () => ['health'] as const,
    status: () => [...queryKeys.health.all(), 'status'] as const,
  },
  users: {
    all: () => ['users'] as const,
    /** 키에 userId 를 넣지 않는다. 가리키는 대상은 언제나 지금 로그인한 사람이다. */
    me: () => [...queryKeys.users.all(), 'me'] as const,
  },
  /** `GET /account` (FINCH-49). 계좌는 사용자당 하나라 파라미터가 없다. */
  account: {
    all: () => ['account'] as const,
    summary: () => [...queryKeys.account.all(), 'summary'] as const,
  },
  /** `GET /portfolio` (FINCH-49). 홈은 항상 기본 정렬(`EVALUATION`)만 쓴다. */
  portfolio: {
    all: () => ['portfolio'] as const,
    summary: () => [...queryKeys.portfolio.all(), 'summary'] as const,
  },
  stocks: {
    all: () => ['stocks'] as const,
    /**
     * 종목 검색 (apiSpec §5.1). 검색어가 키에 들어간다 — 검색어마다 다른 결과다.
     * 2글자 미만은 호출 자체를 막으므로(`STOCK_SEARCH_MIN_KEYWORD_LENGTH`)
     * 그 키로는 캐시가 생기지 않는다.
     */
    search: (keyword: string) =>
      [...queryKeys.stocks.all(), 'search', keyword] as const,
    /** 최근 검색어 (apiSpec §6.2). 검색을 실행하면 서버에서 갱신되므로 함께 무효화한다. */
    recentKeywords: () =>
      [...queryKeys.stocks.all(), 'search', 'recent'] as const,
    /** 최근 본 종목 (apiSpec §6.1). 종목 상세 조회가 이 목록을 바꾼다 (contracts C51). */
    recentStocks: () => [...queryKeys.stocks.all(), 'recent'] as const,
    detail: (stockCode: string) =>
      [...queryKeys.stocks.all(), 'detail', stockCode] as const,
    /** 캔들 (apiSpec §5.3). 기간이 키에 들어가야 기간 탭을 오갈 때 캐시가 산다. */
    candles: (stockCode: string, period: string) =>
      [...queryKeys.stocks.all(), 'candles', stockCode, period] as const,
    /** 단건 현재가 (apiSpec §5.4). 상세 화면이 폴링으로 갱신한다. */
    quote: (stockCode: string) =>
      [...queryKeys.stocks.all(), 'quote', stockCode] as const,
  },
  /** `GET /watchlist` (FINCH-49). */
  watchlist: {
    all: () => ['watchlist'] as const,
    list: (sort: string) => [...queryKeys.watchlist.all(), sort] as const,
  },
  orders: {
    all: () => ['orders'] as const,
    /**
     * 주문 가능 정보 (apiSpec §7.3). `side` 가 키에 들어간다 —
     * 매수와 매도는 분모(`maxQuantity`·`holdingQuantity`)가 서로 다른 응답이다.
     */
    available: (stockCode: string, side: string) =>
      [...queryKeys.orders.all(), 'available', stockCode, side] as const,
  },
  /** `GET /stocks/prices` (FINCH-49). 코드 배열을 정렬해 키를 만든다. */
  stockQuotes: {
    all: () => ['stockQuotes'] as const,
    batch: (stockCodes: readonly string[]) =>
      [...queryKeys.stockQuotes.all(), [...stockCodes].sort()] as const,
  },
  ai: {
    all: () => ['ai'] as const,
    /** `GET /ai/briefing`. 생략하면 당일이다 — 키에도 `date` 를 그대로 싣는다. */
    briefing: (date?: string) =>
      [...queryKeys.ai.all(), 'briefing', date ?? 'today'] as const,
    /** 종목 AI 분석 (apiSpec §10.1). `POST` 지만 읽기라 쿼리로 다룬다 — 아래 훅 주석 참고. */
    stockAnalysis: (stockCode: string) =>
      [...queryKeys.ai.all(), 'stocks', stockCode, 'analysis'] as const,
  },
  /**
   * 알림함 (FINCH-49). **API 계약 자체가 프론트 추정값이다**
   * (`shared/config/apiContract.ts` 의 `API_PATHS.inbox` 주석 참고).
   */
  inbox: {
    all: () => ['inbox'] as const,
    list: () => [...queryKeys.inbox.all(), 'list'] as const,
  },
} as const;
