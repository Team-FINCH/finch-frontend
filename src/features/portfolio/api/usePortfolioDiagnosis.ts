import { useQuery } from '@tanstack/react-query';

import { AI_GC_TIME_MS } from '@/shared/api';
import { queryKeys } from '@/shared/config/queryKeys';

import { postAiDiagnosis } from './postAiDiagnosis';

/**
 * `tab=diagnosis` 탭 (AI 슬롯 5번).
 *
 * `enabled` 를 받지만 지금 호출부(`DiagnosisTab`)는 항상 `true` 를 넘긴다 —
 * `PortfolioPage` 가 선택된 탭의 컴포넌트만 마운트하므로 그 마운트 자체가 게이팅
 * 역할을 한다(다른 탭에 있는 동안은 이 훅이 호출되지 않는다). 매개변수는 나중에
 * 네 탭을 동시에 마운트해 둔 채 전환하는 방식으로 바뀔 때를 대비해 남겨 둔다.
 *
 * `retry: false` — `AiStatus` 의 명시적 "다시 시도"가 재시도를 맡는다
 * (`useWiki.ts` 와 같은 이유).
 */
export function usePortfolioDiagnosis(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.ai.diagnosis(),
    queryFn: ({ signal }) => postAiDiagnosis(signal),
    enabled,
    staleTime: 5 * 60_000,
    gcTime: AI_GC_TIME_MS,
    retry: false,
  });
}
