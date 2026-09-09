import { useQuoteSubscription } from '@/shared/api';
import { queryKeys } from '@/shared/config/queryKeys';

import { getStockQuote } from './getStockQuote';

/**
 * 단건 현재가 구독 (apiSpec §5.4·§5.6 · contracts C34·C40).
 *
 * 안쪽은 `useQuoteSubscription` 이다 — 폴링인지 STOMP 인지는 이 훅도 모른다. 주기·
 * `staleTime` 같은 폴링 세부는 전부 그 안에 있고 여기는 출처(키·읽기 함수·티어)만 댄다.
 *
 * `tier` 는 주문 화면이 아니라 상세 화면이라 `list` 를 쓴다. 목록·주문 둘 다 지금은
 * 3초로 같지만(백엔드 KIS 순회 주기에 맞췄다 — apiContract 주석) 상수는 나뉜 채로 둔다.
 * 주문 화면은 체결 금액이 걸린 자리라 성격이 다르다.
 */
export function useStockQuote(stockCode: string, enabled = true) {
  return useQuoteSubscription({
    queryKey: queryKeys.stocks.quote(stockCode),
    fetchQuote: (signal) => getStockQuote(stockCode, signal),
    tier: 'list',
    enabled,
  });
}
