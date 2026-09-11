import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';

import {
  InboxListResponseSchema,
  type InboxListResponse,
} from '../model/types';

/**
 * `GET /inbox` — 알림함 목록 (apiSpec §6.4, v0.8.9).
 * 홈·포트폴리오·마이페이지 헤더의 뱃지와 알림함 화면(`/inbox`)이 같은 쿼리를 쓴다.
 *
 * **화면 진입 시 한 번이면 충분하다.** 폴링한다면 60초보다 짧게 부르지 않는다 —
 * 서버가 위키 조회 결과를 5분 재사용해서 짧게 불러도 결과가 거의 같다(§6.4).
 */
export function getInboxItems(
  signal?: AbortSignal,
): Promise<InboxListResponse> {
  return request(API_PATHS.inbox.list, {
    schema: InboxListResponseSchema,
    signal,
  });
}
