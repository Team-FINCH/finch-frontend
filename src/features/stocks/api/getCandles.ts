import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  CandlesResponseSchema,
  type CandlePeriod,
  type CandlesResponse,
} from '@/shared/types/stock';

/**
 * 캔들 차트 데이터 (apiSpec §5.3).
 *
 * **세 기간 모두 일봉이다.** `interval` 은 `DAY` 하나뿐이라 요청에 넣지 않는다.
 * 분봉 도입 여부가 미확정이라(contracts P11) 기간 탭을 데이터 주도로 만든다.
 */
export function getCandles(
  stockCode: string,
  period: CandlePeriod,
  signal?: AbortSignal,
): Promise<CandlesResponse> {
  const query = new URLSearchParams({ period });
  return request(`${API_PATHS.stocks.candles(stockCode)}?${query.toString()}`, {
    schema: CandlesResponseSchema,
    signal,
  });
}
