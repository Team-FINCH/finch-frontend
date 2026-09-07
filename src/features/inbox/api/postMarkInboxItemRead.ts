import { requestNoContent } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';

/**
 * 읽음 처리 (추정 — `../model/types.ts` 머리 주석 참고). 응답 형식이 없으니
 * 204 로 가정한다. 목록을 항목 눌러 열 때마다 부른다.
 */
export function postMarkInboxItemRead(
  itemId: string,
  signal?: AbortSignal,
): Promise<void> {
  return requestNoContent(API_PATHS.inbox.read(itemId), {
    method: 'POST',
    signal,
  });
}
