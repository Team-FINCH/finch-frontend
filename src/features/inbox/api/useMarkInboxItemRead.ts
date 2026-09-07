import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import { postMarkInboxItemRead } from './postMarkInboxItemRead';

/** 항목을 열 때 읽음 처리한다. 성공하면 목록을 재조회해 미읽음 점·뱃지 숫자를 낮춘다. */
export function useMarkInboxItemRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => postMarkInboxItemRead(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox.list() });
    },
  });
}
