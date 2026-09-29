import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';
import { type IdempotencyKey } from '@/shared/types/primitives';
import { type WithdrawalRequest } from '@/shared/types/withdrawal';

import { postWithdrawal } from './postWithdrawal';

type Variables = {
  body: WithdrawalRequest;
  /**
   * 호출부(`WithdrawPage`)가 클릭 단위로 만들어 넘긴다 — 이 훅은 키를 스스로
   * 만들지 않는다. `IDEMPOTENCY_IN_PROGRESS` 뒤 재시도는 같은 키를 다시 넘기고,
   * 금액을 바꿔 새로 제출하면 호출부가 새 키를 만든다 (`shared/lib/idempotencyKey.ts`).
   */
  idempotencyKey: IdempotencyKey;
};

/**
 * 출금 뮤테이션.
 *
 * **성공하면 예수금이 걸린 캐시를 무효화한다** (FINCH-295). 없을 때는 출금이
 * 끝나고 홈으로 돌아가도 총자산이 이전 값 그대로였다 — 기본 `staleTime` 이 30초이고
 * `refetchOnWindowFocus` 가 꺼져 있어(`shared/api/queryClient.ts`) 화면을 옮기는
 * 것만으로는 다시 받지 않는다. 새로고침해야 바뀌는 것을 사용자는 "반영이 안 된다"
 * 로 읽는다.
 *
 * 터는 자리는 셋이다. 주문(`features/order/api/useCreateOrder.ts`)이 같은 이유로
 * 같은 셋을 털고 있고, 예수금을 움직이는 이 훅만 빠져 있었다.
 *
 * - `account` — 출금 화면의 출금 가능 금액이자 홈 총자산의 현금
 * - `portfolio` — 총자산에 현금이 들어간다. 보유 종목은 그대로여도 합계가 바뀐다
 * - `transactions` — 출금이 내역에 한 줄 쌓인다
 *
 * **입금 한도(`deposits.limit`)는 털지 않는다.** 출금해도 한도가 돌아오지 않는다
 * (`WithdrawPage` 의 안내 문구 · `design.md` "입금 한도는 돌아오지 않는다").
 * 바뀌지 않는 것을 무효화하면 화면을 열 때마다 헛요청이 하나 더 나간다.
 */
export function useWithdrawal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ body, idempotencyKey }: Variables) =>
      postWithdrawal(body, idempotencyKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.account.all() });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.portfolio.all(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.transactions.all(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.ai.orderPreviewAll(),
      });
    },
  });
}
