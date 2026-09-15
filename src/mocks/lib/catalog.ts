import { ORDER_ERROR_CODES } from '@/shared/types/errorCodes';

import { nowKstIso } from './time';

/**
 * 목 종목 카탈로그. 시세·검색·주문·AI 가 모두 이 표 하나를 본다.
 * 여기 없는 종목코드는 전부 `STOCK_NOT_FOUND` 다.
 *
 * **등락이 세 방향 다 들어 있다** — 상승(적색)·하락(청색)·보합. 전부 상승으로 채우면
 * 하락 렌더를 아무도 보지 못한 채 시연에 들어간다.
 *
 * `changeRate` 는 **백분율**이다 (`-1.21` = −1.21%). 0~1 소수가 아니다 (contracts C18).
 * 금액·수량은 원 단위 정수다.
 *
 * ## 서비스 30종목을 따른다 — 예외 둘은 일부러 밖에 둔다
 *
 * 정본은 `backend/src/main/resources/application.yaml` 의 `finch.universe.codes`
 * (2026-09-14 확정, 30종목)다. 목이 그 밖의 종목을 들고 있으면 **개발에서는 멀쩡히
 * 열리던 종목이 실서버에서 `STOCK_NOT_FOUND` 로 죽는다.** 그래서 평범한 종목
 * 픽스처는 전부 30종목 안에서 고른다.
 *
 * **다만 두 개는 30종목 밖이어야 제 일을 한다.**
 *
 * | 종목 | 밖에 두는 이유 |
 * | --- | --- |
 * | `02826K`(삼성물산우B) | 영문자가 섞인 종목코드 회귀 픽스처(FINCH-255). **30종목은 전부 숫자라 유니버스 안에서는 이 갈래를 만들 수 없다** |
 * | `037440`(희림) | 상장폐지(`active: false`) 픽스처. 폐지된 종목은 정의상 활성 유니버스에 없다 |
 *
 * 두 종목은 기업 로고도 없어(`shared/config/stockLogos.ts` 는 30종목뿐) 목록에서
 * 이니셜 뱃지로 그려진다. **그것이 맞는 렌더고**, 덤으로 `StockLogo` 의 폴백 경로가
 * 개발 중에 늘 눈에 보인다.
 */

/** 시세 상태 (apiSpec §5.4 `stale` 규칙 · contracts C42). */
export type MockQuoteState =
  /** 정상 수신 — 최신 값 + `stale: false` */
  | 'live'
  /** 수신 끊김 — 마지막 수신 값을 유지한 채 `stale: true` */
  | 'stale'
  /** 값 없음(캐시 미스) — 가격 3필드와 `asOf` 가 전부 `null` + `stale: true` */
  | 'missing';

export interface MockStock {
  stockCode: string;
  stockName: string;
  market: 'KOSPI' | 'KOSDAQ';
  /** AI 수익률 원인 분석의 섹터 축에 쓴다 */
  sector: string;
  previousClose: number;
  currentPrice: number;
  suspended: boolean;
  suspendedReason: string | null;
  quoteState: MockQuoteState;
  /**
   * 활성 종목인지. `false` 는 상장폐지다 (ERD `stock.is_active`).
   *
   * **상장폐지 종목은 검색·상세·최근 본 종목·관심 목록 네 곳에서 전부 빠진다**
   * (계약 C77·C94. 백엔드 MR !107 커밋 `ed003ce`). 주문할 수 없는 종목은
   * 없는 종목과 같게 다룬다 — 상세는 `STOCK_NOT_FOUND` 다.
   */
  active: boolean;
  /**
   * `GET /orders/available` 이 `tradable: false` 로 답할 때의 `reason` 이고
   * `POST /orders` 가 그대로 거절 코드로 쓴다. `null` 이면 거래 가능하다.
   *
   * **목은 항상 장중으로 본다.** 시계로 판정하면 거래 시간
   * (`MARKET_HOURS_LABEL_KST`) 밖에서 주문 화면을 아예 만들 수 없다. 대신
   * `ORDER_MARKET_CLOSED` 는 아래 전용 종목으로 재현한다.
   *
   * **세션(정규장·애프터마켓·닫힘)은 아직 흉내 내지 않는다** (apiSpec §5.8,
   * `GET /market/status`). 그 API 를 붙여 장 밖에서 폴링을 멈추게 만들 때 목도
   * 세션을 갈라야 검증이 된다 — 별도 티켓이다.
   */
  orderRejection: string | null;
}

