import { z } from 'zod';

import { STOCK_PRICES_MAX_CODES } from '@/shared/config/apiContract';

import { CandleIntervalSchema, type CandleInterval } from './candleInterval';
import { createItemsSchema } from './pagination';
import {
  type IsoDateTime,
  type KrwAmount,
  type Percent,
  IsoDateSchema,
  IsoDateTimeSchema,
  KrwAmountSchema,
  PercentSchema,
  QuantitySchema,
  StockCodeSchema,
} from './primitives';

// `CandleInterval` 정의는 `./candleInterval.ts` 한 곳뿐이다 (apiSpec §5.3 v0.8.4
// 확정 · 이슈 #37 회신). 여기서는 이 파일 안에서(`CandlesResponseSchema`) 쓰기
// 위해 들여오고, 기존 소비처(`@/shared/types/stock` 에서 `CandleInterval` 를
// 가져오던 자리)가 안 깨지도록 그대로 다시 내보낸다.
export { CandleIntervalSchema };
export type { CandleInterval };

/**
 * 종목 · 시세 · 관심 종목 (`docs/api/apiSpec.md` §5 종목 API · §6 최근 본 종목 ·
 * 최근 검색어 · 관심 종목 · `frontend/docs/contracts.md` C33~C42 · C46 · C50 · C51).
 *
 * **`changeRate` 는 백분율이다.** `-1.21` 이 −1.21% 다. `PercentSchema` 가 그것을 이름으로 못박는다.
 */

/** 시장 구분 (apiSpec §5.1 종목 검색 · 자동완성). */
export const MarketSchema = z.enum(['KOSPI', 'KOSDAQ']);
export type Market = z.infer<typeof MarketSchema>;

/**
 * 목록에 실리는 종목 한 줄 (apiSpec §5.1 종목 검색 · 자동완성).
 * `suspended` 가 `true` 면 화면에 뱃지를 노출하고 매수·매도를 막는다 (contracts C46).
 */
export const StockSummarySchema = z.object({
  stockCode: StockCodeSchema,
  stockName: z.string(),
  market: MarketSchema,
  /**
   * **시세 셋은 `null` 일 수 있다** (apiSpec §5.4 셋째 행 · `StockSearchRes` 주석).
   * 캐시 미스(수신 이력 없음)면 세 필드가 전부 `null` 이고, 이것은 에러가 아니라
   * 정상 상태다 — 거래가 드문 우선주나 서버 재시작 직후가 그렇다. 화면은 가격
   * 영역을 비운다 (`StockRow` 의 `figures.kind: 'quote'` 가 이미 그렇게 그린다).
   *
   * 전에는 셋 다 non-nullable 이었다. zod 배열 스키마는 원소 하나만 어긋나도 배열
   * 전체를 버리므로, 시세 없는 종목이 검색 결과에 하나만 섞여도 나머지 아홉 개까지
   * 같이 사라졌다 — `StockCodeSchema` 와 같은 사고다 (FINCH-255).
   */
  currentPrice: KrwAmountSchema.nullable(),
  changeAmount: KrwAmountSchema.nullable(),
  /** 백분율. 100 을 곱하지 않는다 */
  changeRate: PercentSchema.nullable(),
  suspended: z.boolean(),
});
export type StockSummary = z.infer<typeof StockSummarySchema>;

/** `GET /stocks/search` 응답 (apiSpec §5.1). 2글자 이상부터 호출한다. */
export const StockSearchResponseSchema = createItemsSchema(StockSummarySchema);
export type StockSearchResponse = z.infer<typeof StockSearchResponseSchema>;

/**
 * 종목 상세의 보유 정보 (apiSpec §5.2 종목 상세). 보유하지 않으면 상위에서 `null` 이다.
 *
 * **현재가가 없으면 평가 두 필드가 `null` 이다** (apiSpec v0.8.2). 보유 목록(§8.1)과
 * 같은 규칙이고, `quantity`·`avgBuyPrice` 는 그때에도 값이 나간다.
 */
