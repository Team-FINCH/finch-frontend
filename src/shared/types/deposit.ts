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
 * 이 워크트리 시점에는 `contracts.md` 에 C89~C92(오늘 등재된 충전 계약)가 아직
 * 안 보인다 — 다른 브랜치에만 있는 것으로 보인다. 아래 요청·응답 필드 이름은
 * 티켓 프롬프트가 준 값(엔드포인트 3개·`checkoutUrl` 단일 필드·`{paymentId,
 * paymentKey, amount}`)을 최대한 그대로 옮기고, 명시되지 않은 나머지 필드는 기존
 * `DepositResponseSchema`(단발 버전) 관례를 따라 채웠다. 실제 계약과 다르면 그쪽이 맞다.
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
 */
export const DepositReadyResponseSchema = z.object({
  paymentId: z.string(),
  checkoutUrl: z.string(),
});
export type DepositReadyResponse = z.infer<typeof DepositReadyResponseSchema>;

/**
 * `POST /deposits/confirm` 요청 — 4단계(최종 확정). 결제 복귀·모의 이체 두 화면이 부른다.
 * `paymentKey` 가 멱등 기준이다 — 같은 값으로 다시 보내면 `201` 이 아니라 `200` 과
 * 최초 응답 본문이 온다(C85). `Idempotency-Key` 헤더는 쓰지 않는다.
 */
export const DepositConfirmRequestSchema = z.object({
  paymentId: z.string(),
  paymentKey: z.string(),
  amount: z.number().int().positive(),
});
export type DepositConfirmRequest = z.infer<typeof DepositConfirmRequestSchema>;

/** `POST /deposits/confirm` 응답. 이 호출 하나만 예수금을 실제로 늘린다(ia.md §1). */
export const DepositConfirmResponseSchema = z.object({
  paymentId: z.string(),
  amount: KrwAmountSchema,
  paymentMethod: PaymentMethodSchema,
  cashBalanceAfter: KrwAmountSchema,
  confirmedAt: IsoDateTimeSchema,
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
  paymentId: z.string(),
  paymentKey: z.string(),
  amount: KrwAmountSchema,
});
export type DepositMockApproveResponse = z.infer<
  typeof DepositMockApproveResponseSchema
>;
