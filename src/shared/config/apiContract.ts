/**
 * 계약으로 확정됐지만 스키마로 표현할 성질이 아닌 값들.
 *
 * 출처: `docs/api/apiSpec.md` · `frontend/docs/contracts.md` §1 확정.
 * 경로·한도·헤더 이름이 화면마다 흩어지면 계약이 바뀔 때 고칠 자리를 찾는 것부터 일이 된다.
 * 프론트 규약 §5 가 "AI 경로 문자열은 shared/config 상수 한 곳에 모은다"로 정한 자리이기도 하다.
 */

/**
 * 프론트가 쓰는 Base URL 은 이것 하나다 (apiSpec §1.1 Base URL · contracts C1).
 * AI 기능도 `/api/v1/ai/**` 로 부르고 AI 서버(`/api/ai/v1`)를 직접 호출하지 않는다.
 */
export const API_BASE_PATH = '/api/v1';

/** 모든 응답에 실리는 요청 추적 헤더 (apiSpec §1.1 요청 추적). */
export const REQUEST_ID_HEADER = 'X-Request-Id';

/** 충전·주문에 필수인 멱등성 헤더 (apiSpec §1.4 멱등성 · contracts C29). */
export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

/** 커서 페이징 크기 (apiSpec §1.5 페이징 · contracts C27). */
export const CURSOR_PAGE_DEFAULT_SIZE = 30;
export const CURSOR_PAGE_MAX_SIZE = 100;

/** 다건 시세 조회 한 번에 최대 건수 (apiSpec §5.5 다건 현재가 조회 · contracts C41). */
export const STOCK_PRICES_MAX_CODES = 50;

/** 관심 종목 최대 개수 (apiSpec §6.3 관심 종목 · contracts C50). */
export const WATCHLIST_MAX_COUNT = 50;

/** 최근 본 종목 최대 건수. FIFO (apiSpec §6.1 최근 본 종목 · contracts C51). */
export const RECENT_STOCKS_MAX_COUNT = 30;

/** 최근 검색어 최대 건수 (apiSpec §6.2 최근 검색어). */
export const RECENT_SEARCH_KEYWORDS_MAX_COUNT = 10;

/** 종목 검색을 시작하는 최소 글자 수 (apiSpec §5.1 종목 검색 · 자동완성). */
export const STOCK_SEARCH_MIN_KEYWORD_LENGTH = 2;

/**
 * 충전 한도 (apiSpec §4.1~4.2 · contracts C49).
 * **누적 한도의 기준은 계정 전체다** — v0.7 에서 회차 기준이 사라져 되돌릴 경로가 없다 (이슈 #27).
 */
export const DEPOSIT_PER_REQUEST_LIMIT = 10_000_000;
export const DEPOSIT_CUMULATIVE_LIMIT = 100_000_000;

/** 최초 로그인 시 지급되는 예수금 (apiSpec §2.1 · contracts C47). */
export const INITIAL_CASH_BALANCE = 1_000_000;

/**
 * 거래 시간 표기 (KST). 이 밖에는 주문할 수 없다 (apiSpec §7.2 · §5.8 · contracts C44).
 * 화면은 주문 버튼을 비활성화하고 사유 문구에 이 표기를 넣는다.
 *
 * **구간이 둘이다** (FINCH-266). `2026-09-14` 에 KRX 애프터마켓(16:00~20:00)이
 * 들어오면서 `MarketClock.isOpen()` 이 `sessionNow() != CLOSED` 가 됐다 — 정규장과
 * 애프터마켓 **둘 다** 주문을 받는다. 그전까지 정규장 하나여서 이 자리도 시각 두 개
 * (`09:00`·`15:30`)로 나뉘어 있었다.
 *
 * **시각 넷을 따로 내보내지 않고 완성된 표기 하나로 둔다.** 쓰는 곳이 사유 문구
 * 하나뿐이고, 조각으로 두면 부르는 쪽이 구분자(`~`·`, `)를 각자 적게 되어 서버가
 * 주는 문장과 모양이 갈린다. 서버도 같은 문자열을 만든다 —
 * `ORDER_MARKET_CLOSED("지금은 주문할 수 없어요 (거래 시간 09:00~15:30, 16:00~20:00)")`.
 *
 * **15:30~16:00 은 닫혀 있다.** 두 구간 사이의 30분이고 서버는 그때를 `CLOSED` 로
 * 본다. 표기가 두 구간을 나란히 적는 것으로 이미 드러나므로 따로 설명하지 않는다.
 */
