import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';
import { showToast } from '@/shared/hooks/useToastStore';

import { confirmWikiFact } from './confirmWikiFact';

/**
 * 추측 승격(`맞아요`). 성공 후 `GET /wiki` 를 재조회한다 — `useUpdateWikiThesis.ts`
 * 와 같은 이유로 낙관적 갱신을 하지 않는다. **여기서는 재조회가 특히 중요하다.**
 * 승격된 문장을 서버가 평서문으로 고쳐 돌려주므로(`confirmWikiFact.ts` 머리 주석)
 * 화면이 들고 있던 물음표 문장을 그대로 확정 목록에 옮기면 틀린 글이 뜬다.
 *
 * **알림함 목록도 함께 무효화한다.** 알림함의 `wiki` 항목은 저장된 알림이 아니라
 * "확인이 필요한 추측이 남아 있는가"로 조회 때마다 계산되는 값이라(프로토타입
 * `mail: facts.some(y=>y.guess) ? ... : ... filter(m=>m.type!=="wiki")`),
 * 마지막 추측을 승격하면 그 항목이 사라진다. 이것은 호출부의 사정이 아니라 이
 * 뮤테이션의 성질이라 훅에 둔다 — 호출부가 늘어도 빠뜨릴 자리가 없다.
 *
 * 토스트도 같은 이유로 여기 붙인다(`useDeleteWikiFact` 와 같은 결). 문구는
 * 프로토타입이 정본이다 — `투자 기준에 반영했어요.`
 */
export function useConfirmWikiFact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ factId }: { factId: string }) => confirmWikiFact(factId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ai.wiki() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.inbox.list() });
      showToast('투자 기준에 반영했어요.');
    },
  });
}
