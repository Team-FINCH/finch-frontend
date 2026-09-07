import { request, toAiResult, type AiResult } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  AiDiagnosisResponseSchema,
  type AiDiagnosisContent,
} from '@/shared/types/ai/diagnosis';

/**
 * `POST /ai/portfolio/diagnosis` (AI 슬롯 5번, ia.md §4). 요청 본문이 정의돼 있지
 * 않다 — 사용자 식별은 헤더로만 하므로 본문에 넣을 것이 없다(`ai/diagnosis.ts`).
 * 보유 종목이 0개면 `409 INSUFFICIENT_DATA` 다(정상 거절, contracts C12).
 */
export function postAiDiagnosis(
  signal?: AbortSignal,
): Promise<AiResult<AiDiagnosisContent>> {
  return request(API_PATHS.ai.diagnosis, {
    method: 'POST',
    schema: AiDiagnosisResponseSchema,
    signal,
  }).then(toAiResult);
}
