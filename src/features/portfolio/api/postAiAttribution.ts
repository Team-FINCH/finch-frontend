import { request, toAiResult, type AiResult } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  AiAttributionResponseSchema,
  type AiAttributionContent,
} from '@/shared/types/ai/attribution';

/**
 * `POST /ai/portfolio/attribution` (AI 슬롯 2번, ia.md §4). `period` 를 생략하면
 * 서버 기본값 `1d` 다. `benchmark` 는 받기만 하고 쓰이지 않아 보내지 않는다(C56) —
 * 벤치마크 선택 UI 를 만들지 않는다.
 *
 * 보유 종목이 0개면 `409 INSUFFICIENT_DATA` 다(정상 거절, contracts C12).
 */
export function postAiAttribution(
  signal?: AbortSignal,
): Promise<AiResult<AiAttributionContent>> {
  return request(API_PATHS.ai.attribution, {
    method: 'POST',
    body: {},
    schema: AiAttributionResponseSchema,
    signal,
  }).then(toAiResult);
}
