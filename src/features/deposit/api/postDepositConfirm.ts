import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  DepositConfirmResponseSchema,
  type DepositConfirmRequest,
  type DepositConfirmResponse,
} from '@/shared/types/deposit';

/**
 * 충전 4단계 — 확정. 예수금을 실제로 늘리는 유일한 호출이다 (`ia.md` §1).
 * `Idempotency-Key` 헤더를 쓰지 않는다 — 멱등 기준은 `paymentKey` 다(C29·C85).
 */
export function postDepositConfirm(
  body: DepositConfirmRequest,
  signal?: AbortSignal,
): Promise<DepositConfirmResponse> {
  return request(API_PATHS.deposits.confirm, {
    method: 'POST',
    body,
    schema: DepositConfirmResponseSchema,
    signal,
  });
}