export const StockHoldingSummarySchema = z.object({
  quantity: QuantitySchema,
  avgBuyPrice: KrwAmountSchema,
  evaluationProfit: KrwAmountSchema.nullable(),
  /** 백분율 */
  evaluationProfitRate: PercentSchema.nullable(),
});
export type StockHoldingSummary = z.infer<typeof StockHoldingSummarySchema>;

/**
 * `GET /stocks/{stockCode}` 응답 (apiSpec §5.2 종목 상세).
 *
 * **이 호출 자체가 최근 본 종목 기록이다.** 별도 등록 API 가 없다 (contracts C51).
 * `watched` 는 관심 종목 토글의 초기 상태다.
 *
 * **가격 네 필드가 `null` 일 수 있다** (contracts C102). `StockDetailRes` 가
 * `currentPrice`·`changeAmount`·`changeRate`·`asOf` 를 전부 박스 타입으로 두고
 * `PriceSnapshot` 값을 그대로 싣는다 — 시세가 없는 종목이면 넷이 함께 `null` 이고,
 * `holding` 의 평가 두 필드도 같은 분기에서 `null` 이 된다(C93 과 같은 조건).
 * apiSpec §5.2 예시는 숫자만 적고 있지만 **구현이 기준이다**(2026-09-17 백엔드
 * `StockDetailRes.java:15-38,49-55` 확인).
 *
 * **`previousClose` 는 `null` 이 아니다.** 종목 마스터 값이라 시세 유무와 무관하다.
 * 넷과 함께 묶지 않는다.
 *
 * `StockQuoteSchema` 와 같은 이유로 "넷이 함께 있거나 함께 없다" 는 교차 검증을
 * 걸지 않았다 — 서버가 규칙을 어겼을 때 파싱을 실패시키면 화면이 통째로 죽는다.
 * 좁히는 것은 `hasDetailQuoteValues` 로 한다.
 */
export const StockDetailResponseSchema = z.object({
  stockCode: StockCodeSchema,
  stockName: z.string(),
  market: MarketSchema,
  currentPrice: KrwAmountSchema.nullable(),
  previousClose: KrwAmountSchema,
  changeAmount: KrwAmountSchema.nullable(),
  /** 백분율 */
  changeRate: PercentSchema.nullable(),
  suspended: z.boolean(),
  suspendedReason: z.string().nullable(),
  watched: z.boolean(),
  asOf: IsoDateTimeSchema.nullable(),
  holding: StockHoldingSummarySchema.nullable(),
});
export type StockDetailResponse = z.infer<typeof StockDetailResponseSchema>;

/** 가격 값이 실려 있는 종목 상세. `hasQuoteValues` 의 상세 응답 판이다. */
export type StockDetailWithQuote = StockDetailResponse & {
  currentPrice: KrwAmount;
  changeAmount: KrwAmount;
  changeRate: Percent;
  asOf: IsoDateTime;
};

/**
 * 상세 응답의 가격 영역을 그릴 수 있는지 판정한다 (contracts C102).
 * `false` 면 가격 자리를 비우고 주문 진입도 막는다.
 *
 * `hasQuoteValues`(폴링 응답)와 판정 규칙이 같다. 둘을 하나로 합치지 않은 이유는
 * `StockQuote` 에는 `stale` 이 있고 상세 응답에는 없어서 타입 술어의 대상이
 * 다르기 때문이다 — 합치면 둘 중 하나가 구조적 타입에 억지로 맞춰진다.
 */
export function hasDetailQuoteValues(
  detail: StockDetailResponse,
): detail is StockDetailWithQuote {
  return (
    detail.currentPrice !== null &&
    detail.changeAmount !== null &&
    detail.changeRate !== null &&
    detail.asOf !== null
  );
}

