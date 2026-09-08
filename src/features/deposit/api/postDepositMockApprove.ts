import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  DepositMockApproveResponseSchema,
  type DepositMockApproveRequest,
  type DepositMockApproveResponse,
} from '@/shared/types/deposit';

/**
 * 충전 3단계 — 모의 이체 승인 흉내 (`TRANSFER` 전용). 이어서 `confirm` 을 부르는
 * 재료(`paymentKey`)를 받는다. **두 번 부르는 것이 정상 흐름이다** (`ia.md` §1).
 */
export function postDepositMockApprove(
  paymentId: string,
  body: DepositMockApproveRequest,
  signal?: AbortSignal,
): Promise<DepositMockApproveResponse> {
  return request(API_PATHS.deposits.mockApprove(paymentId), {
    method: 'POST',
    body,
    schema: DepositMockApproveResponseSchema,
    signal,
  });
}
