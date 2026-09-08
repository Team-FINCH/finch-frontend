import { z } from 'zod';

import { IsoDateTimeSchema, KrwAmountSchema } from './primitives';

/**
 * 출금 (`ia.md` §1 "출금 화면", FINCH-138).
 *
 * 은행·계좌번호는 받지 않는다 — 모의 서비스라 받아도 쓰이는 곳이 없다.
 * 출금 가능액은 예수금 전액이고 별도 한도가 없다. `POST /withdrawals`는
 * `Idempotency-Key` 헤더가 **필수**다(C29·C86) — 충전 확정과 반대다.
 *
 * **출금해도 충전 누적 한도(`depositedAmount`)는 돌아오지 않는다.** `depositedAmount`는
 * 계좌 평생 누적 충전액이라 출금과 무관하다(apiSpec §4.5). 화면이 이 규칙을 안내해야
 * 한다고 명세가 요구하지만 문안은 정해 주지 않았다 — 컴포넌트에 `TODO(계약)`으로 남긴다.
 */

/** `POST /withdrawals` 요청. */
export const WithdrawalRequestSchema = z.object({
  amount: z.number().int().positive(),
});
export type WithdrawalRequest = z.infer<typeof WithdrawalRequestSchema>;

/**
 * `POST /withdrawals` 응답 `201 Created`.
 * 출금 수단이 없어 결제 수단 필드 자체가 없다 — 충전 응답과 다른 점이다.
 */
export const WithdrawalResponseSchema = z.object({
  withdrawalId: z.number().int(),
  amount: KrwAmountSchema,
  cashBalanceAfter: KrwAmountSchema,
  withdrawnAt: IsoDateTimeSchema,
});
export type WithdrawalResponse = z.infer<typeof WithdrawalResponseSchema>;
