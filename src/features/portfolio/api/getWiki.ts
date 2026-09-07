import { request, toAiResult, type AiResult } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import { WikiResponseSchema, type WikiContent } from '@/shared/types/ai/wiki';

/**
 * `GET /ai/wiki` (contracts C80). 사실·논지 목록. 처음엔 반드시 빈 배열이다(ia.md §1).
 * 재포장 응답을 `toAiResult`로 벗겨 화면 타입(`WikiContent` 필드가 최상위)으로 돌려준다.
 */
export function getWiki(signal?: AbortSignal): Promise<AiResult<WikiContent>> {
  return request(API_PATHS.ai.wiki.get, {
    schema: WikiResponseSchema,
    signal,
  }).then(toAiResult);
}