export const MOCK_STOCKS: readonly MockStock[] = [
  {
    stockCode: '005930',
    stockName: '삼성전자',
    market: 'KOSPI',
    sector: '반도체',
    previousClose: 74400,
    currentPrice: 73500,
    suspended: false,
    suspendedReason: null,
    quoteState: 'live',
    active: true,
    orderRejection: null,
  },
  /**
   * **영문자가 섞인 종목코드 픽스처** (FINCH-255). 우선주·전환우선주·신규 지주사는
   * 코드에 문자가 들어간다 — 시드 300종목 중 9건이고 실제 KIS 마스터에는 훨씬 많다.
   *
   * 목 카탈로그가 순수 숫자뿐이던 탓에 `StockCodeSchema` 가 `\d{6}` 인 것을 아무도
   * 못 잡았고, 실제 백엔드에 붙이자 `삼성` 검색이 통째로 실패했다. **이 한 줄이 그 회귀를
   * 막는다** — 프론트에 테스트 러너가 없어(`package.json` 에 `test` 없음) 목 데이터가
   * 유일한 방어선이다.
   *
   * 삼성전자 바로 옆에 두는 것도 의도다. MSW 에서 `삼성` 을 검색하면 이 종목이 함께
   * 걸려 사고 당시와 같은 응답 모양이 재현된다.
   */
  {
    stockCode: '02826K',
    stockName: '삼성물산우B',
    market: 'KOSPI',
    sector: '상사',
    previousClose: 229000,
    currentPrice: 226500,
    suspended: false,
    suspendedReason: null,
    quoteState: 'live',
    active: true,
    orderRejection: null,
  },
  {
    stockCode: '000660',
    stockName: 'SK하이닉스',
    market: 'KOSPI',
    sector: '반도체',
    previousClose: 191500,
    currentPrice: 198000,
    suspended: false,
    suspendedReason: null,
    quoteState: 'live',
    active: true,
    orderRejection: null,
  },
  {
    stockCode: '035720',
    stockName: '카카오',
    market: 'KOSPI',
    sector: '인터넷',
    previousClose: 41250,
    currentPrice: 41250,
    suspended: false,
    suspendedReason: null,
    quoteState: 'live',
    active: true,
    orderRejection: null,
  },
  {
    stockCode: '086520',
    stockName: '에코프로',
    market: 'KOSDAQ',
    sector: '2차전지',
    previousClose: 68000,
    currentPrice: 73800,
    suspended: false,
    suspendedReason: null,
    quoteState: 'live',
    active: true,
    orderRejection: null,
  },
  {
    stockCode: '196170',
    stockName: '알테오젠',
    market: 'KOSDAQ',
    sector: '바이오',
    previousClose: 380000,
    currentPrice: 372200,
    suspended: false,
    suspendedReason: null,
    quoteState: 'live',
    active: true,
    orderRejection: null,
  },
  {
    stockCode: '466100',
    stockName: '클로봇',
    market: 'KOSDAQ',
    sector: '로봇',
    previousClose: 18500,
    currentPrice: 18100,
    suspended: true,
    suspendedReason: '조회공시 요구 (풍문 또는 보도)',
    quoteState: 'live',
    active: true,
    orderRejection: ORDER_ERROR_CODES.STOCK_SUSPENDED,
  },
  {
    stockCode: '024060',
    stockName: '흥구석유',
    market: 'KOSPI',
    sector: '석유유통',
    previousClose: 12400,
    currentPrice: 12700,
    suspended: false,
    suspendedReason: null,
    quoteState: 'stale',
    active: true,
    orderRejection: ORDER_ERROR_CODES.MARKET_CLOSED,
  },
  {
    stockCode: '058610',
    stockName: '에스피지',
    market: 'KOSDAQ',
    sector: '전동기',
    previousClose: 21500,
    currentPrice: 21000,
    suspended: false,
    suspendedReason: null,
    quoteState: 'missing',
    active: true,
    orderRejection: ORDER_ERROR_CODES.PRICE_UNAVAILABLE,
  },
  /**
   * 상장폐지 전용 픽스처. 검색·상세·최근 본 종목·관심 목록에서 빠지는 것을
   * 화면에서 확인하려면 관심 목록에 이 코드를 넣어 두고 목록을 조회한다.
   */
  {
    stockCode: '037440',
    stockName: '희림',
    market: 'KOSDAQ',
    sector: '건설',
    previousClose: 7800,
    currentPrice: 7800,
    suspended: false,
    suspendedReason: null,
    quoteState: 'stale',
    active: false,
    orderRejection: null,
  },
];

