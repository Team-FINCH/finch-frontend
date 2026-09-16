import { useQuery } from '@tanstack/react-query';

import { AI_GC_TIME_MS } from '@/shared/api';
import { queryKeys } from '@/shared/config/queryKeys';
import { type AiAttributionPeriod } from '@/shared/types/ai/attribution';

import { postAiAttribution } from './postAiAttribution';

/**
 * `tab=cause` 탭(수익률 분석, AI 슬롯 2번).
 *
 * **지금 이 훅을 쓰는 화면은 포트폴리오 탭 하나뿐이다.** `screenDesign.md`(L256)가
 * 이 슬롯을 "홈, 포트폴리오 `?tab=cause`" 두 곳에 두기로 적어 뒀지만 홈은 아직
 * 붙지 않았다 — 전에 이 자리에 "홈 화면도 같은 슬롯을 쓴다"고 적혀 있던 것은 그
 * 계획을 현재형으로 옮겨 적은 것이었다. 홈이 붙으면 각 화면이 각자 요청하고 응답을
 * 받은 화면의 `requestId` 로 피드백을 붙인다(ia.md §4 "피드백 슬롯 배치 규칙").
 *
 * **기간이 키에 실린다.** `queryKeys.ai.attribution(period)` 가 처음부터 파라미터를
 * 받게 돼 있었고(쓰는 쪽이 `'1d'` 로 못 박고 있었을 뿐이다) 이제 실제로 채운다.
 * 그래서 기간을 오갔다가 돌아오면 캐시가 그대로 맞고 다시 부르지 않는다.
 *
 * `1d` 만 아침 배치가 미리 만들어 둔다 — 다른 기간을 처음 고르면 그 자리에서 LLM
 * 생성이 돌아 몇 초 걸린다. 그날 안에서는 서버도 캐시한다.
 *
 * `enabled` 매개변수의 의미는 `usePortfolioDiagnosis.ts` 와 같다 — 지금은 탭
 * 마운트가 게이팅을 대신한다.
 *
 * `retry: false` — `usePortfolioDiagnosis.ts` 와 같은 이유.
 */
export function usePortfolioAttribution(
  period: AiAttributionPeriod,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.ai.attribution(period),
    queryFn: ({ signal }) => postAiAttribution(period, signal),
    enabled,
    staleTime: 5 * 60_000,
    gcTime: AI_GC_TIME_MS,
    retry: false,
  });
}
