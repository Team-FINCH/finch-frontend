import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import { getDepositLimit } from './getDepositLimit';

/** 충전 한도. 1회·계정 누적 한도와 잔여 한도를 그대로 내려받는다. */
export function useDepositLimit() {
  return useQuery({
    queryKey: queryKeys.deposits.limit(),
    queryFn: ({ signal }) => getDepositLimit(signal),
  });
}
