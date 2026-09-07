import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  StockSearchResponseSchema,
  type StockSearchResponse,
} from '@/shared/types/stock';

/**
 * 온보딩 확장 목록의 검색 (apiSpec §5.1).
 *
 * **탐색 화면의 검색과 같은 엔드포인트다.** 탐색 화면 구현(`features/stocks`)이
 * `master` 에 들어오면 이 파일을 지우고 그쪽 호출을 쓴다 — 지금은 그 코드가
 * 다른 MR 에 있어 import 할 수 없다.
 *
 * 검색이 최근 검색어에 기록을 남기는 것(apiSpec §6.2)은 온보딩에서도 그대로다.
 * 서버가 그렇게 동작하고 프론트가 막을 수단이 없다.
 */
export function searchOnboardingStocks(
  keyword: string,
  signal?: AbortSignal,
): Promise<StockSearchResponse> {
  const query = new URLSearchParams({ keyword });
  return request(`${API_PATHS.stocks.search}?${query.toString()}`, {
    schema: StockSearchResponseSchema,
    signal,
  });
}
