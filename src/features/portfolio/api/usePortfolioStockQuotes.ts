import { getStockQuotes, useQuoteSubscription } from '@/shared/api';
import { STOCK_PRICES_MAX_CODES } from '@/shared/config/apiContract';
import { queryKeys } from '@/shared/config/queryKeys';

/**
 * 보유 종목의 시세 구독 (apiSpec §5.5 · contracts C34·C41 · 티켓 273).
 *
 * `GET /portfolio` 가 내려준 평가금액·평가손익은 그 응답 시점의 시세로 계산된
 * 값이다. 화면이 열려 있는 동안 값이 굳어 있지 않도록 홈과 같은 방식으로
 * 보유 종목 시세를 폴링해 다시 얹는다(`shared/lib/applyQuotes`).
 *
 * **`queryKey` 는 `features/home/api/useHomeStockQuotes` 와 같은 키 팩토리
 * (`queryKeys.stockQuotes.batch`)를 쓴다.** 두 화면이 같은 종목 코드 집합을
 * 구독하면(예: 보유 종목만 있고 관심 종목이 없을 때) 캐시를 공유해 요청이
 * 화면 수만큼 늘지 않는다 — feature 간 import 는 금지라(frontConvention §2)
 * 훅 자체는 따로 두고, 안쪽이 부르는 `shared/api` 함수와 키 팩토리만 공유한다.
 */
export function usePortfolioStockQuotes(stockCodes: readonly string[]) {
  const capped = stockCodes.slice(0, STOCK_PRICES_MAX_CODES);

  return useQuoteSubscription({
    queryKey: queryKeys.stockQuotes.batch(capped),
    fetchQuote: (signal) => getStockQuotes(capped, signal),
    tier: 'list',
    enabled: capped.length > 0,
  });
}
