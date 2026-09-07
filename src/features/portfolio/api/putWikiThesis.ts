import { request, toAiResult, type AiResult } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  UpdateWikiThesisResponseSchema,
  type UpdateWikiThesisRequest,
  type WikiThesis,
} from '@/shared/types/ai/wiki';

/**
 * `PUT /ai/wiki/theses/{stockCode}` (contracts C80). 논지 수정.
 *
 * **지금 화면의 어느 버튼도 이 함수를 직접 호출하지 않는다.** ia.md §1이 프로토타입
 * 실측으로 확정한 "기록 수정하기" 버튼의 실제 동작은 인라인 편집이 아니라 알림함
 * (`/inbox`)으로 이동하는 것이다 — 계약(`PUT .../theses/{stockCode}`)과 프로토타입
 * UI가 이 지점에서 갈리고, "컴포넌트는 하나이므로 동작도 한 곳에만" 있으면 된다는
 * 원칙에 따라 프로토타입 쪽을 택했다. 이 함수는 계약이 확정돼 있고 목도 구현돼 있어
 * (`mocks/handlers/wiki.ts`) 인라인 편집 UI가 붙을 때 바로 쓸 수 있도록 남겨 둔다.
 */
export function putWikiThesis(
  stockCode: string,
  body: UpdateWikiThesisRequest,
  signal?: AbortSignal,
): Promise<AiResult<WikiThesis>> {
  return request(API_PATHS.ai.wiki.updateThesis(stockCode), {
    method: 'PUT',
    body,
    schema: UpdateWikiThesisResponseSchema,
    signal,
  }).then(toAiResult);
}
