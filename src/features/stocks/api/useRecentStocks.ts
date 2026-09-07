import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import { getRecentStocks } from './getRecentStocks';

/** 최근 본 종목 (apiSpec §6.1). 검색 화면 초기 상태의 두 번째 묶음이다. */
export function useRecentStocks() {
  return useQuery({
    queryKey: queryKeys.stocks.recentStocks(),
    queryFn: ({ signal }) => getRecentStocks(signal),
  });
}
