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
 * 실패 재시도는 기본 정책을 그대로 쓴다 — AI 에러는 대부분 4xx(409·422)라
 * `createQueryClient` 가 이미 재시도하지 않는다. 화면에 재시도 버튼을 낼지는
 * 코드로 갈린다 (`isRetryableAiErrorCode`, ia.md §4).
 */
export function useStockAnalysis(stockCode: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.ai.stockAnalysis(stockCode),
    queryFn: ({ signal }) => postStockAnalysis(stockCode, signal),
    enabled,
    staleTime: ANALYSIS_STALE_TIME_MS,
    gcTime: AI_GC_TIME_MS,
  });
}
