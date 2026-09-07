import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import { getInboxItems } from './getInboxItems';

/**
 * 알림함 목록. 홈의 뱃지(미읽음 개수)와 알림함 화면이 함께 쓴다 — 같은 쿼리 키라
 * 홈에서 이미 받아 온 값을 알림함 화면이 다시 부르지 않고 캐시로 받는다.
 */
export function useInboxItems() {
  return useQuery({
    queryKey: queryKeys.inbox.list(),
    queryFn: ({ signal }) => getInboxItems(signal),
  });
}
