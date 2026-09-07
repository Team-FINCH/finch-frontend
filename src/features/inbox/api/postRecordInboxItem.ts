import { requestNoContent } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';

import type { RecordInboxItemRequest } from '../model/types';

/**
 * 매수 이유 기록 제출 (추정 — `../model/types.ts` 머리 주석 참고).
 * "적어야 할 것" 항목(`kind: 'record'`)의 시트가 쓴다. 응답 본문을 정의하지 않고
 * 성공 후 목록을 재조회한다 — 위키 편집·삭제가 쓰는 것과 같은 패턴이다(ia.md §1).
 */
export function postRecordInboxItem(
  itemId: string,
  body: RecordInboxItemRequest,
  signal?: AbortSignal,
): Promise<void> {
  return requestNoContent(API_PATHS.inbox.record(itemId), {
    method: 'POST',
    body,
    signal,
  });
}
