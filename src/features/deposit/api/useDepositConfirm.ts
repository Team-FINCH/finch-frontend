import { useMutation } from '@tanstack/react-query';

import { type DepositConfirmRequest } from '@/shared/types/deposit';

import { postDepositConfirm } from './postDepositConfirm';

/**
 * 충전 확정 뮤테이션. 결제 복귀 성공 화면과 모의 이체 화면 둘이 쓴다.
 * 만료된 결제에 다시 부르면 `DEPOSIT_NOT_APPROVED`·`DEPOSIT_PAYMENT_FAILED` 가
 * 오는데, 화면은 이 둘을 같은 만료 화면으로 묶는다 (`isDepositExpiredErrorCode`).
 */
export function useDepositConfirm() {
  return useMutation({
    mutationFn: (variables: DepositConfirmRequest) =>
      postDepositConfirm(variables),
  });
}
