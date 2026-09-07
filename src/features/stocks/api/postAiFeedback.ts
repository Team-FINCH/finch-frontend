import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  AiFeedbackResponseSchema,
  type AiFeedbackRequest,
  type AiFeedbackResponse,
} from '@/shared/types/ai/feedback';

/**
 * AI 응답 피드백 (apiSpec §10.1, `POST /ai/feedback`).
 *
 * **요청 본문 키도 camelCase 다** (이슈 #12 3번 회신, contracts C75) —
 * `request_id` 가 아니라 `requestId` 로 보낸다. 변환은 백엔드 중계가 맡는다.
 *
 * 같은 `requestId` 로 다시 보내면 마지막 값으로 덮어쓴다 (contracts C66).
 * 누적되지 않으므로 화면이 재전송을 막을 계약상 이유는 없다.
 */
export function postAiFeedback(
  body: AiFeedbackRequest,
): Promise<AiFeedbackResponse> {
  return request(API_PATHS.ai.feedback, {
    method: 'POST',
    body,
    schema: AiFeedbackResponseSchema,
  });
}
