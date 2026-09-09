import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';
import type { WatchlistSort } from '@/shared/types/stock';

import { getHomeWatchlist } from './getHomeWatchlist';

/**
 * 홈 "관심 종목" 미리보기 목록 (`GET /watchlist`, apiSpec §6.3).
 * 정렬값이 쿼리 키에 들어가므로 정렬을 바꿔도 이미 받아 둔 것은 다시 부르지 않는다.
 */
export function useHomeWatchlist(sort: WatchlistSort) {
  return useQuery({
    queryKey: queryKeys.watchlist.list(sort),
    queryFn: ({ signal }) => getHomeWatchlist(sort, signal),
  });
}
