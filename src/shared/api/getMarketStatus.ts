import { API_PATHS } from '@/shared/config/apiContract';
import { MarketStatusSchema, type MarketStatus } from '@/shared/types/market';

import { request } from './httpClient';

/**
 * 시장 상태 조회 (apiSpec §5.8). 파라미터가 없다 — `open`·`quotesLive`·`session`·
 * `nextChangeAt` 넷이 한 응답으로 온다.
 */
export function getMarketStatus(signal?: AbortSignal): Promise<MarketStatus> {
  return request(API_PATHS.market.status, {
    schema: MarketStatusSchema,
    signal,
  });
}
