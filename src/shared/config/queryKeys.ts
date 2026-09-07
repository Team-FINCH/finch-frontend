/**
 * 쿼리 키 팩토리 (컨벤션 §4).
 * 호출부에서 문자열 배열을 직접 만들지 않는다. 직접 만들면 무효화 시점에
 * 키가 한 글자 어긋나 캐시가 안 지워지는 사고가 난다.
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
  /** `GET /watchlist` (FINCH-49). */
  watchlist: {
    all: () => ['watchlist'] as const,
    list: (sort: string) => [...queryKeys.watchlist.all(), sort] as const,
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
