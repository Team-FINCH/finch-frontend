import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import { getHomeWatchlist } from './getHomeWatchlist';

const SORT = 'REGISTERED';

/** 홈 "관심 종목" 미리보기 목록 (`GET /watchlist`, apiSpec §6.3). */
export function useHomeWatchlist() {
  return useQuery({
    queryKey: queryKeys.watchlist.list(SORT),
    queryFn: ({ signal }) => getHomeWatchlist(signal),
  });
}
