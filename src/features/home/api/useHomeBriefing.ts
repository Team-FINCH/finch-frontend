import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import { getHomeBriefing } from './getHomeBriefing';

/**
 * 데일리 브리핑 (AI 슬롯 1번, `GET /ai/briefing`). 홈의 브리핑 블록과
 * 브리핑 전체 화면(`/briefing`)이 함께 쓴다 — 같은 쿼리 키라 홈에서 이미
 * 받아 온 값을 브리핑 전체 화면이 다시 부르지 않고 캐시로 받는다.
 */
export function useHomeBriefing() {
  return useQuery({
    queryKey: queryKeys.ai.briefing(),
    queryFn: ({ signal }) => getHomeBriefing(signal),
  });
}
