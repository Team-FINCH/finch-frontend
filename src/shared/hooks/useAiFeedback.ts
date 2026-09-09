import { useMutation } from '@tanstack/react-query';

import { postAiFeedback } from '@/shared/api';
import { type AiFeedbackRequest } from '@/shared/types/ai/feedback';

/**
 * 응답 피드백 전송. 캐시를 무효화할 대상이 없다 — 평가는 화면에 보이는 값을
 * 바꾸지 않고 접수만 된다(`AiFeedbackContent` 가 `{recorded: true}` 하나뿐이다,
 * contracts C62). 재전송하면 같은 `requestId` 를 덮어쓰므로(contracts C66)
 * 뮤테이션의 기본 재시도 없음을 그대로 둔다 (frontConvention §5).
 *
 * `shared/ui/AiFeedbackRow` 가 쓴다. feature 마다 같은 훅이 있던 것을 여기로 올렸다.
 */
export function useAiFeedback() {
  return useMutation({
    mutationFn: (body: AiFeedbackRequest) => postAiFeedback(body),
  });
}
