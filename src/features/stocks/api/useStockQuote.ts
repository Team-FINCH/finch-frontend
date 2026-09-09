import { useQuery } from '@tanstack/react-query';

import { QUOTE_POLLING_INTERVAL_MS } from '@/shared/config/apiContract';
import { queryKeys } from '@/shared/config/queryKeys';

import { getStockQuote } from './getStockQuote';

/**
 * 현재가 폴링 (apiSpec §5.6 · contracts C40).
 *
 * **폴링 주기는 계약이 아니라 프론트 재량이다.** 서버가 보장하는 것은 티어 TTL 30초
 * 뿐이고 관계식(`TTL >= 주기 x 4~6`)만 지키면 된다. 숫자를 여기 박지 않고
 * `shared/config` 상수를 쓴다 (ia.md §7: "시세 갱신 주기와 stale 임계값은 코드에
 * 숫자로 박지 않는다").
 *
 * 웹소켓 전환 시점은 미확정이라(contracts P9) 지금은 폴링만 한다. 전환되면
 * 이 훅의 안쪽만 바뀌고 화면은 그대로다.
 *
 * `interval` 은 주문 화면이 아니라 상세 화면이라 `list` 를 쓴다. 목록·주문 둘 다 지금은
 * 3초로 같지만(백엔드 KIS 순회 주기에 맞췄다 — apiContract 주석) 상수는 나뉜 채로 둔다.
 * 주문 화면은 체결 금액이 걸린 자리라 성격이 다르다.
 */
export function useStockQuote(stockCode: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.stocks.quote(stockCode),
    queryFn: ({ signal }) => getStockQuote(stockCode, signal),
    enabled,
    refetchInterval: QUOTE_POLLING_INTERVAL_MS.list,
    // 폴링 값이라 항상 오래된 것으로 본다. 안 그러면 staleTime 30초가 주기를 삼킨다.
    staleTime: 0,
  });
}
