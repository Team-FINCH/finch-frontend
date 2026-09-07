import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import { addWatchlist, removeWatchlist } from './toggleWatchlist';

type ToggleVariables = {
  stockCode: string;
  /** 지금 담겨 있는 상태. `true` 면 해제하고 `false` 면 담는다. */
  watched: boolean;
};

/**
 * 관심 종목 토글 (ia.md §3 "종목 상세 → 관심 종목 담기(홈에서 확인)").
 *
 * **낙관적 갱신을 하지 않는다.** 담기는 최대 50건(contracts C50)에서 거절될 수 있고
 * 그 판정은 서버만 안다. 별을 먼저 채웠다가 되돌리면 사용자는 자기가 누른 것이
 * 반영됐는지 아닌지를 두 번 확인해야 한다. 서버 응답 뒤에 상세를 무효화해
 * `watched` 를 다시 읽는 쪽이 정직하다.
 *
 * 관심 목록 자체(`queryKeys.watchlist`)도 함께 무효화한다 — 홈의 관심 종목 섹션이
 * 같은 데이터를 그리고 있어서, 상세에서 담고 홈으로 가면 목록에 없는 상태가 된다.
 *
 * 뮤테이션은 자동 재시도하지 않는다 (`createQueryClient` 기본값).
 */
export function useToggleWatchlist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stockCode, watched }: ToggleVariables) =>
      watched ? removeWatchlist(stockCode) : addWatchlist(stockCode),
    onSuccess: (_data, { stockCode }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.stocks.detail(stockCode),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.watchlist.all(),
      });
    },
  });
}
