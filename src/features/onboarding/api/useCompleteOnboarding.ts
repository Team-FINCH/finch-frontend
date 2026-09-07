import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import { markOnboardingDone } from '../lib/onboardingDone';

import { postWatchlistEntry } from './postWatchlistEntry';

/**
 * 고른 종목을 관심 목록에 담고 온보딩을 마친다.
 *
 * **한 종목이 실패해도 나머지는 담는다.** 다섯 개를 고른 사람이 하나의 실패로
 * 처음부터 다시 고르게 하면 온보딩을 이탈한다. 이미 담긴 종목이면 서버가
 * `WATCHLIST_ALREADY_EXISTS`(409) 로 답하는데(apiSpec §11.2) 그것도 사용자가
 * 원한 결과이므로 실패로 세지 않는다.
 *
 * 그래서 `Promise.allSettled` 다. 실패 건수만 돌려주고 화면이 문구를 정한다.
 */
export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stockCodes: readonly string[]) => {
      const results = await Promise.allSettled(
        stockCodes.map((stockCode) => postWatchlistEntry(stockCode)),
      );
      return {
        requested: stockCodes.length,
        failed: results.filter((result) => result.status === 'rejected').length,
      };
    },
    onSuccess: async () => {
      markOnboardingDone();
      // 홈이 관심 목록을 바로 그려야 한다. 무효화하지 않으면 방금 담은 종목이
      // 빈 목록으로 보인다.
      await queryClient.invalidateQueries({
        queryKey: queryKeys.watchlist.all(),
      });
    },
  });
}
