import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

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
 *
 * **검색이 성공하면 최근 검색어 목록을 무효화한다.** 이 호출 자체가 최근 검색어 기록이라
 * (`getStockSearch` 주석 · apiSpec §6.2) 서버가 `searchedAt` 을 갱신한다. 무효화하지
 * 않으면 검색을 마치고 탐색 상태로 돌아왔을 때 방금 친 검색어가 칩에 없다.
 * 프로토타입도 결과를 누르는 즉시 목록 맨 앞에 넣는다 (proto L3352).
 */
export function useStockSearch(keyword: string) {
  const trimmed = keyword.trim();
  const isLongEnough = trimmed.length >= STOCK_SEARCH_MIN_KEYWORD_LENGTH;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.stocks.search(trimmed),
    queryFn: ({ signal }) => getStockSearch(trimmed, signal),
    enabled: isLongEnough,
  });

  // `dataUpdatedAt` 을 함께 본다 — 검색어를 바꿔 성공이 이어지는 동안 `isSuccess` 는
  // 계속 true 라서 그것만 보면 두 번째 검색을 놓친다.
  const { isSuccess, dataUpdatedAt } = query;
  useEffect(() => {
    if (!isSuccess) {
      return;
    }
    void queryClient.invalidateQueries({
      queryKey: queryKeys.stocks.recentKeywords(),
    });
  }, [isSuccess, dataUpdatedAt, queryClient]);

  return query;
}
