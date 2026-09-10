import { useQuery } from '@tanstack/react-query';

import { AI_GC_TIME_MS } from '@/shared/api';
import { queryKeys } from '@/shared/config/queryKeys';

import { getWiki } from './getWiki';

/**
 * "투자 기준" 탭(위키). AI 요청은 느려서 `staleTime` 을 길게 잡는다
 * (`frontConvention.md` §5 "AI 응답 처리 방침").
 *
 * `retry: false` — 실패 표시는 `AiStatus` 의 명시적 "다시 시도" 버튼(`refetch`)이
 * 맡는다. TanStack Query 기본 재시도(3회)와 겹치면 실패 화면이 뜨기 전에 조용히
 * 세 번 더 요청이 나간다.
 */
export function useWiki() {
  return useQuery({
    queryKey: queryKeys.ai.wiki(),
    queryFn: ({ signal }) => getWiki(signal),
    staleTime: 5 * 60_000,
    gcTime: AI_GC_TIME_MS,
    retry: false,
  });
}
