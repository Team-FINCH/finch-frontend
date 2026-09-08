import { useMutation } from '@tanstack/react-query';

import { type AiFeedbackRequest } from '@/shared/types/ai/feedback';

import { postFeedback } from './postFeedback';

/**
 * 피드백 뮤테이션. **같은 `requestId` 로 다시 보내면 마지막 값으로 덮어쓴다**
 * (contracts C66) — 화면은 전송 뒤에도 버튼을 계속 눌러 평가를 바꿀 수 있게 둔다.
 */
export function useFeedbackMutation() {
  return useMutation({
    mutationFn: (variables: AiFeedbackRequest) => postFeedback(variables),
  });
}
