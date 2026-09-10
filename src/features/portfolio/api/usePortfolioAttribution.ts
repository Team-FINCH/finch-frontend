import { useQuery } from '@tanstack/react-query';

import { AI_GC_TIME_MS } from '@/shared/api';
import { queryKeys } from '@/shared/config/queryKeys';

import { postAiAttribution } from './postAiAttribution';

/**
 * `tab=cause` 탭(수익률 분석, AI 슬롯 2번). 홈 화면도 같은 슬롯을 쓰지만 컴포넌트가
 * 하나이므로 각 화면이 각자 요청하고 응답을 받은 화면의 `requestId` 로 피드백을
 * 붙인다(ia.md §4 "피드백 슬롯 배치 규칙").
 *
 * `enabled` 매개변수의 의미는 `usePortfolioDiagnosis.ts` 와 같다 — 지금은 탭
 * 마운트가 게이팅을 대신한다.
 *
 * `retry: false` — `usePortfolioDiagnosis.ts` 와 같은 이유.
 */
export function usePortfolioAttribution(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.ai.attribution('1d'),
    queryFn: ({ signal }) => postAiAttribution(signal),
    enabled,
    staleTime: 5 * 60_000,
    gcTime: AI_GC_TIME_MS,
    retry: false,
  });
}
