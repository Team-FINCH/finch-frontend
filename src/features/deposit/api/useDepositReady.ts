import { useMutation } from '@tanstack/react-query';

import { type DepositReadyRequest } from '@/shared/types/deposit';

import { postDepositReady } from './postDepositReady';

/**
 * 충전 1단계 뮤테이션.
 *
 * **중복 호출 방어는 이 훅을 쓰는 화면이 버튼 잠금으로 한다** — `mutation.isPending`
 * 동안 제출 버튼을 비활성화한다. 서버가 `ready` 재호출을 정리하지 않기 때문에
 * (`ia.md` §1), 자동 재시도까지 걸리면 중복 제출이 더 쉬워진다. 그래서
 * `createQueryClient`의 뮤테이션 기본값(`retry: false`)에 기대고 여기서 다시 켜지 않는다.
 */
export function useDepositReady() {
  return useMutation({
    mutationFn: (variables: DepositReadyRequest) => postDepositReady(variables),
  });
}
