import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  StockQuoteResponseSchema,
  type StockQuoteResponse,
} from '@/shared/types/stock';

/**
 * 단건 현재가 (apiSpec §5.4).
 *
 * **값이 없는 것은 에러가 아니다** (contracts C42). 수신이 끊기면 마지막 값 +
 * `stale: true`, 캐시 미스면 가격 3필드와 `asOf` 가 전부 `null` + `stale: true` 로
 * 200 이 온다. 화면은 `hasQuoteValues` 로 가격 영역을 그릴지 판단한다.
 */
export function getStockQuote(
  stockCode: string,
  signal?: AbortSignal,
): Promise<StockQuoteResponse> {
  return request(API_PATHS.stocks.price(stockCode), {
    schema: StockQuoteResponseSchema,
    signal,
  });
}
