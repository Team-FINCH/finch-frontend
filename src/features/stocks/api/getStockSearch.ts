import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  StockSearchResponseSchema,
  type StockSearchResponse,
} from '@/shared/types/stock';

/**
 * 종목 검색 (apiSpec §5.1).
 *
 * **이 호출 자체가 최근 검색어 기록이다.** 별도 등록 API 가 없어서 검색이 성공하면
 * 서버가 `searchedAt` 을 갱신한다 — 결과가 0건이어도 기록된다. 저장되는 것은 종목이
 * 아니라 문자열이라서다 (apiSpec §6.2, 이슈 #23 2번 회신).
 * 그래서 호출부는 성공 뒤에 최근 검색어 쿼리를 무효화해야 한다.
 *
 * `size` 를 넘기지 않는다. 서버 기본값을 쓰고 화면이 페이지 크기를 정하지 않는다.
 */
export function getStockSearch(
  keyword: string,
  signal?: AbortSignal,
): Promise<StockSearchResponse> {
  const query = new URLSearchParams({ keyword });
  return request(`${API_PATHS.stocks.search}?${query.toString()}`, {
    schema: StockSearchResponseSchema,
    signal,
  });
}
