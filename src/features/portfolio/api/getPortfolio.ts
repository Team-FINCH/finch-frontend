import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  PortfolioResponseSchema,
  type PortfolioResponse,
  type PortfolioSort,
} from '@/shared/types/portfolio';

/**
 * `GET /portfolio?sort=` (apiSpec §8.1). 상단 자산 요약과 보유 목록이 한 응답에 온다.
 * 홈과 같은 쿼리 키를 공유하도록 설계됐다(ia.md §1 "홈·자산") — 이 함수를 홈 화면도
 * 그대로 재사용한다.
 */
export function getPortfolio(
  sort: PortfolioSort,
  signal?: AbortSignal,
): Promise<PortfolioResponse> {
  const query = new URLSearchParams({ sort }).toString();
  return request(`${API_PATHS.portfolio}?${query}`, {
    schema: PortfolioResponseSchema,
    signal,
  });
}
