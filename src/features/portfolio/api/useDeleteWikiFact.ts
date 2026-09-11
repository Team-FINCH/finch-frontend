import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';
import { showToast } from '@/shared/hooks/useToastStore';
import { type WikiDeleteReason } from '@/shared/types/ai/wiki';

import { deleteWikiFact } from './deleteWikiFact';

/**
 * 삭제 사유별 확인 문구 (FINCH-232, 이슈 #54 회신).
 * 같은 뮤테이션이 두 가지 행동을 나른다 — AI 추측을 물리는 것과 확정된 기준을
 * 지우는 것이다. 사용자가 누른 버튼이 다르므로 확인 문구도 갈라야 한다.
 */
const DELETED_TOAST_MESSAGE: Record<WikiDeleteReason, string> = {
  guess_rejected: '이 기준은 제외했어요.',
  user_deleted: '투자 기준을 삭제했어요.',
};

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
    onSuccess: (_data, { reason }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ai.wiki() });
      // 호출부(`WikiTab`)가 아니라 여기 붙인 이유 — 문구를 가르는 값이
      // `reason` 하나뿐이고 그것이 variables 에 있다. 호출부 둘에 나눠 적으면
      // 세 번째 호출부가 생겼을 때 빠뜨린다.
      showToast(DELETED_TOAST_MESSAGE[reason]);
    },
  });
}
