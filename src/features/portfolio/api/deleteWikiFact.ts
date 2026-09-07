import { request, toAiResult, type AiResult } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  DeleteWikiFactResponseSchema,
  type DeletedFactContent,
} from '@/shared/types/ai/wiki';

/**
 * `DELETE /ai/wiki/facts/{factId}` (contracts C80). "즉시 이후 모든 응답에서
 * 제외된다"가 명세라(AI 명세 §9) 되돌리기를 만들지 않고 삭제 확인을 받는다(ia.md §1).
 */
export function deleteWikiFact(
  factId: string,
  signal?: AbortSignal,
): Promise<AiResult<DeletedFactContent>> {
  return request(API_PATHS.ai.wiki.deleteFact(factId), {
    method: 'DELETE',
    schema: DeleteWikiFactResponseSchema,
    signal,
  }).then(toAiResult);
}
