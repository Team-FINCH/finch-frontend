import { API_PATHS } from '@/shared/config/apiContract';
import {
  StockQuotesResponseSchema,
  type StockQuotesResponse,
} from '@/shared/types/stock';

import { request } from './httpClient';

/**
 * 다건 현재가 조회 (apiSpec §5.5, contracts C41). 보유·관심 종목 목록의 시세를
 * 주기적으로 갱신할 때 쓴다 — `/portfolio`·`/watchlist` 를 통째로 다시 부르지
 * 않고 코드 몇 개만 다시 묻는다. 홈·포트폴리오 화면이 함께 쓴다(티켓 273) —
 * `shared/api` 에 두는 이유가 그것이다(feature 끼리 import 금지, frontConvention §2).
 *
 * `stockCodes` 는 쉼표로 이어 붙인다(C41). 정렬하지 않는다 — 정렬은 쿼리 키 쪽
 * (`queryKeys.stockQuotes.batch`) 책임이고 여기서 순서를 바꾸면 캐시 키와
 * 실제로 보낸 문자열이 어긋난다.
 */
export function getStockQuotes(
  stockCodes: readonly string[],
  signal?: AbortSignal,
): Promise<StockQuotesResponse> {
  const query = encodeURIComponent(stockCodes.join(','));
  return request(`${API_PATHS.stocks.prices}?stockCodes=${query}`, {
    schema: StockQuotesResponseSchema,
    signal,
  });
}
