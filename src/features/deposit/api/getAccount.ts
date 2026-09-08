import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  AccountSummaryResponseSchema,
  type AccountSummaryResponse,
} from '@/shared/types/account';

/**
 * 계좌 요약 조회 (apiSpec §3.1). 출금 화면이 출금 가능액(`cashBalance`)을 읽는 데 쓰고,
 * 결제 복귀·모의 이체 화면이 확정 뒤 잔고를 다시 확인하는 데도 쓴다.
 */
export function getAccount(
  signal?: AbortSignal,
): Promise<AccountSummaryResponse> {
  return request(API_PATHS.account.summary, {
    schema: AccountSummaryResponseSchema,
    signal,
  });
}
