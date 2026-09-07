import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import { getHomePortfolio } from './getHomePortfolio';

/** 홈 "내 종목" 미리보기의 보유 목록 (`GET /portfolio`, apiSpec §8.1). */
export function useHomePortfolio() {
  return useQuery({
    queryKey: queryKeys.portfolio.summary(),
    queryFn: ({ signal }) => getHomePortfolio(signal),
  });
}
