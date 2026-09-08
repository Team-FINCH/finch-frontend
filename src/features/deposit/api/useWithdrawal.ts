import { useMutation } from '@tanstack/react-query';

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

/** 출금 뮤테이션. */
export function useWithdrawal() {
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: Variables) =>
      postWithdrawal(body, idempotencyKey),
  });
}
