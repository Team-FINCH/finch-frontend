import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  MarketIndicesResponseSchema,
  type MarketIndicesResponse,
} from '@/shared/types/market';

/**
 * 시장 지수 조회 (apiSpec §5.7). 홈 헤더의 지수 롤링이 쓴다.
 * 파라미터가 없다 — KOSPI · KOSDAQ 둘이 한 응답으로 온다.
 */
export function getMarketIndices(
  signal?: AbortSignal,
): Promise<MarketIndicesResponse> {
  return request(API_PATHS.market.indices, {
    schema: MarketIndicesResponseSchema,
    signal,
  });
}
