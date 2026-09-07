import { request, toAiResult, type AiResult } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  AiFeedbackResponseSchema,
  type AiFeedbackContent,
  type AiFeedbackRequest,
} from '@/shared/types/ai/feedback';

/**
 * `POST /ai/feedback` (contracts C3). `requestId` 하나 = 피드백 슬롯 하나 —
 * 원인 분석 블록 하단이 그 세 확정 자리 중 하나다(ia.md §4 "피드백 슬롯 배치 규칙").
 */
export function postAiFeedback(
  body: AiFeedbackRequest,
  signal?: AbortSignal,
): Promise<AiResult<AiFeedbackContent>> {
  return request(API_PATHS.ai.feedback, {
    method: 'POST',
    body,
    schema: AiFeedbackResponseSchema,
    signal,
  }).then(toAiResult);
}
