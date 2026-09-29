import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';
import { type DepositConfirmRequest } from '@/shared/types/deposit';

import { postDepositConfirm } from './postDepositConfirm';

/**
 * 충전 확정 뮤테이션. 결제 복귀 성공 화면과 모의 이체 화면 둘이 쓴다.
 * 만료된 결제에 다시 부르면 `DEPOSIT_NOT_APPROVED`·`DEPOSIT_PAYMENT_FAILED` 가
 * 오는데, 화면은 이 둘을 같은 만료 화면으로 묶는다 (`isDepositExpiredErrorCode`).
 *
 * **예수금을 실제로 늘리는 유일한 호출이라 성공하면 캐시를 무효화한다**
 * (FINCH-295). 사유는 `useWithdrawal` 과 같다 — 털지 않으면 충전을 마치고
 * 홈으로 가도 총자산이 충전 전 값으로 남는다.
 *
 * **출금과 달리 `deposits.limit` 까지 턴다.** 충전은 계정 누적 한도를 깎으므로
 * 잔여 한도가 함께 바뀐다(apiSpec §4.1). 다음 충전 화면이 옛 잔여 한도를 보여 주면
 * 화면이 통과시킨 금액을 서버가 거절한다.
 */
export function useDepositConfirm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: DepositConfirmRequest) =>
      postDepositConfirm(variables),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.account.all() });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.portfolio.all(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.transactions.all(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.deposits.all(),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.ai.orderPreviewAll(),
      });
    },
  });
}
