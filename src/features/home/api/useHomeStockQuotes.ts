import { getStockQuotes, useQuoteSubscription } from '@/shared/api';
import { STOCK_PRICES_MAX_CODES } from '@/shared/config/apiContract';
import { queryKeys } from '@/shared/config/queryKeys';

/**
 * 홈 미리보기(내 종목·관심 종목)의 시세 구독 (apiSpec §5.5 · contracts C34·C41).
 *
 * 안쪽은 `useQuoteSubscription` 이다 — 홈은 미리보기 몇 줄만 보여주므로 목록 티어
 * (`list`)로 구독한다. 폴링 주기·`staleTime` 은 그 안에 있고 여기는 출처만 댄다.
 *
 * `stockCodes` 가 비어 있으면(보유·관심 종목 둘 다 없음) 구독하지 않는다 —
 * 빈 배열로 불러도 서버가 `INVALID_REQUEST` 로 거절한다(apiSpec §5.5).
 *
 * **`queryKey` 는 `queryKeys.stockQuotes.batch` 다.** 포트폴리오 화면의
 * `usePortfolioStockQuotes` 도 같은 키 팩토리를 쓴다(티켓 273) — 두 화면이 같은
 * 종목 코드 집합을 구독하는 순간 캐시를 공유해 요청이 화면 수만큼 늘지 않는다.
 */
export function useHomeStockQuotes(stockCodes: readonly string[]) {
  const capped = stockCodes.slice(0, STOCK_PRICES_MAX_CODES);

  return useQuoteSubscription({
    queryKey: queryKeys.stockQuotes.batch(capped),
    fetchQuote: (signal) => getStockQuotes(capped, signal),
    tier: 'list',
    enabled: capped.length > 0,
  });
}
