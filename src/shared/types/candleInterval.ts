import { z } from 'zod';

import type { CandlePeriod } from './stock';

/**
 * 캔들 간격(봉 종류) — **확정** (apiSpec §5.3 v0.8.4 · 이슈 #37 회신, 2026-09-08).
 *
 * `period`(조회 기간, `1M`·`3M`·`1Y`·`3Y` — `@/shared/types/stock.ts`)와 이
 * `interval`(봉 하나의 크기)은 **독립된 두 축**이다. 둘 다 선택 파라미터고
 * 기본값은 각각 `1M`·`DAY`다. 서버는 어느 조합이든 받는다 — `1Y`+`DAY`(일봉
 * 250개 근처)도 `3Y`+`MONTH`(월봉 36개)도 된다. 열거값 밖은 둘 다
 * `400 INVALID_REQUEST`고, `interval`의 `detail`은
 * `{ interval: "형식이 올바르지 않습니다" }`다.
 *
 * **개수 지정 파라미터(`count`)는 만들지 않기로 확정됐다.** 서버가 얼마나
 * 보낼지는 여전히 `period`가 정하고, 화면의 확대·축소는 이미 받은 응답 안에서만
 * 움직인다(`ChartPeriodSegment` 참고).
 *
 * 이 enum 값(`DAY`·`WEEK`·`MONTH`)은 기존 유일 값 `DAY`가 이미 축약하지 않은
 * 영문 대문자 표기라, 새로 더한 `WEEK`·`MONTH`도 같은 규칙을 따랐다.
 */
export const CandleIntervalSchema = z.enum(['DAY', 'WEEK', 'MONTH']);
export type CandleInterval = z.infer<typeof CandleIntervalSchema>;

/**
 * 봉 종류 탭에 보일 목록과 라벨. "일봉·주봉·월봉" — 사용자가 그렇게 부른다.
 * 값과 라벨을 한 배열에 모아 둬서 `ChartPeriodSegment` 를 비롯한 소비처는
 * 이 배열만 쓴다.
 */
export const CANDLE_INTERVAL_OPTIONS: readonly {
  value: CandleInterval;
  label: string;
}[] = [
  { value: CandleIntervalSchema.parse('DAY'), label: '일봉' },
  { value: CandleIntervalSchema.parse('WEEK'), label: '주봉' },
  { value: CandleIntervalSchema.parse('MONTH'), label: '월봉' },
];

/** 기본 봉 종류. 일봉이 가장 익숙한 해상도라 맨 앞이자 기본값이다. */
export const DEFAULT_CANDLE_INTERVAL: CandleInterval =
  CandleIntervalSchema.parse('DAY');

/**
 * `interval` → `period` 권장 조합 (서동혁(백엔드) 회신, 이슈 #37 · apiSpec
 * §5.3 v0.8.4). 화면에 `period`를 고르는 탭은 없다 — 봉 종류 탭이 `interval`을
 * 고르면 이 표에서 함께 보낼 `period`를 끌어온다.
 *
 * | 탭   | interval | period |
 * |------|----------|--------|
 * | 일봉 | `DAY`    | `3M`   |
 * | 주봉 | `WEEK`   | `1Y`   |
 * | 월봉 | `MONTH`  | `3Y`   |
 *
 * **다른 코드는 이 상수만 참조한다** — `getCandles`가 요청 쿼리를 만들 때 여기서
 * `period`를 끌어온다. `CandlePeriod`(`stock.ts`)를 타입으로만 참조해 순환
 * 참조를 만들지 않는다(`verbatimModuleSyntax`로 타입 임포트는 컴파일 후 지워진다).
 */
export const CANDLE_INTERVAL_REQUEST_PERIOD: Record<
  CandleInterval,
  CandlePeriod
> = {
  DAY: '3M',
  WEEK: '1Y',
  MONTH: '3Y',
};
