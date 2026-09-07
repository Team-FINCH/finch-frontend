import { z } from 'zod';

import { PaymentMethodSchema } from './deposit';
import { createCursorPageSchema } from './pagination';
import {
  IsoDateTimeSchema,
  KrwAmountSchema,
  PercentSchema,
  QuantitySchema,
  StockCodeSchema,
} from './primitives';

/**
 * 잔고 · 매매 내역 (`docs/api/apiSpec.md` §8 잔고 · 매매 내역 API).
 *
 * 계산은 전부 서버가 원장 기준으로 한다. 화면은 받은 값을 표시만 한다.
 * `evaluationProfitRate` 는 **백분율**이다 — 서버가 이미 100 을 곱해서 내려준다
 * (apiSpec §8.1 계산식).
 */

/** 보유 종목 정렬 (apiSpec §8.1 보유 종목 목록). 기본은 `EVALUATION` 이다. */
export const PortfolioSortSchema = z.enum(['EVALUATION', 'PROFIT_RATE']);
export type PortfolioSort = z.infer<typeof PortfolioSortSchema>;

/**
 * 보유 종목 한 줄 (apiSpec §8.1).
 *
 * **시세가 없는 종목은 평가 네 필드가 전부 `null` 이다** (apiSpec v0.8.2).
 * `stockCode`·`stockName`·`quantity`·`avgBuyPrice` 는 시세와 무관하게 언제나 값이 있다.
 * §5.4 의 "값 없음" 이 보유 목록에서 갖는 모양이고, 그 종목이 목록에서 빠지지는 않는다 —
 * 가진 주식은 시세를 모를 때에도 보여야 한다.
 */
export const HoldingSchema = z.object({
  stockCode: StockCodeSchema,
  stockName: z.string(),
  quantity: QuantitySchema,
  avgBuyPrice: KrwAmountSchema,
  currentPrice: KrwAmountSchema.nullable(),
  /** 보유 수량 x 현재가 */
  evaluationAmount: KrwAmountSchema.nullable(),
  /** (현재가 − 평균 매수가) x 보유 수량 */
  evaluationProfit: KrwAmountSchema.nullable(),
  /** 백분율. 평가손익 / (평균 매수가 x 보유 수량) x 100 */
  evaluationProfitRate: PercentSchema.nullable(),
});
export type Holding = z.infer<typeof HoldingSchema>;

/**
 * `GET /portfolio` 응답 (apiSpec §8.1). 상단 요약과 보유 목록이 한 응답에 온다.
 *
 * 상단 `evaluationAmount` 합계와 `totalAsset` 에는 **시세가 없는 종목이 더해지지 않는다**
 * (apiSpec v0.8.2). 0 으로 치면 자산이 사라진 것처럼 보이므로 빼고, 대신 그 종목의 평가
 * 필드가 `null` 이라 화면이 합계가 부분값임을 알 수 있다.
 *
 * `asOf` 는 보유 종목들의 시세 기준 시각 중 **가장 오래된 값**이다. 화면의 갱신 시각이
 * 실제보다 신선해 보이지 않게 가장 보수적인 값을 쓴다.
 */
export const PortfolioResponseSchema = z.object({
  cashBalance: KrwAmountSchema,
  evaluationAmount: KrwAmountSchema,
  totalAsset: KrwAmountSchema,
  asOf: IsoDateTimeSchema,
  holdings: z.array(HoldingSchema),
});
export type PortfolioResponse = z.infer<typeof PortfolioResponseSchema>;

/**
 * 원장 유형 (apiSpec §8.2 매매 내역, 명세 8장 원장 유형).
 * 초기 지급과 충전도 같은 내역에 섞여 온다.
 *
 * **apiSpec v0.7 에서 6종 → 4종이 됐다** — 투자 회차가 없어지면서
 * `ROUND_OPEN`·`ROUND_CLOSE` 가 삭제됐다 (이슈 #27).
 * **v0.8 에서 다시 5종이 됐다** — 출금이 신설되며 `WITHDRAWAL` 이 추가됐다
 * (`frontend/docs/contracts.md` C87). `INITIAL_GRANT` 는 v0.7.2 부터 발행되지
 * 않지만(C47) 값 자체는 스키마에 남아 있다.
 */
export const TransactionTypeSchema = z.enum([
  'INITIAL_GRANT',
  'DEPOSIT',
  'WITHDRAWAL',
  'BUY',
  'SELL',
]);
export type TransactionType = z.infer<typeof TransactionTypeSchema>;

/**
 * `GET /transactions` 의 `type` 필터 (apiSpec §8.2 v0.8). 원장 유형 전체와 값이 다르다 —
 * `ALL` 이 더 있고 `INITIAL_GRANT` 가 없다. 화면 필터 이름은 "전체 / 매수 / 매도 /
 * 충전 / 출금" 다섯이다 — "충전"을 "입금"으로 부르지 않는다(C83).
 *
 * **`type=DEPOSIT` 은 `INITIAL_GRANT` 행을 포함하지 않는다** (apiSpec §8.2, 커밋 `af96862`).
 * 원장 유형 `DEPOSIT`(모의 결제 충전)만 걷어 온다 (`mocks/handlers/trading.ts`
 * `TRANSACTION_FILTER_LEDGER_TYPES`). `INITIAL_GRANT` 1건은 `type=ALL` 에서만 나온다.
 *
 * **`type=WITHDRAWAL` 은 원장 유형 `WITHDRAWAL` 만이다**(C87). v0.8 신설분이다.
 */
export const TransactionFilterSchema = z.enum([
  'ALL',
  'BUY',
  'SELL',
  'DEPOSIT',
  'WITHDRAWAL',
]);
export type TransactionFilter = z.infer<typeof TransactionFilterSchema>;

/**
 * 매매 내역 한 줄 (apiSpec §8.2).
 *
 * 유형마다 채워지는 필드가 다르다. 충전 행은 종목·가격·수량이 전부 `null` 이고
 * `paymentMethod` 가 차며, 매매 행은 그 반대다. **키가 빠지는 것이 아니라 `null` 로 온다.**
 *
 * **출금 행은 `paymentMethod` 도 `null` 이다** — 출금은 수단을 받지 않는다(C86).
 * `amount` 는 출금도 양수 절대값으로 오고, 화면은 `type` 으로만 방향을 표시한다(C87).
 */
export const TransactionSchema = z.object({
  transactionId: z.number().int(),
  type: TransactionTypeSchema,
  occurredAt: IsoDateTimeSchema,
  stockCode: StockCodeSchema.nullable(),
  stockName: z.string().nullable(),
  price: KrwAmountSchema.nullable(),
  quantity: QuantitySchema.nullable(),
  amount: KrwAmountSchema,
  realizedProfit: KrwAmountSchema.nullable(),
  /** 백분율 */
  realizedProfitRate: PercentSchema.nullable(),
  paymentMethod: PaymentMethodSchema.nullable(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

/**
 * `GET /transactions` 응답 (apiSpec §8.2).
 * 커서 페이징이고 정렬은 최신순 고정이다. 종료 판정은 `hasNext` 로 한다.
 */
export const TransactionsResponseSchema =
  createCursorPageSchema(TransactionSchema);
export type TransactionsResponse = z.infer<typeof TransactionsResponseSchema>;
