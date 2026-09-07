import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  CandlesResponseSchema,
  type CandleInterval,
  type CandlePeriod,
  type CandlesResponse,
} from '@/shared/types/stock';

/**
 * 요청에 항상 실어 보내는 고정 `period`. apiSpec §5.3 의 `period` 는 필수 열거값
 * (`1M`·`3M`·`1Y`)이라 값을 아예 안 보낼 수는 없다. 그런데 화면에는 기간을 고르는
 * 탭이 없다 — 봉 종류(`interval`) 탭만 있고, 보이는 범위는 확대/축소가 맡는다
 * (`ChartPeriodSegment` 주석 참고). 그래서 가장 넓은 값을 고정으로 보내 서버가
 * 줄 수 있는 범위를 최대한 받는다.
 *
 * TODO(계약): 캔들 interval — 이슈 #37 회신 전 임시값. 이슈 #37 3번 질문이
 * "`interval` 을 요청에 어떻게 실을지"라 회신이 오면 이 상수와 쿼리 조합 방식이
 * 통째로 바뀔 수 있다.
 */
const CANDLES_REQUEST_PERIOD: CandlePeriod = '1Y';

/**
 * 캔들 차트 데이터 (apiSpec §5.3).
 *
 * 요청에 `period`(위 고정값)와 `interval`(봉 종류 탭이 고른 값)을 함께 싣는다.
 * `?period=1Y&interval=WEEK` 형태다 — apiSpec §5.3 요청 예시(`?period=1M`)에는
 * `interval` 쿼리 파라미터가 없어서 이 조합 자체가 임시다.
 */
export function getCandles(
  stockCode: string,
  interval: CandleInterval,
  signal?: AbortSignal,
): Promise<CandlesResponse> {
  const query = new URLSearchParams({
    period: CANDLES_REQUEST_PERIOD,
    interval,
  });
  return request(`${API_PATHS.stocks.candles(stockCode)}?${query.toString()}`, {
    schema: CandlesResponseSchema,
    signal,
  });
}
