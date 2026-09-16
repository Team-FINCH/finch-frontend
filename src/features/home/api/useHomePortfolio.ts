import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';
import { type PortfolioSort } from '@/shared/types/portfolio';

import { getHomePortfolio } from './getHomePortfolio';

/**
 * 홈 "내 종목" 미리보기의 보유 목록 (`GET /portfolio?sort=`, apiSpec §8.1).
 * `sort` 가 바뀌면 서버가 다시 정렬해 내려주므로 쿼리 키에 포함한다 — `/portfolio`
 * 화면과 같은 키 팩토리를 쓴다(`queryKeys.portfolio.summary`). 홈 기본값이
 * `EVALUATION` 으로 그 화면의 기본 정렬과 같아진 뒤로는, 두 화면 다 기본 정렬
 * 그대로인 동안은 캐시를 나눠 쓴다 — 어느 한쪽에서든 정렬 칩을 바꾸면 그 순간부터
 * 쿼리 키가 갈라져 다시 나뉜다.
 */
export function useHomePortfolio(sort: PortfolioSort) {
  return useQuery({
    queryKey: queryKeys.portfolio.summary(sort),
    queryFn: ({ signal }) => getHomePortfolio(sort, signal),
  });
}