/**
 * 카탈로그에서 종목을 찾는다. 없으면 `undefined` 다 → 호출부가 `STOCK_NOT_FOUND` 로 답한다.
 *
 * **상장폐지 종목도 찾힌다.** 보유·원장처럼 지난 기록을 보여줘야 하는 자리는
 * 이름과 가격이 필요하다. 사용자에게 노출되는 목록에서 거르는 것은
 * `findActiveStock`·`isActiveStock` 을 쓰는 쪽의 일이다.
 */
export function findStock(stockCode: string): MockStock | undefined {
  return MOCK_STOCKS.find((stock) => stock.stockCode === stockCode);
}

/** 활성 종목만 찾는다. 상장폐지면 `undefined` — 없는 종목과 같게 다룬다 (계약 C94). */
export function findActiveStock(stockCode: string): MockStock | undefined {
  const stock = findStock(stockCode);
  return stock === undefined || !stock.active ? undefined : stock;
}

/** 활성 종목 목록. 검색·랭킹처럼 카탈로그를 훑는 자리가 쓴다. */
export const ACTIVE_MOCK_STOCKS: readonly MockStock[] = MOCK_STOCKS.filter(
  (stock) => stock.active,
);

/** 전일 대비 변동액. 보합이면 0 이다. */
export function changeAmountOf(stock: MockStock): number {
  return stock.currentPrice - stock.previousClose;
}

/** 전일 대비 등락률. **백분율이고 소수점 둘째 자리까지다** (`-1.21`). */
export function changeRateOf(stock: MockStock): number {
  const rate = (changeAmountOf(stock) / stock.previousClose) * 100;
  return Math.round(rate * 100) / 100;
}

/**
 * 목록 한 줄 (apiSpec §5.1 `StockSummary`).
 *
 * **`quoteState: 'missing'` 이면 가격 셋이 `null` 이다** — `toStockQuote` 와 같은 규칙이고
 * 근거도 같다 (apiSpec §5.4 셋째 행). 전에는 여기서 `quoteState` 를 보지 않아 시세 없는
 * 종목도 숫자를 내보냈다. 그래서 `058610`(에스피지)이라는 「시세 없음」 픽스처가
 * 멀쩡히 있는데도 검색 결과로는 그 상태를 한 번도 재현하지 못했고, 프론트 스키마가
 * `null` 을 거부하던 것을 목으로는 잡을 수 없었다 (FINCH-255).
 */
export function toStockSummary(stock: MockStock) {
  const missing = stock.quoteState === 'missing';
  return {
    stockCode: stock.stockCode,
    stockName: stock.stockName,
    market: stock.market,
    currentPrice: missing ? null : stock.currentPrice,
    changeAmount: missing ? null : changeAmountOf(stock),
    changeRate: missing ? null : changeRateOf(stock),
    suspended: stock.suspended,
  };
}

/** 시세 한 건 (apiSpec §5.4). `quoteState` 가 세 상태를 가른다. */
export function toStockQuote(stock: MockStock) {
  if (stock.quoteState === 'missing') {
    return {
      stockCode: stock.stockCode,
      currentPrice: null,
      changeAmount: null,
      changeRate: null,
      asOf: null,
      stale: true,
    };
  }

  return {
    stockCode: stock.stockCode,
    currentPrice: stock.currentPrice,
    changeAmount: changeAmountOf(stock),
    changeRate: changeRateOf(stock),
    asOf: nowKstIso(),
    stale: stock.quoteState === 'stale',
  };
}
