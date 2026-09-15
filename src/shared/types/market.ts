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
 * **표시용 이름은 내려오지 않는다.** 화면이 `indexCode` 를 그대로 라벨로 쓴다
 * (`features/home/components/MarketIndexRoller.tsx` 의 `indexLabel`).
 * 프로토타입이 영문 코드를 그대로 보여주므로 한글로 옮기지 않는다.
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

/**
 * 시장 상태 (`docs/api/apiSpec.md` §5.8 시장 상태 조회, v0.8.14 신설 · 이슈 #78 · 티켓 271).
 *
 * **시간표(09:00·15:30·16:00·20:00)를 프론트가 갖지 않는다.** 이 응답이 서버
 * 시계로 내린 판정 그 자체다 — 애프터마켓처럼 시간표가 바뀔 때 서버 한 곳만
 * 고치기 위해서다. 소비처는 `useMarketStatus`·`useQuoteSubscription` 뿐이다.
 */
export const MarketSessionSchema = z.enum(['REGULAR', 'AFTER', 'CLOSED']);
export type MarketSession = z.infer<typeof MarketSessionSchema>;

/**
 * **`nextChangeAt` 은 nullable 이다** — FINCH-265 관심 종목 셋과 같은 자리다.
 * 시연용 always-open 상태에서 `null` 이 오는데 nullable 을 빠뜨리면 그 갈래에서
 * 응답이 통째로 zod 파싱에 실패해 화면이 버려진다.
 */
export const MarketStatusSchema = z.object({
  /** 주문 접수 가능. apiSpec §7.2 `ORDER_MARKET_CLOSED` 와 같은 판정이다 */
  open: z.boolean(),
  /** 시세가 살아 움직이는 중. false 면 시세 재요청을 멈춘다 */
  quotesLive: z.boolean(),
  session: MarketSessionSchema,
  /**
   * 세션이 다음에 바뀌는 시각(KST). **경계 시각 자체는 아직 이전 세션이다**
   * (15:30:00 은 정규장) — 소비처가 이 시각 정각이 아니라 몇 초 뒤에 다시 불러야
   * 한다. `null` 이면 시연용 always-open 상태라 다시 부를 시점이 없다.
   */
  nextChangeAt: IsoDateTimeSchema.nullable(),
});
export type MarketStatus = z.infer<typeof MarketStatusSchema>;
