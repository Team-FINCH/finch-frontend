import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';
import { type CandleInterval } from '@/shared/types/stock';

import { getCandles } from './getCandles';

/**
 * 캔들 데이터. 봉 종류가 쿼리 키에 들어가므로 탭을 오갈 때 이미 받은 봉 종류는
 * 다시 받지 않는다.
 *
 * 일봉은 장중에 마지막 봉만 움직인다. 폴링하지 않고 기본 `staleTime`(30초)에 맡긴다 —
 * 현재가는 별도로 `useStockQuote` 가 갱신하므로 헤더 숫자는 늦지 않는다.
 *
 * `enabled` 는 **차트를 그리지 않는 상태에서 요청을 내지 않기 위한 것**이다 —
 * 거래정지 종목은 차트 자리에 정지 안내가 들어가므로(프로토타입 `d.tradableChart`)
 * 받을 이유가 없다. 껐을 때 `isPending` 이 참으로 남으므로 부르는 쪽은 차트 블록
 * 자체를 렌더하지 않아야 한다.
 */
export function useCandles(
  stockCode: string,
  interval: CandleInterval,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.stocks.candles(stockCode, interval),
    queryFn: ({ signal }) => getCandles(stockCode, interval, signal),
    enabled,
  });
}
