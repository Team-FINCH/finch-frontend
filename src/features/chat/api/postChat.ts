import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  AiChatResponseSchema,
  type AiChatRequest,
  type AiChatResponse,
} from '@/shared/types/ai/chat';

/**
 * AI 채팅 (`POST /ai/chat`, AI 명세 §4). **단발 요청/응답이다.** SSE 는 커밋
 * `34ed34a`(2026-08-20)로 폐기됐다 — `EventSource`·`ReadableStream` 파싱을 쓰지
 * 않는다(`frontConvention.md` §5 AI 응답 처리 방침).
 */
export function postChat(
  body: AiChatRequest,
  signal?: AbortSignal,
): Promise<AiChatResponse> {
  return request(API_PATHS.ai.chat, {
    method: 'POST',
    body,
    schema: AiChatResponseSchema,
    signal,
  });
}
