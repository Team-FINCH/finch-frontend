import {
  CANDLE_PERIOD_OPTIONS,
  DEFAULT_CANDLE_PERIOD,
} from '@/shared/types/candlePeriod';
import { CandlePeriodSchema, type CandlePeriod } from '@/shared/types/stock';

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
 * **`period` 값 자체(`CANDLE_PERIOD_OPTIONS`·`DEFAULT_CANDLE_PERIOD`)는
 * `@/shared/types/candlePeriod.ts` 한 곳에서만 정의한다 — TODO(계약) 임시값
 * (이슈 #37). 여기서는 그 값을 가져다 재노출만 한다.**
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
export const STOCK_DETAIL_PERIOD_PARAM = 'period';

/**
 * 기본 탭. ia.md 가 정하지 않았고 프로토타입이 차트 탭을 먼저 그린다
 * (`isDtChart` 의 `hint-placeholder-val="{{ true }}"`).
 */
export const DEFAULT_STOCK_DETAIL_TAB: StockDetailTab = 'chart';

/** `@/shared/types/candlePeriod.ts` 재노출. 정의는 그 파일 한 곳뿐이다. */
export { CANDLE_PERIOD_OPTIONS, DEFAULT_CANDLE_PERIOD };

/** 모르는 값은 기본 탭으로 떨어뜨린다. 던지지 않는다 — 위 주석 참고. */
export function parseStockDetailTab(value: string | null): StockDetailTab {
  return (STOCK_DETAIL_TABS as readonly string[]).includes(value ?? '')
    ? (value as StockDetailTab)
    : DEFAULT_STOCK_DETAIL_TAB;
}

/** 모르는 값은 기본 봉 종류로 떨어뜨린다. */
export function parseCandlePeriod(value: string | null): CandlePeriod {
  const parsed = CandlePeriodSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_CANDLE_PERIOD;
}
