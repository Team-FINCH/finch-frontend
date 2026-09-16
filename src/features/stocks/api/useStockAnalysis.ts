import { useQuery } from '@tanstack/react-query';

import { AI_GC_TIME_MS } from '@/shared/api';
import { queryKeys } from '@/shared/config/queryKeys';

import { postStockAnalysis } from './postStockAnalysis';

/** AI 분석은 비싸다. 탭을 오갈 때마다 다시 부르지 않게 캐시를 길게 잡는다. */
const ANALYSIS_STALE_TIME_MS = 5 * 60_000;

/**
 * 종목 AI 분석.
 *
 * **`enabled` 로 AI 탭에서만 부른다.** 차트 탭을 보고 있는 사람에게 AI 요금이
 * 나가면 안 되고, ia.md §4 도 슬롯을 "아직 요청 전" 과 "로딩" 으로 구분하라고 적었다.
 *
 * 뮤테이션이 아니라 쿼리인 이유는 `postStockAnalysis` 주석에 있다 — `POST` 지만 읽기다.
 * 쿼리로 두면 재시도 버튼이 `refetch()` 하나로 끝나고, 탭을 오갈 때 캐시가 산다.
 *
 * `retry: false` — 다른 AI 슬롯과 같은 이유다 (`usePortfolioDiagnosis.ts`).
 * 이 분석은 요청 한 번이 LLM 호출 최대 7회다. 전역 기본 정책(5xx 지수 백오프
 * 최대 2회)에 맡기면 504 한 번에 같은 요청이 두 번 더 나가고, GMS 는 타임아웃된
 * 호출도 과금한다(GitLab #89). 실패 표시와 재시도는 `AiStatus` 의 명시적 버튼이 맡는다.
 */
export function useStockAnalysis(stockCode: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.ai.stockAnalysis(stockCode),
    queryFn: ({ signal }) => postStockAnalysis(stockCode, signal),
    enabled,
    staleTime: ANALYSIS_STALE_TIME_MS,
    gcTime: AI_GC_TIME_MS,
    retry: false,
  });
}