/**
 * 캔들 기간 (apiSpec §5.3 v0.8.4 확정 · 이슈 #37 회신 · ia.md §2 "쿼리 파라미터로
 * 둘 상태" 잠금). 기본값은 `1M`.
 *
 * `interval`(`@/shared/types/candleInterval.ts`)과 **독립된 축**이다 — `period`가
 * "얼마나 거슬러 올라가나", `interval`이 "봉 하나가 며칠치인가"를 정한다. `3Y`는
 * v0.8.4에서 월봉 조회를 뒷받침하려고 새로 늘었다. 화면에는 `period`를 고르는
 * 탭이 없고, 봉 종류 탭이 고른 `interval`에 맞춰 프론트가 내부적으로 `period`를
 * 함께 보낸다 — 그 매핑은 `CANDLE_INTERVAL_REQUEST_PERIOD`(`candleInterval.ts`) 한
 * 곳에 있다.
 */
export const CandlePeriodSchema = z.enum(['1M', '3M', '1Y', '3Y']);
export type CandlePeriod = z.infer<typeof CandlePeriodSchema>;

/** 캔들 한 개 (apiSpec §5.3). `date` 는 시각이 아니라 날짜다. */
export const CandleSchema = z.object({
  date: IsoDateSchema,
  open: KrwAmountSchema,
  high: KrwAmountSchema,
  low: KrwAmountSchema,
  close: KrwAmountSchema,
  volume: z.number().int().nonnegative(),
});
export type Candle = z.infer<typeof CandleSchema>;

/** `GET /stocks/{stockCode}/candles` 응답 (apiSpec §5.3). */
export const CandlesResponseSchema = z.object({
  stockCode: StockCodeSchema,
  period: CandlePeriodSchema,
  interval: CandleIntervalSchema,
  candles: z.array(CandleSchema),
});
export type CandlesResponse = z.infer<typeof CandlesResponseSchema>;

/**
 * 시세 한 건 (apiSpec §5.4 현재가 조회 `stale` 규칙 · contracts C42).
 * **웹소켓 수신 페이로드도 같은 스키마다** (apiSpec §5.6 수신 페이로드).
 *
 * 세 상태가 있고 필드 값으로 갈린다.
 *
 * | 상황 | 가격 3필드 · `asOf` | `stale` |
 * | --- | --- | --- |
 * | 정상 수신 | 최신 값 | `false` |
 * | 수신 끊김 | **마지막 수신 값** | `true` |
 * | 값 없음(캐시 미스) | **전부 `null`** | `true` |
 *
 * 화면은 `stale: true` 면 "시세 지연"을 표시하고, 값이 `null` 이면 가격 영역을 비운다.
 * 지연 허용 시간과 주문 차단 기준은 아직 미확정이다 (contracts P10).
 *
 * 스키마에 "정상이면 값이 있다"는 교차 검증을 걸지 않았다. 서버가 규칙을 어겼을 때
 * 파싱을 실패시키면 시세 한 종목 때문에 목록 전체가 죽는다. 좁히는 것은 `hasQuoteValues` 로 한다.
 */
export const StockQuoteSchema = z.object({
  stockCode: StockCodeSchema,
  currentPrice: KrwAmountSchema.nullable(),
  changeAmount: KrwAmountSchema.nullable(),
  /** 백분율 */
  changeRate: PercentSchema.nullable(),
  asOf: IsoDateTimeSchema.nullable(),
  stale: z.boolean(),
});
export type StockQuote = z.infer<typeof StockQuoteSchema>;

/** 가격 값이 실려 있는 시세. `stale` 여부와 무관하다 — 마지막 수신 값도 여기 해당한다. */
export type QuoteWithValues = StockQuote & {
  currentPrice: KrwAmount;
  changeAmount: KrwAmount;
  changeRate: Percent;
  asOf: IsoDateTime;
};

/** 가격 영역을 그릴 수 있는지 판정한다. `false` 면 가격 자리를 비운다. */
export function hasQuoteValues(quote: StockQuote): quote is QuoteWithValues {
  return (
    quote.currentPrice !== null &&
    quote.changeAmount !== null &&
    quote.changeRate !== null &&
    quote.asOf !== null
  );
}

