import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  RecentStocksResponseSchema,
  type RecentStocksResponse,
} from '@/shared/types/stock';

/**
 * 최근 본 종목 (apiSpec §6.1). 최대 30건 FIFO (contracts C51).
 *
 * **등록 API 가 없다.** `GET /stocks/{stockCode}` 호출 자체가 서버에 기록을 남기므로
 * 프론트가 따로 기록 요청을 보내지 않는다 (ia.md §1).
 */
export function getRecentStocks(
  signal?: AbortSignal,
): Promise<RecentStocksResponse> {
  return request(API_PATHS.stocks.recent, {
    schema: RecentStocksResponseSchema,
    signal,
  });
}
