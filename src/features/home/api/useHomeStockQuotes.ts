import { useQuoteSubscription } from '@/shared/api';
import { STOCK_PRICES_MAX_CODES } from '@/shared/config/apiContract';
import { queryKeys } from '@/shared/config/queryKeys';

import { getHomeStockQuotes } from './getHomeStockQuotes';

/**
 * 홈 미리보기(내 종목·관심 종목)의 시세 구독 (apiSpec §5.5 · contracts C34·C41).
 *
 * 안쪽은 `useQuoteSubscription` 이다 — 홈은 미리보기 몇 줄만 보여주므로 목록 티어
 * (`list`)로 구독한다. 폴링 주기·`staleTime` 은 그 안에 있고 여기는 출처만 댄다.
 *
 * `stockCodes` 가 비어 있으면(보유·관심 종목 둘 다 없음) 구독하지 않는다 —
 * 빈 배열로 불러도 서버가 `INVALID_REQUEST` 로 거절한다(apiSpec §5.5).
 */
export function useHomeStockQuotes(stockCodes: readonly string[]) {
  const capped = stockCodes.slice(0, STOCK_PRICES_MAX_CODES);

  return useQuoteSubscription({
    queryKey: queryKeys.stockQuotes.batch(capped),
    fetchQuote: (signal) => getHomeStockQuotes(capped, signal),
    tier: 'list',
    enabled: capped.length > 0,
  });
}
