import { z } from 'zod';

import { createItemsSchema } from './pagination';
import {
  type IndexPoint,
  type IsoDateTime,
  type Percent,
  IndexPointSchema,
  IsoDateTimeSchema,
  PercentSchema,
} from './primitives';

/**
 * 시장 지수 (`docs/api/apiSpec.md` §5.7 시장 지수 조회, v0.8.7 신설 · 티켓 225).
 * 홈 상단의 지수 자리가 유일한 소비처다.
 *
 * **단위가 종목 시세와 다르다.** `currentValue`·`changeValue` 는 원 단위 정수가
 * 아니라 **소수 둘째 자리까지의 실수**이고(§1.1 금액 규칙의 명시적 예외),
 * `changeRate` 만 종목과 같은 백분율 계열(`Percent`)이다. `-0.47` 이 −0.47% 다.
 *
 * **표시용 이름은 내려오지 않는다.** `indexCode` 를 화면이 라벨로 바꾼다
 * (`features/home/lib/marketIndexLabel.ts`).
 */

/**
 * 지수 코드 (apiSpec §5.7). **§5.1 의 `market` 과 같은 문자열이다.**
 *
 * `shared/types/stock.ts` 의 `MarketSchema` 와 값이 겹치지만 합치지 않았다 —
 * 한쪽은 "이 종목이 어느 시장에 상장돼 있나"이고 이쪽은 "어느 지수인가"다.
 * 지수 쪽은 USD-KRW·NASDAQ 처럼 시장이 아닌 값이 늘어날 자리이고(이번 범위 밖),
 * 그때 한 이름을 공유하고 있으면 종목의 `market` 에 `NASDAQ` 이 들어간다.
 */
export const MarketIndexCodeSchema = z.enum(['KOSPI', 'KOSDAQ']);
export type MarketIndexCode = z.infer<typeof MarketIndexCodeSchema>;

/**
 * 지수 한 건 (apiSpec §5.7 `stale` 규칙). 세 상태가 있고 필드 값으로 갈린다 —
 * §5.4 종목 시세와 같은 모양이고 판정 시간(60초)만 다르다.
 *
 * | 상황 | 값 3필드 · `asOf` | `stale` |
 * | --- | --- | --- |
 * | 정상 수신 | 최신 값 | `false` |
 * | 수신 끊김(60초 초과) | **마지막 수신 값** | `true` |
 * | 값 없음(기동 직후 첫 수신 전) | **전부 `null`** | `true` |
 *
 * **장이 닫혀 있는 것은 `stale` 이 아니다.** 장 마감 뒤·주말·휴장일에도
 * `stale: false` 이고 마지막 거래일 종가가 온다. 장 운영 여부는 이 응답에 없으므로
 * 화면이 "장 마감" 같은 문구를 지어내지 않는다.
 *
 * 종목 시세(`StockQuoteSchema`)와 같은 이유로 "정상이면 값이 있다"는 교차 검증을
 * 걸지 않았다. 서버가 규칙을 어겼을 때 파싱을 실패시키면 지수 하나 때문에 헤더가
 * 통째로 죽는다. 좁히는 것은 아래 `hasIndexValues` 로 한다.
 */
export const MarketIndexSchema = z.object({
  indexCode: MarketIndexCodeSchema,
  /** 소수 둘째 자리까지. 원 단위 정수가 아니다 */
  currentValue: IndexPointSchema.nullable(),
  /** 전일 종가 대비 변동폭. 부호가 있다. 소수 둘째 자리까지 */
  changeValue: IndexPointSchema.nullable(),
  /** 백분율. 100 을 곱하지 않는다 */
  changeRate: PercentSchema.nullable(),
  asOf: IsoDateTimeSchema.nullable(),
  stale: z.boolean(),
});
export type MarketIndex = z.infer<typeof MarketIndexSchema>;

/** 값이 실려 있는 지수. `stale` 여부와 무관하다 — 마지막 수신 값도 여기 해당한다. */
export type MarketIndexWithValues = MarketIndex & {
  currentValue: IndexPoint;
  changeValue: IndexPoint;
  changeRate: Percent;
  asOf: IsoDateTime;
};

/** 값 자리를 그릴 수 있는지 판정한다. `false` 면 그 지수 자리만 비운다. */
export function hasIndexValues(
  index: MarketIndex,
): index is MarketIndexWithValues {
  return (
    index.currentValue !== null &&
    index.changeValue !== null &&
    index.changeRate !== null &&
    index.asOf !== null
  );
}

/**
 * `GET /market/indices` 응답 (apiSpec §5.7).
 *
 * **`items` 는 언제나 `KOSPI` → `KOSDAQ` 둘이고 순서가 고정이다.** 값을 모르는
 * 지수도 빠지지 않고 `null` + `stale: true` 로 온다. 명세가 "프론트는 배열 길이나
 * 순서를 검사하지 않아도 된다"로 열어 뒀으므로 스키마에 길이 제약을 걸지 않는다 —
 * 나중에 USD-KRW·NASDAQ 이 늘어도 이 스키마는 그대로 통과해야 한다.
 */
export const MarketIndicesResponseSchema = createItemsSchema(MarketIndexSchema);
export type MarketIndicesResponse = z.infer<typeof MarketIndicesResponseSchema>;
