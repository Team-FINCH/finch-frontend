import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  DepositReadyResponseSchema,
  type DepositReadyRequest,
  type DepositReadyResponse,
} from '@/shared/types/deposit';

/**
 * 충전 1단계 — 결제 준비 (FINCH-35).
 * **멱등성 헤더를 쓰지 않는다.** 서버는 `ready`를 연달아 불러도 정리·거절하지 않고
 * 그냥 쌓는다 — 중복 호출 방어는 화면(버튼 잠금)의 몫이다.
 */
export function postDepositReady(
  body: DepositReadyRequest,
  signal?: AbortSignal,
): Promise<DepositReadyResponse> {
  return request(API_PATHS.deposits.ready, {
    method: 'POST',
    body,
    schema: DepositReadyResponseSchema,
    signal,
  });
}
