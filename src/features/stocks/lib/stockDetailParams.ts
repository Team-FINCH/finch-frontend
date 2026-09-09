import {
  CANDLE_INTERVAL_OPTIONS,
  DEFAULT_CANDLE_INTERVAL,
} from '@/shared/types/candleInterval';
import {
  CandleIntervalSchema,
  CandlePeriodSchema,
  type CandleInterval,
  type CandlePeriod,
} from '@/shared/types/stock';

/**
 * 종목 상세의 쿼리 파라미터 (`ia.md` §2 "쿼리 파라미터로 둘 상태").
 *
 * **`tab` 값과 `period` 값은 프론트가 혼자 정하는 것이 아니다.** ia.md §2 가 표로
 * 못박았고, 특히 `?tab=ai` 는 브리핑 응답의 `deeplink` 를 **AI 서버가 직접 만들어**
 * 내려보낸다 (AI 명세 §8 예시 `"/stocks/000660?tab=ai"`). 값을 바꾸면 브리핑 링크가
 * 조용히 404 가 된다 — 화면에 에러도 안 뜨고 빈 페이지로 간다.
 *
 * `period` 는 `GET /stocks/{stockCode}/candles` 의 `period` 와 **같은 문자열**이라
 * 별도 매핑 표를 두지 않고 `CandlePeriodSchema` 를 그대로 재사용한다. 표를 두면
 * 계약이 두 벌이 되고 한쪽만 고쳐진다.
 *
 * **`period` 는 ia.md 가 못박은 그대로(`1M`·`3M`·`1Y`·`3Y`)다. 지금 이 화면 어떤
 * 탭도 이 URL 파라미터를 바꾸지 않는다** — 아래 `CANDLE_PERIOD_OPTIONS`·
 * `DEFAULT_CANDLE_PERIOD`·`parseCandlePeriod` 는 그 계약을 그대로 살려 둔 것이고,
 * 실제로 화면에 쓰는 건 봉 종류다. 요청에 실제로 실리는 `period` 는 봉 종류 탭이
 * 고른 `interval` 에서 끌어온 값이다(`CANDLE_INTERVAL_REQUEST_PERIOD`, 아래 참고).
 *
 * **봉 종류 탭(일봉·주봉·월봉)은 이 URL 의 `period` 가 아니라 `interval` 을
 * 고른다.** apiSpec §5.3(v0.8.4 확정 · 이슈 #37 회신)에서 `period`·`interval` 이
 * 독립된 두 축으로 확정됐다. `interval` 값 자체
 * (`CANDLE_INTERVAL_OPTIONS`·`DEFAULT_CANDLE_INTERVAL`·`CANDLE_INTERVAL_REQUEST_PERIOD`)
 * 는 `@/shared/types/candleInterval.ts` 한 곳에서만 정의한다 — 여기서는 재노출만
 * 한다. `?interval=` 쿼리 파라미터는 ia.md 의 쿼리 파라미터 표에 아직 없다 —
 * 구현이 그 문서를 앞질러 갔다. 근거는 `@/shared/types/candleInterval.ts` 머리
 * 주석 참고.
 *
 * **`tab` 기본값은 ia.md 에 없다.** §2 표는 값의 목록만 정하고 기본값을 적지
 * 않아서 아래 상수는 우리가 고른 값이다 — 근거는 상수 주석에 적었다.
 * 잘못된 값이 오면 던지지 않고 기본값으로 떨어뜨린다. 남이 만든 링크가 들어오는
 * 자리라(위 `deeplink`) 오타 하나로 404 를 내면 안 된다.
 */

export const STOCK_DETAIL_TABS = ['chart', 'info', 'ai'] as const;
export type StockDetailTab = (typeof STOCK_DETAIL_TABS)[number];

/** 쿼리 파라미터 이름. 문자열을 화면에 흩어 적지 않는다. */
export const STOCK_DETAIL_TAB_PARAM = 'tab';
/** ia.md §2 잠금(`1M`·`3M`·`1Y`·`3Y`). 지금은 어떤 탭도 이 파라미터를 바꾸지 않는다. */
export const STOCK_DETAIL_PERIOD_PARAM = 'period';
/** 봉 종류 탭이 쓰는 파라미터 (apiSpec §5.3 v0.8.4 확정 · 이슈 #37 회신). */
export const STOCK_DETAIL_INTERVAL_PARAM = 'interval';

/**
 * 기본 탭. ia.md 가 정하지 않았고 프로토타입이 차트 탭을 먼저 그린다
 * (`isDtChart` 의 `hint-placeholder-val="{{ true }}"`).
 */
export const DEFAULT_STOCK_DETAIL_TAB: StockDetailTab = 'chart';

/**
 * 기본 기간. ia.md 가 정하지 않았다. **지금 화면에서 실제로 쓰이지는 않는다** —
 * 봉 종류 탭은 `DEFAULT_CANDLE_INTERVAL` 을 쓴다. `period` 자체가 살아 있는 계약
 * 이라 값과 목록은 지우지 않고 남겨 둔다.
 */
export const DEFAULT_CANDLE_PERIOD: CandlePeriod =
  CandlePeriodSchema.parse('1M');

/** 기간 목록과 라벨. ia.md §2 잠금 값 그대로다. */
export const CANDLE_PERIOD_OPTIONS: readonly {
  value: CandlePeriod;
  label: string;
}[] = [
  { value: CandlePeriodSchema.parse('1M'), label: '1개월' },
  { value: CandlePeriodSchema.parse('3M'), label: '3개월' },
  { value: CandlePeriodSchema.parse('1Y'), label: '1년' },
  { value: CandlePeriodSchema.parse('3Y'), label: '3년' },
];

/** `@/shared/types/candleInterval.ts` 재노출. 정의는 그 파일 한 곳뿐이다. */
export { CANDLE_INTERVAL_OPTIONS, DEFAULT_CANDLE_INTERVAL };

/** 모르는 값은 기본 탭으로 떨어뜨린다. 던지지 않는다 — 위 주석 참고. */
export function parseStockDetailTab(value: string | null): StockDetailTab {
  return (STOCK_DETAIL_TABS as readonly string[]).includes(value ?? '')
    ? (value as StockDetailTab)
    : DEFAULT_STOCK_DETAIL_TAB;
}

/** 모르는 값은 기본 기간으로 떨어뜨린다. 지금은 어디서도 호출하지 않는다(위 주석). */
export function parseCandlePeriod(value: string | null): CandlePeriod {
  const parsed = CandlePeriodSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_CANDLE_PERIOD;
}

/** 모르는 값은 기본 봉 종류로 떨어뜨린다. */
export function parseCandleInterval(value: string | null): CandleInterval {
  const parsed = CandleIntervalSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_CANDLE_INTERVAL;
}
