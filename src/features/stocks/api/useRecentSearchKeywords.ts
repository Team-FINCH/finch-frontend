import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import {
  deleteAllRecentSearchKeywords,
  deleteRecentSearchKeyword,
  getRecentSearchKeywords,
} from './getRecentSearchKeywords';

/** 최근 검색어 목록 (apiSpec §6.2). 검색 화면의 초기 상태가 이것을 그린다 (ia.md §1). */
export function useRecentSearchKeywords() {
  return useQuery({
    queryKey: queryKeys.stocks.recentKeywords(),
    queryFn: ({ signal }) => getRecentSearchKeywords(signal),
  });
}

/**
 * 최근 검색어 삭제. 1건과 전체를 한 훅으로 묶었다 — 무효화 대상이 같은 목록 하나고,
 * 화면에서도 칩의 ✕ 와 "전체 삭제" 가 나란히 있다.
 *
 * 낙관적 갱신을 하지 않는다. 삭제는 되돌릴 일이 드물고, 목록이 최대 10건이라
 * 재조회 비용이 낙관적 갱신의 롤백 코드보다 싸다.
 */
export function useDeleteRecentSearchKeyword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keywordId: number | 'all') =>
      keywordId === 'all'
        ? deleteAllRecentSearchKeywords()
        : deleteRecentSearchKeyword(keywordId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.stocks.recentKeywords(),
      }),
  });
}
