import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';
import { type PortfolioSort } from '@/shared/types/portfolio';

import { getPortfolio } from './getPortfolio';

const PORTFOLIO_STALE_TIME_MS = 30_000;

/**
 * 보유 종목·잔고 (apiSpec §8.1). `sort` 가 바뀌면 서버가 다시 정렬해 내려주므로
 * `sort` 를 쿼리 키에 포함한다 — 그러지 않으면 정렬을 바꿔도 이전 정렬의 캐시가 나온다.
 *
 * `staleTime` 30초 — 시세처럼 실시간은 아니지만 매매 직후 곧바로 반영돼야 해서
 * 종목 마스터보다는 짧게 잡는다.
 */
export function usePortfolio(sort: PortfolioSort) {
  return useQuery({
    queryKey: queryKeys.portfolio.summary(sort),
    queryFn: ({ signal }) => getPortfolio(sort, signal),
    staleTime: PORTFOLIO_STALE_TIME_MS,
  });
}
