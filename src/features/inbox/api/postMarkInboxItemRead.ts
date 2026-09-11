import { requestNoContent } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';

/**
 * `POST /inbox/{itemId}/read` — 읽음 표시 (apiSpec §6.4, v0.8.9). 응답은 `204` 다.
 *
 * **멱등이다.** 이미 읽은 항목·목록에 없는 항목·논지가 생겨 빠진 지난 항목도 `204` 라
 * 실패 갈래를 따로 그리지 않는다.
 *
 * **읽음은 뱃지를 끄는 것뿐이다.** 항목을 목록에서 없애지 않는다 — `record` 항목이
 * 사라지는 것은 그 종목에 `active` 논지가 생겼을 때이고 서버가 조회 때마다 계산한다.
 *
 * `itemId` 는 불투명 문자열이라 손대지 않고 그대로 돌려보낸다.
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
