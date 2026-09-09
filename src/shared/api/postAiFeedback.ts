import { API_PATHS } from '@/shared/config/apiContract';
import {
  AiFeedbackResponseSchema,
  type AiFeedbackContent,
  type AiFeedbackRequest,
} from '@/shared/types/ai/feedback';

import { toAiResult, type AiResult } from './aiResponse';
import { request } from './httpClient';

/**
 * AI 응답 피드백 (apiSpec §10.1, `POST /ai/feedback`, contracts C3).
 *
 * **`requestId` 하나 = 피드백 슬롯 하나** (ia.md §4 "피드백 슬롯 배치 규칙").
 * 슬롯 컴포넌트(`shared/ui/AiFeedbackRow`)가 `requestId` 하나만 받아 동작하므로
 * 이 호출도 feature 가 아니라 여기 있다 — "feature 에 두면 여섯 곳에서 재구현된다"
 * (ia.md §5). `features/stocks` 와 `features/portfolio` 에 있던 두 벌을 합쳤다.
 *
 * **요청 본문 키도 camelCase 다** (이슈 #12 3번 회신, contracts C75) —
 * `request_id` 가 아니라 `requestId` 로 보낸다. 변환은 백엔드 중계가 맡는다.
 *
 * 같은 `requestId` 로 다시 보내면 마지막 값으로 덮어쓴다 (contracts C66).
 * 누적되지 않으므로 평가를 먼저 넣고 사유를 나중에 보태는 두 번 호출이 성립한다.
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
