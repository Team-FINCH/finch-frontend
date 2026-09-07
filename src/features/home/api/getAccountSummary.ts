import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  AccountSummaryResponseSchema,
  type AccountSummaryResponse,
} from '@/shared/types/account';

/**
 * 계좌 요약 조회 (apiSpec §3.1). 홈의 총자산 블록이 쓴다.
 * 계좌는 사용자당 하나라 식별자를 받지도 보내지도 않는다.
 */
export function getAccountSummary(
  signal?: AbortSignal,
): Promise<AccountSummaryResponse> {
  return request(API_PATHS.account.summary, {
    schema: AccountSummaryResponseSchema,
    signal,
  });
}
