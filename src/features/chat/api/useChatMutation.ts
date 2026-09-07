import { useMutation } from '@tanstack/react-query';

import { type AiChatRequest } from '@/shared/types/ai/chat';

import { postChat } from './postChat';

/**
 * AI 채팅 뮤테이션. 쿼리가 아니라 뮤테이션인 이유는 `useKakaoLogin` 과 같다 —
 * 자동 재시도·리페치가 대화 순서를 어긋나게 만든다. `createQueryClient` 의
 * 뮤테이션 기본값(`retry: false`)에 기댄다.
 */
export function useChatMutation() {
  return useMutation({
    mutationFn: (variables: AiChatRequest) => postChat(variables),
  });
}
