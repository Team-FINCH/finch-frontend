import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';
import { type PortfolioSort } from '@/shared/types/portfolio';

import { getHomePortfolio } from './getHomePortfolio';

/**
 * 홈 "내 종목" 미리보기의 보유 목록 (`GET /portfolio?sort=`, apiSpec §8.1).
 * `sort` 가 바뀌면 서버가 다시 정렬해 내려주므로 쿼리 키에 포함한다 — `/portfolio`
 * 화면과 같은 키 팩토리를 쓰지만(`queryKeys.portfolio.summary`) 기본 정렬이 서로
 * 달라(홈 `PROFIT_RATE` · 그 화면 `EVALUATION`) 보통은 캐시를 나눠 쓰지 않는다.
 */
export function useHomePortfolio(sort: PortfolioSort) {
  return useQuery({
    queryKey: queryKeys.portfolio.summary(sort),
    queryFn: ({ signal }) => getHomePortfolio(sort, signal),
  });
}
