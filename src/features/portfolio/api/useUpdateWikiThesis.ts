import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';
import { type UpdateWikiThesisRequest } from '@/shared/types/ai/wiki';

import { putWikiThesis } from './putWikiThesis';

type UpdateWikiThesisVariables = UpdateWikiThesisRequest & {
  stockCode: string;
};

/**
 * 논지 수정. 성공 응답을 화면 상태로 옮겨 쓰지 않고 `GET /wiki` 를 재조회한다 —
 * ia.md §1 "갱신 방식은 재조회로 정했다"의 결정을 그대로 따른다. 되돌릴 범위가
 * 쿼리 무효화 한 줄이라 가장 싸고, 값이 확정된 뒤에도 굳이 낙관적 갱신으로 바꿀
 * 이유가 생기지 않았다.
 *
 * 지금 UI 에서 호출하는 곳은 없다 — `putWikiThesis.ts` 머리 주석을 본다.
 */
export function useUpdateWikiThesis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stockCode, ...body }: UpdateWikiThesisVariables) =>
      putWikiThesis(stockCode, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ai.wiki() });
    },
  });
}