/** `GET /stocks/{stockCode}/price` 응답 (apiSpec §5.4). */
export const StockQuoteResponseSchema = StockQuoteSchema;
export type StockQuoteResponse = z.infer<typeof StockQuoteResponseSchema>;

/**
 * `GET /stocks/prices` 응답 (apiSpec §5.5 다건 현재가 조회 · contracts C41).
 * `stale` 은 **항목별로** 판정한다. 존재하지 않는 코드는 `items` 에서 빠지고
 * 전체 요청이 실패하지 않는다.
 */
export const StockQuotesResponseSchema = createItemsSchema(StockQuoteSchema);
export type StockQuotesResponse = z.infer<typeof StockQuotesResponseSchema>;

/**
 * `GET /stocks/prices` 의 `stockCodes` 파라미터 (apiSpec §5.5 · contracts C41).
 * 쉼표로 이어 붙여 보낸다. 파라미터 이름은 `stockCodes` 로 확정이다 (`codes`·`tickers` 아님).
 * 한 번에 최대 50건이다.
 */
export const StockCodesParamSchema = z
  .array(StockCodeSchema)
  .min(1)
  .max(STOCK_PRICES_MAX_CODES);
export type StockCodesParam = z.infer<typeof StockCodesParamSchema>;

/** `GET /stocks/recent` 항목 (apiSpec §6.1 최근 본 종목). 최대 30건 FIFO 다. */
export const RecentStockSchema = z.object({
  stockCode: StockCodeSchema,
  stockName: z.string(),
  currentPrice: KrwAmountSchema,
  /** 백분율 */
  changeRate: PercentSchema,
  viewedAt: IsoDateTimeSchema,
});
export type RecentStock = z.infer<typeof RecentStockSchema>;

/** `GET /stocks/recent` 응답 (apiSpec §6.1). */
export const RecentStocksResponseSchema = createItemsSchema(RecentStockSchema);
export type RecentStocksResponse = z.infer<typeof RecentStocksResponseSchema>;

/** 관심 종목 정렬 (apiSpec §6.3 관심 종목). 기본은 `REGISTERED` 다. */
export const WatchlistSortSchema = z.enum([
  'REGISTERED',
  'NAME',
  'CHANGE_RATE',
]);
export type WatchlistSort = z.infer<typeof WatchlistSortSchema>;

/** 관심 종목 한 줄 (apiSpec §6.3). `held` 가 `true` 면 "보유" 뱃지를 붙인다. */
export const WatchlistItemSchema = z.object({
  stockCode: StockCodeSchema,
  stockName: z.string(),
  /**
   * 시장 구분 (백엔드 확인, 2026-09-16). `apiSpec §6.3` 예시에는 아직 없다 —
   * 계약 문서가 뒤처진 상태다.
   *
   * **`.catch(undefined)` 로 방어한다.** 아직 안 보내는 경로가 남아 있을 수 있고
   * (필드 자체가 없음), 서버가 모르는 값을 보낼 수도 있다(열거값 밖 문자열).
   * 둘 다 그냥 `MarketSchema` 로 받으면 그 종목 하나의 파싱이 실패하는데, zod
   * 배열 스키마는 원소 하나만 어긋나도 배열 전체를 버려서 관심 목록이 통째로
   * 빈다 — 검색에서 실제로 났던 사고와 같은 모양이다(FINCH-255, MR !258).
   * `.catch` 는 그 종목의 `market` 만 `undefined` 로 내리고 나머지는 그대로
   * 살린다. 화면은 `undefined` 면 시장 줄을 그리지 않는다.
   */
  market: MarketSchema.optional().catch(undefined),
  /**
   * **시세 셋은 `null` 일 수 있다.** `GET /watchlist` 가 실제로 `null` 을 주는지는
   * 아직 확인되지 않았다 — 오늘 이슈 #67 로 물어 뒀고 회신 전이라 방어적으로
   * 넓혀 둔다. `apiSpec §6.3` 의 예시는 값이 채워져 있지만, 같은 시세 캐시를
   * 읽는 `§5.4` 는 캐시 미스면 세 필드가 전부 `null` 이라고 적혀 있어 근거가
   * 갈린다. **`null` 이 실제로 온다고 단정하는 것은 아니다** — 확인된 것은
   * `§5.4` 가 그렇다는 것뿐이다.
   *
   * 답을 기다리지 않고 지금 막는 이유는 zod 배열 스키마가 원소 하나만 어긋나도
   * 배열 전체를 버리기 때문이다. 시세 없는 종목이 관심 목록에 하나만 섞여도
   * `items` 전체가 `SchemaError` 로 날아가 목록이 통째로 빈다 — 검색에서 실제로
   * 났던 사고와 같은 모양이다 (FINCH-255, MR !258).
   */
  currentPrice: KrwAmountSchema.nullable(),
  changeAmount: KrwAmountSchema.nullable(),
  /** 백분율. `null` 이면 화면은 가격 자리를 비운다 */
  changeRate: PercentSchema.nullable(),
  held: z.boolean(),
  registeredAt: IsoDateTimeSchema,
});
export type WatchlistItem = z.infer<typeof WatchlistItemSchema>;

