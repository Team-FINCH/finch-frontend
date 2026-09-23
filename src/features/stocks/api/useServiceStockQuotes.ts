import { getStockQuotes, useQuoteSubscription } from '@/shared/api';
import { STOCK_PRICES_MAX_CODES } from '@/shared/config/apiContract';
import { queryKeys } from '@/shared/config/queryKeys';
import { SERVICE_STOCK_CODES } from '@/shared/config/serviceStocks';

/**
 * 탐색의 서비스 종목 목록 시세 (apiSpec §5.5 · contracts C34·C41).
 *
 * **서비스 종목 30개가 한 요청에 들어간다.** 한도가 50건이라(`STOCK_PRICES_MAX_CODES`)
 * 나눠 부르지 않는다 — 이 화면 때문에 새로 만든 엔드포인트가 없고, 이미 홈·포트폴리오가
 * 쓰는 다건 시세를 그대로 한 번 더 부르는 것이다.
 *
 * 코드 배열이 모듈 상수라 렌더마다 같은 값이다. `useMemo` 로 감싸지 않는다 —
 * 참조가 처음부터 고정이다.
 *
 * `slice` 는 서비스 종목이 50개를 넘는 날의 방어다(`useHomeStockQuotes` 와 같은 처리).
 * **잘려 나간 종목의 행이 사라지지는 않는다** — 목록은 `SERVICE_STOCKS` 전체를 그리고
 * 시세가 없는 행은 `StockRow` 가 `—` 로 그린다. 값이 없는 것과 종목이 없는 것은 다르다.
 *
 * 티어는 `list` 다. 이 화면은 훑어보는 목록이지 체결을 보는 자리가 아니다.
 */
const SUBSCRIBED_CODES = SERVICE_STOCK_CODES.slice(0, STOCK_PRICES_MAX_CODES);

export function useServiceStockQuotes() {
  return useQuoteSubscription({
    queryKey: queryKeys.stockQuotes.batch(SUBSCRIBED_CODES),
    fetchQuote: (signal) => getStockQuotes(SUBSCRIBED_CODES, signal),
    tier: 'list',
  });
}
