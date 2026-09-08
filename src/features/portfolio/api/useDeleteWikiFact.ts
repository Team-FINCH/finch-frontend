import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';
import { type WikiDeleteReason } from '@/shared/types/ai/wiki';

import { deleteWikiFact } from './deleteWikiFact';

/** 사실 삭제. 성공 후 `GET /wiki` 를 재조회한다 — `useUpdateWikiThesis.ts` 와 같은 이유. */
export function useDeleteWikiFact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      factId,
      reason,
    }: {
      factId: string;
      reason: WikiDeleteReason;
    }) => deleteWikiFact(factId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ai.wiki() });
    },
  });
}
