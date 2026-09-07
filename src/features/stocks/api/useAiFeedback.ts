import { useMutation } from '@tanstack/react-query';

import { type AiFeedbackRequest } from '@/shared/types/ai/feedback';

import { postAiFeedback } from './postAiFeedback';

/**
 * 피드백 전송. 캐시에 넣을 것이 없어 무효화하지 않는다 — 응답 본문은 `recorded: true`
 * 하나뿐이고 화면은 성공 여부만 본다 (contracts C62).
 *
 * 성공 상태는 뮤테이션 자신의 `isSuccess` 로 충분해서 별도 로컬 상태를 두지 않는다.
 */
export function useAiFeedback() {
  return useMutation({
    mutationFn: (body: AiFeedbackRequest) => postAiFeedback(body),
  });
}
