import { z } from 'zod';

import { IsoDateTimeSchema, KrwAmountSchema } from './primitives';

/**
 * 모의 결제(충전) — 4단계 (준비 → 결제창 → 승인 → 확정).
 *
 * apiSpec v0.8 에서 단발 `POST /deposits`가 삭제되고 `ready`·`confirm`·`mock-approve`
 * 셋으로 바뀌었다 (`frontend/docs/contracts.md` C49 · C85, `ia.md` §1 "충전").
 * **충전 확정(`confirm`)은 `Idempotency-Key` 헤더를 쓰지 않는다** — 멱등 기준이
 * PG 발급 `paymentKey` 다(C29·C85). **충전 취소 API 는 없다.**
 *
 * **필드 이름과 타입은 `apiSpec.md` §4 응답 예시와 백엔드 DTO 를 대조해 맞췄다.**
 * 처음에는 티켓 프롬프트가 준 값으로 채워 두고 "실제 계약과 다르면 그쪽이 맞다" 고
 * 적어 두었는데, 실제로 세 군데가 달라 계좌이체가 1단계에서 멈췄다(FINCH-160).
 * `paymentId` 는 숫자이고 `confirm` 응답만 `depositId`·`depositedAt` 이라는 다른
 * 이름을 쓴다 — 그 응답은 v0.7 의 단발 `POST /deposits` 응답을 그대로 물려받았다.
 */

/** 결제 수단. "가상 카드/가상 계좌이체"에서 **카카오페이/계좌이체**로 바뀌었다 (ia.md §1). */
export const PaymentMethodSchema = z.enum(['KAKAOPAY', 'TRANSFER']);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

/**
 * `GET /deposits/limit` 응답. 1회 1,000만 원, **계정 전체 누적** 1억 원이다.
 * 필드 이름은 apiSpec v0.7 이후 값 그대로다 — 4단계 개편에서 이 경로는 바뀌지 않았다.
 */
export const DepositLimitResponseSchema = z.object({
  perRequestLimit: KrwAmountSchema,
  /** 계정 전체 누적 한도 */
  cumulativeLimit: KrwAmountSchema,
  /** 계정 전체 누적 충전액 */
  depositedAmount: KrwAmountSchema,
  remainingAmount: KrwAmountSchema,
});
export type DepositLimitResponse = z.infer<typeof DepositLimitResponseSchema>;

/** `POST /deposits/ready` 요청 — 1단계. 금액·수단 입력. 멱등성 헤더를 쓰지 않는다. */
export const DepositReadyRequestSchema = z.object({
  amount: z.number().int().positive(),
  paymentMethod: PaymentMethodSchema,
});
export type DepositReadyRequest = z.infer<typeof DepositReadyRequestSchema>;

/**
 * `POST /deposits/ready` 응답.
 *
 * **`checkoutUrl` 하나로 이동한다** — 수단을 화면이 구분하지 않는다(ia.md §1).
 * 카카오페이면 카카오 결제창, 계좌이체면 `/deposit/transfer` 모의 이체 화면 주소가 온다.
 *
 * **`amount` 를 읽는다.** 서버는 처음부터 이 값을 돌려주고 있었는데(apiSpec §4.2 ·
 * `DepositReadyRes`) 이 스키마가 두 필드만 집어서 버리고 있었다. 계좌이체의
 * `checkoutUrl` 에는 금액이 실리지 않아(C90) **모의 이체 화면이 금액을 알 길이 여기
 * 말고 없다** — 그 화면으로 넘어갈 때 이 값을 실어 보낸다(`withAmountParam`).
 * 사용자가 입력한 금액을 그대로 쓰지 않는 이유는 **서버가 받아들인 금액이 진실**이기
 * 때문이다. 둘이 갈릴 일이 없더라도 화면에 적는 숫자는 서버 쪽에서 가져온다.
 *
 * `paymentMethod`·`expiresAt` 은 응답에 있지만 읽지 않는다 — 쓰는 자리가 없고,
 * Zod 는 모르는 키를 그냥 버리므로 계약과 어긋나지 않는다.
 */
export const DepositReadyResponseSchema = z.object({
  /** 서버 채번이라 숫자다 (apiSpec §4.2 `"paymentId": 77`). 주문의 `orderId` 와 같은 모양이다. */
  paymentId: z.number().int(),
  amount: KrwAmountSchema,
  checkoutUrl: z.string(),
});
export type DepositReadyResponse = z.infer<typeof DepositReadyResponseSchema>;

/**
 * `POST /deposits/confirm` 요청 — 4단계(최종 확정). 결제 복귀·모의 이체 두 화면이 부른다.
 * `paymentKey` 가 멱등 기준이다 — 같은 값으로 다시 보내면 `201` 이 아니라 `200` 과
 * 최초 응답 본문이 온다(C85). `Idempotency-Key` 헤더는 쓰지 않는다.
 */
export const DepositConfirmRequestSchema = z.object({
  paymentId: z.number().int(),
  paymentKey: z.string(),
  amount: z.number().int().positive(),
});
export type DepositConfirmRequest = z.infer<typeof DepositConfirmRequestSchema>;

/** `POST /deposits/confirm` 응답. 이 호출 하나만 예수금을 실제로 늘린다(ia.md §1). */
export const DepositConfirmResponseSchema = z.object({
  /**
   * **`paymentId` 가 아니라 `depositId` 다.** 이 응답만 v0.7 의 단발 `POST /deposits`
   * 응답 모양을 그대로 물려받았다(apiSpec §4.4). 요청은 `paymentId` 로 보내고 응답은
   * `depositId` 로 받는 비대칭이라 눈에 걸리지만 계약이 그렇다.
   */
  depositId: z.number().int(),
  amount: KrwAmountSchema,
  paymentMethod: PaymentMethodSchema,
  cashBalanceAfter: KrwAmountSchema,
  /** 같은 이유로 `confirmedAt` 이 아니라 `depositedAt` 이다. */
  depositedAt: IsoDateTimeSchema,
});
export type DepositConfirmResponse = z.infer<
  typeof DepositConfirmResponseSchema
>;

/**
 * 모의 이체(`TRANSFER`) 승인 흉내용 시나리오. 실패 흐름 시연을 위한 값이다
 * (티켓 프롬프트 — `SUCCESS`(기본) · `INSUFFICIENT_BALANCE` · `LIMIT_EXCEEDED` · `TIMEOUT`).
 */
export const DEPOSIT_MOCK_APPROVE_SCENARIOS = [
  'SUCCESS',
  'INSUFFICIENT_BALANCE',
  'LIMIT_EXCEEDED',
  'TIMEOUT',
] as const;
export type DepositMockApproveScenario =
  (typeof DEPOSIT_MOCK_APPROVE_SCENARIOS)[number];

/** `POST /deposits/{paymentId}/mock-approve` 요청 — 3단계(승인 흉내), `TRANSFER` 전용. */
export const DepositMockApproveRequestSchema = z.object({
  scenario: z.enum(DEPOSIT_MOCK_APPROVE_SCENARIOS).nullish(),
});
export type DepositMockApproveRequest = z.infer<
  typeof DepositMockApproveRequestSchema
>;

/** `POST /deposits/{paymentId}/mock-approve` 응답. 이어서 `confirm` 을 부르는 재료다. */
export const DepositMockApproveResponseSchema = z.object({
  paymentId: z.number().int(),
  paymentKey: z.string(),
  amount: KrwAmountSchema,
});
export type DepositMockApproveResponse = z.infer<
  typeof DepositMockApproveResponseSchema
>;
