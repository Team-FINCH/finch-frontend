import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { queryKeys } from '@/shared/config/queryKeys';

import { getStockDetail } from './getStockDetail';

/**
 * 종목 상세.
 *
 * **성공하면 최근 본 종목 목록을 무효화한다** — 이 GET 이 서버에 기록을 남기기
 * 때문이다 (contracts C51). `onSuccess` 콜백은 v5 에서 `useQuery` 에 없으므로
 * `isSuccess` 를 보는 이펙트로 처리한다.
 *
 * 무효화 조건을 `data` 가 아니라 `dataUpdatedAt` 으로 잡은 이유 — 같은 종목을 다시
 * 열면 `data` 의 참조가 캐시라 바뀌지 않아 이펙트가 안 돈다. 그래도 서버에는 새
 * 기록이 남았으므로 목록은 갱신돼야 한다.
 */
export function useStockDetail(stockCode: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.stocks.detail(stockCode),
    queryFn: ({ signal }) => getStockDetail(stockCode, signal),
  });

  const { isSuccess, dataUpdatedAt } = query;

  useEffect(() => {
    if (!isSuccess) {
      return;
    }
    void queryClient.invalidateQueries({
      queryKey: queryKeys.stocks.recentStocks(),
    });
  }, [isSuccess, dataUpdatedAt, queryClient]);

  return query;
}
