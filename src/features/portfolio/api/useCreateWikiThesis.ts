import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';
import { type CreateWikiThesisInput } from '@/shared/types/ai/wiki';
import { type StockCode } from '@/shared/types/primitives';

import { postWikiThesis } from './postWikiThesis';

type CreateWikiThesisVariables = CreateWikiThesisInput & {
  stockCode: StockCode;
};

/**
 * 논지 신규 기록. `useUpdateWikiThesis` 와 같은 결이다 — 성공 응답을 화면 상태로
 * 옮겨 쓰지 않고 `GET /wiki` 를 재조회한다(ia.md §1 "갱신 방식은 재조회로 정했다").
 * 신규 기록은 목록에 행이 하나 느는 것이라 낙관적 갱신으로 얻을 것이 더 적다.
 *
 * 호출하는 곳 — `features/portfolio/components/ThesisEditSheet.tsx`. 그 시트가
 * 신규와 수정을 같이 맡고 논지 유무로 이 훅과 `useUpdateWikiThesis` 를 가른다.
 * 갈라야 하는 이유는 `postWikiThesis.ts` 머리 주석을 본다.
 */
export function useCreateWikiThesis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ stockCode, ...body }: CreateWikiThesisVariables) =>
      postWikiThesis(stockCode, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ai.wiki() });
    },
  });
}
