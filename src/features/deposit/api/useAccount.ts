import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import { getAccount } from './getAccount';

/** 계좌 요약. 출금 화면의 "출금 가능 금액" 분모이자 충전 확정 뒤 잔고 표시에 쓴다. */
export function useAccount() {
  return useQuery({
    queryKey: queryKeys.account.summary(),
    queryFn: ({ signal }) => getAccount(signal),
  });
}
