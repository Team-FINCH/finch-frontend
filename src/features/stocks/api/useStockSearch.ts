import { useQuery } from '@tanstack/react-query';

import { STOCK_SEARCH_MIN_KEYWORD_LENGTH } from '@/shared/config/apiContract';
import { queryKeys } from '@/shared/config/queryKeys';

import { getStockSearch } from './getStockSearch';

/**
 * 종목 검색 결과.
 *
 * **2글자 미만이면 호출하지 않는다** (`STOCK_SEARCH_MIN_KEYWORD_LENGTH`, apiSpec §5.1).
 * 서버가 400 으로 막지만 그것을 받아 에러 화면을 그리면 한 글자를 친 순간 빨간
 * 상태가 뜬다. 그 구간은 에러가 아니라 안내 문구 자리라서 `enabled` 로 끊는다.
 *
 * 검색어는 이미 디바운스된 값이 들어온다 (`useDebouncedValue`). 여기서 또 늦추지 않는다.
 */
export function useStockSearch(keyword: string) {
  const trimmed = keyword.trim();
  const isLongEnough = trimmed.length >= STOCK_SEARCH_MIN_KEYWORD_LENGTH;

  return useQuery({
    queryKey: queryKeys.stocks.search(trimmed),
    queryFn: ({ signal }) => getStockSearch(trimmed, signal),
    enabled: isLongEnough,
  });
}
