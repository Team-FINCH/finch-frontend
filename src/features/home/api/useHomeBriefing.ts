import { useQuery } from '@tanstack/react-query';

import { AI_GC_TIME_MS } from '@/shared/api';
import { queryKeys } from '@/shared/config/queryKeys';

import { getHomeBriefing } from './getHomeBriefing';

/** 다른 AI 슬롯 다섯과 같은 값이다. */
const BRIEFING_STALE_TIME_MS = 5 * 60_000;

/**
 * 데일리 브리핑 (AI 슬롯 1번, `GET /ai/briefing`). 홈의 브리핑 블록과
 * 브리핑 전체 화면(`/briefing`)이 함께 쓴다 — 같은 쿼리 키라 홈에서 이미
 * 받아 온 값을 브리핑 전체 화면이 다시 부르지 않고 캐시로 받는다.
 *
 * `staleTime` 5분 — "AI 요청은 느리다. `staleTime` 을 길게 잡고 화면 진입마다
 * 다시 부르지 않는다"(`docs/frontConvention.md:332`, §5 "AI 응답 처리 방침").
 * 전역 기본값 30초를 그대로 쓰면 `refetchOnMount` 기본값 `true` 와 겹쳐 캐시가
 * 30초 안에서만 산다. 홈은 탭바의 착지 화면이라 탭을 오갈 때마다 마운트되고,
 * 홈 ↔ 브리핑 전체 왕복도 같은 키를 다시 마운트한다.
 *
 * `gcTime` 은 AI 공통값을 쓴다. 왜 `staleTime` 보다 길어야 하는지는
 * `shared/api/aiCacheTime.ts` 에 적었다.
 *
 * `retry: false` — 다른 AI 슬롯과 같은 이유다 (`usePortfolioDiagnosis.ts`).
 * 이 브리핑은 요청 한 번이 LLM 호출 최대 4회다. 전역 기본 정책(5xx 지수 백오프
 * 최대 2회)에 맡기면 504 한 번에 같은 요청이 두 번 더 나가고, GMS 는 타임아웃된
 * 호출도 과금한다(GitLab #89). 실패 표시와 재시도는 `AiStatus` 의 명시적 버튼이 맡는다.
 */
export function useHomeBriefing() {
  return useQuery({
    queryKey: queryKeys.ai.briefing(),
    queryFn: ({ signal }) => getHomeBriefing(signal),
    staleTime: BRIEFING_STALE_TIME_MS,
    gcTime: AI_GC_TIME_MS,
    retry: false,
  });
}
