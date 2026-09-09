import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import { deleteRecentStock, getRecentStocks } from './getRecentStocks';

/** 최근 본 종목 (apiSpec §6.1). 검색 화면 초기 상태의 두 번째 묶음이다. */
export function useRecentStocks() {
  return useQuery({
    queryKey: queryKeys.stocks.recentStocks(),
    queryFn: ({ signal }) => getRecentStocks(signal),
  });
}

/**
 * 최근 본 종목 1건 삭제 (apiSpec §6.1). 프로토타입이 행마다 두는 `✕` 가 이것을 부른다.
 *
 * 전체 삭제는 묶지 않았다. `DELETE /stocks/recent` 자체는 계약에 있지만 프로토타입의
 * 최근 본 종목 머리에는 `전체 보기` 만 있고 `전체 삭제` 가 없다
 * (`prototype-diff-search.md` D절). 쓰는 자리가 생기면 그때 더한다.
 *
 * 낙관적 갱신을 하지 않는다 — 최근 검색어 삭제(`useDeleteRecentSearchKeyword`)와
 * 같은 이유다. 목록이 최대 30건이라 재조회가 롤백 코드보다 싸다.
 */
export function useDeleteRecentStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stockCode: string) => deleteRecentStock(stockCode),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.stocks.recentStocks(),
      }),
  });
}
