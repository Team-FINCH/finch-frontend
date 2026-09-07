import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import type { RecordInboxItemRequest } from '../model/types';

import { postRecordInboxItem } from './postRecordInboxItem';

type SubmitArgs = { itemId: string; body: RecordInboxItemRequest };

/** 매수 이유 기록 시트의 저장 버튼. 성공하면 목록을 재조회한다. */
export function useSubmitInboxRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, body }: SubmitArgs) =>
      postRecordInboxItem(itemId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox.list() });
    },
  });
}
