import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import { getChatHistory } from './getChatHistory';

/**
 * 대화 이력 조회 (FINCH-278). 뮤테이션이 아니라 쿼리다 — 화면 복귀 시
 * 한 번 읽으면 그만인 값이고, 실패하면 빈 상태로 떨어뜨리는 것으로 충분해
 * 재시도·재발급 정책을 따로 두지 않고 기본 쿼리 정책(`createQueryClient`)에
 * 맡긴다.
 *
 * `conversationId` 가 `null` 이면(저장된 대화가 없거나 `localStorage` 를 읽지
 * 못함) 아예 부르지 않는다 — 그것도 정상 상태다(`enabled`).
 */
export function useChatHistoryQuery(conversationId: string | null) {
  return useQuery({
    queryKey: queryKeys.ai.chatHistory(conversationId ?? ''),
    queryFn: ({ signal }) => getChatHistory(conversationId as string, signal),
    enabled: conversationId !== null,
  });
}
