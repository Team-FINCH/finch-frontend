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
 *
 * **알림함도 이 훅을 그대로 쓴다.** 매수 이유 저장은 `POST /ai/wiki/theses` 하나이고
 * 알림함 전용 저장 경로는 없다(apiSpec §6.4, v0.8.9). 그래서 `linkedTradeId` 를
 * 선택 인자로 열어 뒀다 — **타입은 문자열이다.** 알림함 `record` 항목의 체결 id 는
 * 숫자라 호출부가 문자열로 바꿔 넘긴다. 위키 탭은 넘길 값이 없어 보내지 않는다.
 *
 * `GET /inbox` 의 `record` 항목은 저장된 알림이 아니라 **보유 종목과 위키 논지를
 * 대조해 조회 때마다 계산**한 것이라, 논지가 생기면 별도 처리 없이 목록에서 빠진다.
 * 이 훅이 `GET /wiki` 만 무효화하고 알림함을 건드리지 않는 이유다 — 알림함 화면이
 * 생기면 그쪽에서 자기 쿼리 키를 함께 무효화하면 된다.
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
