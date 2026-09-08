import { request, toAiResult, type AiResult } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  DeleteWikiFactResponseSchema,
  type DeletedFactContent,
  type WikiDeleteReason,
} from '@/shared/types/ai/wiki';

/**
 * `DELETE /ai/wiki/facts/{factId}?reason=` (contracts C80). "즉시 이후 모든 응답에서
 * 제외된다"가 명세라(AI 명세 §9) 되돌리기를 만들지 않고 삭제 확인을 받는다(ia.md §1).
 *
 * **`reason` 으로 두 흐름을 구분한다** (MR !140). 확정된 사실을 지우는 것과 AI
 * 추측에 "아니에요" 라고 답하는 것은 사용자에게 다른 행동이고, 서버가 그 분포로
 * 추측 품질을 본다. 선택 파라미터라 안 실어도 되지만 우리는 항상 싣는다 —
 * 어느 쪽인지 화면이 알고 있는데 굳이 버릴 이유가 없다.
 */
export function deleteWikiFact(
  factId: string,
  reason: WikiDeleteReason,
  signal?: AbortSignal,
): Promise<AiResult<DeletedFactContent>> {
  const query = new URLSearchParams({ reason }).toString();
  return request(`${API_PATHS.ai.wiki.deleteFact(factId)}?${query}`, {
    method: 'DELETE',
    schema: DeleteWikiFactResponseSchema,
    signal,
  }).then(toAiResult);
}
