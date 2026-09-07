import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';

import {
  InboxListResponseSchema,
  type InboxListResponse,
} from '../model/types';

/**
 * 알림함 목록 조회 (추정 — `../model/types.ts` 머리 주석 참고).
 * 홈의 뱃지(미읽음 개수)와 알림함 화면(`/inbox`)이 같은 쿼리를 쓴다.
 */
export function getInboxItems(
  signal?: AbortSignal,
): Promise<InboxListResponse> {
  return request(API_PATHS.inbox.list, {
    schema: InboxListResponseSchema,
    signal,
  });
}
