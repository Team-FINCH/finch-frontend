import { request } from '@/shared/api';
import { API_PATHS, IDEMPOTENCY_KEY_HEADER } from '@/shared/config/apiContract';
import { type IdempotencyKey } from '@/shared/types/primitives';
import {
  WithdrawalResponseSchema,
  type WithdrawalRequest,
  type WithdrawalResponse,
} from '@/shared/types/withdrawal';

/**
 * 출금 (`ia.md` §1 "출금 화면"). `Idempotency-Key` 헤더가 **필수**다(C29·C86) —
 * 충전 확정과 반대다. 키는 호출부(`useWithdrawal`)가 클릭 단위로 만들어 넘긴다.
 */
export function postWithdrawal(
  body: WithdrawalRequest,
  idempotencyKey: IdempotencyKey,
  signal?: AbortSignal,
): Promise<WithdrawalResponse> {
  return request(API_PATHS.withdrawals.create, {
    method: 'POST',
    body,
    headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
    schema: WithdrawalResponseSchema,
    signal,
  });
}
