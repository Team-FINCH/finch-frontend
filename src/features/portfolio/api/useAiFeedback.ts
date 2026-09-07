import { useMutation } from '@tanstack/react-query';

import { type AiFeedbackRequest } from '@/shared/types/ai/feedback';

import { postAiFeedback } from './postAiFeedback';

/**
 * 응답 피드백 전송. 캐시를 무효화할 대상이 없다 — 평가는 화면에 보이는 값을
 * 바꾸지 않고 접수만 된다(`FeedbackContent`가 `{recorded: true}` 하나뿐이다).
 * 재전송하면 같은 `requestId` 를 덮어쓰므로(contracts C66) 뮤테이션도 기본
 * 재시도 없음을 그대로 둔다 — 뮤테이션은 기본적으로 재시도하지 않는다(§5).
 */
export function useAiFeedback() {
  return useMutation({
    mutationFn: (body: AiFeedbackRequest) => postAiFeedback(body),
  });
}
