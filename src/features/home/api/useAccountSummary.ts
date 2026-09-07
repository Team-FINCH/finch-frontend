import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import { getAccountSummary } from './getAccountSummary';

/** 홈 총자산 블록의 계좌 요약 (`GET /account`, apiSpec §3.1). */
export function useAccountSummary() {
  return useQuery({
    queryKey: queryKeys.account.summary(),
    queryFn: ({ signal }) => getAccountSummary(signal),
  });
}