/** `GET /watchlist` 응답 (apiSpec §6.3). `maxCount` 는 50 이다 (contracts C50). */
export const WatchlistResponseSchema = z.object({
  count: z.number().int().nonnegative(),
  maxCount: z.number().int().positive(),
  items: z.array(WatchlistItemSchema),
});
export type WatchlistResponse = z.infer<typeof WatchlistResponseSchema>;

/** `POST /watchlist` 요청 (apiSpec §6.3). */
export const AddWatchlistRequestSchema = z.object({
  stockCode: StockCodeSchema,
});
export type AddWatchlistRequest = z.infer<typeof AddWatchlistRequestSchema>;

/**
 * `GET /stocks/search/recent` 항목 (apiSpec §6.2 최근 검색어). 최대 10건이다.
 *
 * **최근 본 종목(§6.1)과 대칭 계열이지만 시세 필드가 없다. 그것이 의도다** —
 * 검색어는 종목이 아니라 문자열이라서, 종목코드로 검색한 경우에도 문자열로 저장된다
 * (이슈 #23 2번 회신). 그래서 `stockCode` 자리가 없고 `keyword` 문자열 하나가 전부다.
 * 이 목록에서 종목 상세로 곧장 보내는 화면을 만들 수 없다 — 검색을 다시 실행해야 한다.
 *
 * `keywordId` 는 서버 테이블(ERD §2.11 `recent_search_keyword`)의 PK 이고
 * `DELETE .../{keywordId}` 에 그대로 쓴다. 종목코드처럼 문자열이 아니라 숫자다.
 */
export const RecentSearchKeywordSchema = z.object({
  keywordId: z.number().int().positive(),
  keyword: z.string(),
  searchedAt: IsoDateTimeSchema,
});
export type RecentSearchKeyword = z.infer<typeof RecentSearchKeywordSchema>;

/**
 * `GET /stocks/search/recent` 응답 (apiSpec §6.2). `searchedAt` 최신순으로 내려온다.
 *
 * **DELETE 두 경로는 본문이 없다** (`204 No Content`). 없는 대상을 지워도, 남의
 * `keywordId` 를 지목해도 `204` 다 — 존재 여부 자체가 정보 노출이라 구분하지 않는다
 * (§6.2 · §11.2 멱등 규칙). 그래서 삭제 응답용 스키마를 두지 않는다.
 */
export const RecentSearchKeywordsResponseSchema = createItemsSchema(
  RecentSearchKeywordSchema,
);
export type RecentSearchKeywordsResponse = z.infer<
  typeof RecentSearchKeywordsResponseSchema
>;
