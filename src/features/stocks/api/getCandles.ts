import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import { CANDLE_INTERVAL_REQUEST_PERIOD } from '@/shared/types/candleInterval';
import {
  CandlesResponseSchema,
  type CandleInterval,
  type CandlesResponse,
} from '@/shared/types/stock';

/**
 * 캔들 차트 데이터 (apiSpec §5.3 v0.8.4 확정 · 이슈 #37 회신).
 *
 * 화면에는 `period`를 고르는 탭이 없다 — 봉 종류(`interval`) 탭만 있고, 요청마다
 * `interval`에 맞는 `period`를 `CANDLE_INTERVAL_REQUEST_PERIOD`(서동혁 권장 조합)
 * 에서 끌어와 함께 싣는다. `?period=1Y&interval=WEEK` 형태다.
 */
export function getCandles(
  stockCode: string,
  interval: CandleInterval,
  signal?: AbortSignal,
): Promise<CandlesResponse> {
  const query = new URLSearchParams({
    period: CANDLE_INTERVAL_REQUEST_PERIOD[interval],
    interval,
  });
  return request(`${API_PATHS.stocks.candles(stockCode)}?${query.toString()}`, {
    schema: CandlesResponseSchema,
    signal,
  });
}
