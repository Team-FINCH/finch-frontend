import { useQuery } from '@tanstack/react-query';

import { STOCK_SEARCH_MIN_KEYWORD_LENGTH } from '@/shared/config/apiContract';
import { queryKeys } from '@/shared/config/queryKeys';

import { searchOnboardingStocks } from './searchOnboardingStocks';

/**
 * 온보딩 검색. 두 글자 미만이면 호출하지 않는다 —
 * 서버가 `INVALID_REQUEST` 로 답하고(apiSpec §11.2) 검색어 기록만 남는다.
 */
export function useOnboardingSearch(keyword: string) {
  const trimmed = keyword.trim();
  return useQuery({
    queryKey: queryKeys.stocks.search(trimmed),
    queryFn: ({ signal }) => searchOnboardingStocks(trimmed, signal),
    enabled: trimmed.length >= STOCK_SEARCH_MIN_KEYWORD_LENGTH,
  });
}
