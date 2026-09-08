import { useMutation } from '@tanstack/react-query';

import { type DepositMockApproveRequest } from '@/shared/types/deposit';

import { postDepositMockApprove } from './postDepositMockApprove';

type Variables = { paymentId: string; body: DepositMockApproveRequest };

/** 모의 이체 승인 흉내 뮤테이션. */
export function useDepositMockApprove() {
  return useMutation({
    mutationFn: ({ paymentId, body }: Variables) =>
      postDepositMockApprove(paymentId, body),
  });
}
