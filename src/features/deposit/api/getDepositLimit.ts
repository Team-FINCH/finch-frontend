import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  DepositLimitResponseSchema,
  type DepositLimitResponse,
} from '@/shared/types/deposit';

/**
 * 충전 한도 조회 (apiSpec §4.1). 화면은 이 값을 그대로 쓰고 스스로 계산하지 않는다
 * (`ia.md` §1 "충전 화면").
 */
export function getDepositLimit(
  signal?: AbortSignal,
): Promise<DepositLimitResponse> {
  return request(API_PATHS.deposits.limit, {
    schema: DepositLimitResponseSchema,
    signal,
  });
}
