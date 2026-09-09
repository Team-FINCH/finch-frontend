import { useQuery } from '@tanstack/react-query';

import {
  QUOTE_POLLING_INTERVAL_MS,
  STOCK_PRICES_MAX_CODES,
} from '@/shared/config/apiContract';
import { queryKeys } from '@/shared/config/queryKeys';

import { getHomeStockQuotes } from './getHomeStockQuotes';

/**
 * 홈 미리보기(내 종목·관심 종목)의 시세를 주기적으로 새로고침한다.
 *
 * **웹소켓을 쓰지 않는다.** 실시간 시세 스트리밍(41 슬롯·폴백 폴링)은 종목 상세
 * 티켓의 몫이고, 홈은 미리보기 몇 줄만 보여준다. `GET /stocks/prices` 목록 폴링 주기
 * (`QUOTE_POLLING_INTERVAL_MS.list`)를 그대로 쓴다 — 숫자를 여기 박지 않는다.
 *
 * `stockCodes` 가 비어 있으면(보유·관심 종목 둘 다 없음) 요청 자체를 막는다 —
 * 빈 배열로 불러도 서버가 `INVALID_REQUEST` 로 거절한다(apiSpec §5.5).
 */
export function useHomeStockQuotes(stockCodes: readonly string[]) {
  const capped = stockCodes.slice(0, STOCK_PRICES_MAX_CODES);

  return useQuery({
    queryKey: queryKeys.stockQuotes.batch(capped),
    queryFn: ({ signal }) => getHomeStockQuotes(capped, signal),
    enabled: capped.length > 0,
    refetchInterval: QUOTE_POLLING_INTERVAL_MS.list,
    // 폴링 값이라 항상 오래된 것으로 본다. staleTime 이 주기와 같으면 타이머가 깨어나는
    // 순간이 막 stale 이 되는 경계라 한 주기를 통째로 건너뛸 수 있다.
    // useStockQuote·useOrderAvailable 도 같은 이유로 0 이다.
    staleTime: 0,
    // 창이 백그라운드에 있어도 다음 포커스 때 낡은 값이 잠깐 보이지 않게 유지한다.
    refetchIntervalInBackground: false,
  });
}