export const MARKET_HOURS_LABEL_KST = '09:00~15:30, 16:00~20:00';

/**
 * 주문 수량 비율 버튼 (contracts C45).
 * "최대"는 비율이 아니라 `GET /orders/available` 의 `maxQuantity`·`holdingQuantity` 를
 * 그대로 쓴다. 화면이 분모를 계산하지 않는다.
 */
export const ORDER_QUANTITY_RATIO_PRESETS = [0.1, 0.25, 0.5] as const;

/**
 * 시세 폴링 티어 TTL (apiSpec §5.6 폴링 선행·폴백 단계 · contracts C40).
 * **서버가 보장하는 계약은 이 값 하나뿐이다.**
 */
export const QUOTE_POLLING_TTL_SECONDS = 30;

/**
 * 폴링 주기 (apiSpec §5.6 수치 기본값과 관계식 · contracts C40).
 * **계약이 아니라 프론트 재량이다.** 서버가 보장하는 것은 위의 TTL 30초뿐이고,
 * 관계식 1(`TTL >= 주기 x 4~6`)만 지키면 된다 — apiSpec §5.6 이 "권장값은 관계식 1만
 * 지키면 프론트가 자유롭게 조정할 수 있고, 조정 시 이 문서를 고칠 필요가 없다"로
 * 열어 뒀고 §13 5번도 "관계식 유지 하에 수치만 조정 가능"이다.
 *
 * **목록은 명세 권장값(5초)이 아니라 3초를 쓴다.** 백엔드가 KIS 를 3초마다 순회하는데
 * (`backend/src/main/resources/application.yaml` 의 `finch.kis.poll-interval: 3s`)
 * 프론트가 5초로 물으면 두 주기의 최소공배수가 15초라, 물을 때마다 서버 값이 방금
 * 갱신된 것인지 3초 지난 것인지가 달라진다. 그래서 체감 갱신 간격이 5초로 고르지 않고
 * 3~8초로 흔들린다. 순회 주기와 맞추면 그 흔들림이 사라진다.
 *
 * 관계식 1 로 봐도 3초 쪽이 안전하다. 5초면 필요 TTL 이 20~30초라 실제 TTL 30초의
 * 경계에 딱 붙어 요청이 연달아 실패하면 슬롯이 회수·재등록을 반복(플래핑)할 수 있고,
 * 3초면 12~18초라 여유가 크다.
 *
 * 주문 화면도 지금은 같은 3초지만 **상수를 하나로 합치지 않는다.** 주문은 체결 금액이
 * 걸린 자리라 성격이 달라 나중에 갈릴 수 있다.
 */
export const QUOTE_POLLING_INTERVAL_MS = {
  list: 3_000,
  order: 3_000,
} as const;

/**
 * 시장 지수 폴링 주기 (apiSpec §5.7 · 이슈 #65).
 *
 * **`QUOTE_POLLING_INTERVAL_MS` 에 티어로 얹지 않았다.** 지수는 종목 시세와 다른
 * 수집 경로다 — 서버가 관심 신호와 무관하게 상시로 모으고(§5.7 "누가 보든 안 보든
 * 계속 갱신한다") 슬롯·TTL 이 없다. 그래서 `useQuoteSubscription` 을 거치지 않고
 * 일반 쿼리 + `refetchInterval` 로 부른다. 이슈 #65 가 명시한 것이기도 하다.
 *
 * 값이 15초인 이유는 **서버 수집 주기가 10초**여서다. 더 짧게 물어도 같은 값이
 * 돌아오고, 10초에 정확히 맞추면 두 주기가 미끄러질 때마다 방금 갱신된 값과
 * 한 주기 묵은 값이 번갈아 나온다. apiSpec 이 15초를 권장값으로 적었고 그것이
 * 계약이 아니라 프론트 재량임도 함께 적었다.
 */
