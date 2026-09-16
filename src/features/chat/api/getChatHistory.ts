import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  AiChatHistorySchema,
  type AiChatHistory,
} from '@/shared/types/ai/chat';

/**
 * 대화 이력 조회 (`GET /ai/chat/conversations/{conversationId}/messages`,
 * AI 명세 §4.1 · FINCH-280). 채팅 화면 복귀 시 저장된 `conversationId` 로
 * 이 호출 하나만 나간다 — AI 중계 여섯 종과 같은 재포장 스키마(`createAiResponseSchema`)
 * 를 쓴다(`shared/types/ai/chat.ts` `AiChatHistorySchema` 주석).
 */
export function getChatHistory(
  conversationId: string,
  signal?: AbortSignal,
): Promise<AiChatHistory> {
  return request(API_PATHS.ai.chatMessages(conversationId), {
    schema: AiChatHistorySchema,
    signal,
  });
}
