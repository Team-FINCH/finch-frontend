import { useInfiniteQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';
import { type TransactionFilter } from '@/shared/types/portfolio';

import { getTransactions } from './getTransactions';

/**
 * 매매 내역 목록. `useInfiniteQuery`로 다루고 `hasNext`로 종료를 판정한다 —
 * `items.length`로 판정하지 않는다(`frontConvention.md` §5 "커서 페이징").
 *
 * 커서는 URL에 두지 않는다 — 불투명 문자열이고 목록은 최신순이라 공유해도 같은
 * 화면이 나오지 않는다(§4 "URL 상태"). `type` 필터만 쿼리 키·URL 양쪽에 싣는다.
 */
export function useTransactions(type: TransactionFilter) {
  return useInfiniteQuery({
    queryKey: queryKeys.transactions.list(type),
    queryFn: ({ pageParam, signal }) =>
      getTransactions(type, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasNext ? lastPage.nextCursor : undefined,
  });
}