export const MARKET_INDICES_POLLING_INTERVAL_MS = 15_000;

/**
 * STOMP 하트비트 (apiSpec §5.6 웹소켓 · contracts C39).
 * 3회 미수신(30초)이면 서버가 연결을 닫고 슬롯을 회수한다.
 * 웹소켓 전환 시점 자체는 미확정이다 (contracts P9).
 */
export const STOMP_HEARTBEAT_MS = 10_000;
export const STOMP_RECLAIM_TIMEOUT_MS = STOMP_HEARTBEAT_MS * 3;

/**
 * 백엔드 엔드포인트 경로. Base URL 을 제외한 뒷부분이다.
 * AI 중계 7종은 apiSpec §10.1 경로 매핑에서 확정됐다 (contracts C3).
 * **`briefing` 만 GET 이다.**
 */
export const API_PATHS = {
  auth: {
    kakao: '/auth/kakao',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
  },
  users: {
    me: '/users/me',
  },
  account: {
    summary: '/account',
  },
  /**
   * 충전 4단계 (FINCH-35). 단발 `POST /deposits`는 apiSpec v0.8에서 삭제됐다
   * (`frontend/docs/contracts.md` C49 · C85). 이 워크트리 시점에는 `contracts.md`에
   * C89~C92(오늘 등재된 충전 계약)가 아직 안 보여서, 아래 세 경로는 티켓 프롬프트가
   * 확정값으로 준 것을 그대로 옮겼다 — 실제 계약 문서와 다르면 그쪽이 맞다.
   */
  deposits: {
    limit: '/deposits/limit',
    ready: '/deposits/ready',
    confirm: '/deposits/confirm',
    mockApprove: (paymentId: string) => `/deposits/${paymentId}/mock-approve`,
  },
  withdrawals: {
    create: '/withdrawals',
  },
  stocks: {
    search: '/stocks/search',
    recentSearchKeywords: '/stocks/search/recent',
    recent: '/stocks/recent',
    prices: '/stocks/prices',
    detail: (stockCode: string) => `/stocks/${stockCode}`,
    candles: (stockCode: string) => `/stocks/${stockCode}/candles`,
    price: (stockCode: string) => `/stocks/${stockCode}/price`,
  },
  watchlist: {
    list: '/watchlist',
    remove: (stockCode: string) => `/watchlist/${stockCode}`,
  },
  /**
   * 시장 지수 (apiSpec §5.7, v0.8.7 신설 · 티켓 225). 파라미터가 없다 —
   * KOSPI · KOSDAQ 둘을 한 번에 준다. **웹소켓 topic 은 없고 REST 폴링만 쓴다.**
   */
  market: {
    indices: '/market/indices',
    /**
     * 시장 상태 (apiSpec §5.8 v0.8.14 · 이슈 #78). `open`·`quotesLive`·`session`·
     * `nextChangeAt` 을 준다. 시간표(09:00·15:30 등)는 서버 판정이라 프론트에
     * 상수로 두지 않는다 — `useMarketStatus` 가 이 값만 소비한다.
     */
    status: '/market/status',
  },
  orders: {
    create: '/orders',
    available: '/orders/available',
  },
  portfolio: '/portfolio',
  transactions: '/transactions',
  ai: {
    analysis: (stockCode: string) => `/ai/stocks/${stockCode}/analysis`,
    chat: '/ai/chat',
    /**
     * 대화 이력 조회 — **계약 없음. 이 경로는 프론트 추정값이다**
     * (FINCH-278, `ai/docs/api-spec.md` §4.1 · GitLab 이슈 #79 회신 대기).
     * 백엔드 중계가 아직 없다(`AiRoute.java` 에 없음). AI 서버 경로
     * (`GET /api/ai/v1/chat/conversations/{conversation_id}/messages`)에서
     * 접두만 `/ai` 로 갈아 끼웠다 — 지금 있는 열한 경로가 전부 그 규칙(경로
     * 변수 이름만 프론트 쪽으로 바꾸고 나머지는 그대로)이라서다.
     *
     * 실제 경로가 열리면 이 줄과 `mocks/handlers/ai.ts` 의 GET 핸들러만 갈아
     * 끼운다 — 위키 `맞아요`(FINCH-246)와 같은 방식이다.
     */
    chatMessages: (conversationId: string) =>
      `/ai/chat/conversations/${conversationId}/messages`,
    diagnosis: '/ai/portfolio/diagnosis',
    attribution: '/ai/portfolio/attribution',
    orderPreview: '/ai/orders/preview',
    briefing: '/ai/briefing',
    feedback: '/ai/feedback',
    /**
     * 위키 4종 (contracts C80). 경로 파라미터 이름은 프론트 쪽 `stockCode`로
     * 통일한다 — AI 원본은 `ticker`다(ia.md §1 "AI가 이해한 나 — 위키 화면").
     *
     * **`createThesis`만 경로에 종목이 없다.** 종목을 본문의 `ticker`로 보낸다
     * (contracts C97). 신규 기록은 `POST`, 수정은 `PUT`이다 — `PUT`은 upsert가
     * 아니라 활성 논지가 없으면 거부한다.
     */
    wiki: {
      get: '/ai/wiki',
      createThesis: '/ai/wiki/theses',
      updateThesis: (stockCode: string) => `/ai/wiki/theses/${stockCode}`,
      deleteFact: (factId: string) => `/ai/wiki/facts/${factId}`,
      /**
       * **계약 없음 — 이 한 줄은 프론트 추정값이다**
       * (FINCH-246, GitLab 이슈 #26 2번 · #41 회신 대기).
       *
       * 추측을 사실로 **승격**하는 경로다. 거절(`DELETE ...?reason=guess_rejected`)
       * 은 MR !140 으로 열렸는데 승격은 아직 없어서, 카드에 `아니에요` 만 있고
       * `맞아요` 가 없었다. 알림함(`inbox`)을 만들 때와 같은 방식으로 간다 —
       * 목으로 흉내 내 화면을 끝까지 만들어 두고, 경로가 열리면 이 줄과
       * `mocks/handlers/wiki.ts` 의 핸들러만 갈아 끼운다.
       *
       * 실제 경로 이름이 무엇이 될지는 모른다. 승격이 `PATCH /facts/{id}` 가 될
       * 수도 있고 `reason` 처럼 기존 경로의 파라미터로 붙을 수도 있다. 그래서
       * 화면은 이 값을 직접 쓰지 않고 `features/portfolio/api/confirmWikiFact.ts`
       * 한 곳만 참조한다.
       */
      confirmFact: (factId: string) => `/ai/wiki/facts/${factId}/confirm`,
    },
  },
  /**
   * 알림함 — **계약 없음. 이 블록 전체가 프론트 추정값이다**
   * (FINCH-49, `ia.md` §1 "알림함" · GitLab 이슈 #26 1번 회신 대기).
   * 목록 조회·읽음 처리·매수 이유 기록 셋 다 백엔드에 대응하는 엔드포인트가 없다.
   * 회신이 오면 이 블록을 통째로 갈아 끼운다.
   */
  inbox: {
    list: '/inbox',
    read: (itemId: string) => `/inbox/${itemId}/read`,
    record: (itemId: string) => `/inbox/${itemId}/record`,
  },
} as const;

/**
 * 웹소켓 (apiSpec §5.6 웹소켓).
 * 핸드셰이크는 인증 없이 통과하고 CONNECT 프레임의 `Authorization` 헤더로 인증한다.
 * **URL 쿼리로 토큰을 보내지 않는다** (로그 노출).
 */
export const WEBSOCKET_PATH = '/ws';
export const priceTopic = (stockCode: string) => `/topic/prices/${stockCode}`;
