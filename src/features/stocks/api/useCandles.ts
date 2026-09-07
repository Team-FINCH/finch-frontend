import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';
import { type CandlePeriod } from '@/shared/types/stock';

import { getCandles } from './getCandles';

/**
 * 캔들 데이터. 기간이 쿼리 키에 들어가므로 기간 탭을 오갈 때 이미 받은 구간은
 * 다시 받지 않는다.
 *
 * 일봉은 장중에 마지막 봉만 움직인다. 폴링하지 않고 기본 `staleTime`(30초)에 맡긴다 —
 * 현재가는 별도로 `useStockQuote` 가 갱신하므로 헤더 숫자는 늦지 않는다.
 */
export function useCandles(stockCode: string, period: CandlePeriod) {
  return useQuery({
    queryKey: queryKeys.stocks.candles(stockCode, period),
    queryFn: ({ signal }) => getCandles(stockCode, period, signal),
  });
}
