import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  AiFeedbackResponseSchema,
  type AiFeedbackRequest,
  type AiFeedbackResponse,
} from '@/shared/types/ai/feedback';

/**
 * AI 응답 피드백 (`POST /ai/feedback`, AI 명세 §10).
 * `requestId` 하나 = Feedback Slot 하나(design.md §9) — 채팅은 답변 말풍선마다
 * `requestId` 가 다르므로 말풍선마다 이 호출이 따로 붙는다.
 */
export function postFeedback(
  body: AiFeedbackRequest,
  signal?: AbortSignal,
): Promise<AiFeedbackResponse> {
  return request(API_PATHS.ai.feedback, {
    method: 'POST',
    body,
    schema: AiFeedbackResponseSchema,
    signal,
  });
}
