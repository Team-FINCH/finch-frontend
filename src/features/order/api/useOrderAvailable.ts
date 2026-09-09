import { useQuoteSubscription } from '@/shared/api';
import { queryKeys } from '@/shared/config/queryKeys';
import { type OrderSide } from '@/shared/types/order';

import { getOrderAvailable } from './getOrderAvailable';

/**
 * 주문 가능 정보 구독 (apiSpec §7.3 · contracts C34·C45).
 *
 * **시세처럼 구독한다.** 이 응답이 현재가·예수금·최대 수량·거래 가능 여부를 한꺼번에
 * 들고 있어서, 멈춰 있으면 장 마감이나 잔고 변화가 화면에 반영되지 않은 채 제출 버튼이
 * 열려 있다. 안쪽은 `useQuoteSubscription` 이고 티어는 주문 화면(`order`)이다 —
 * 체결 금액이 걸린 자리라 목록과 따로 둔다. 주기 자체는 그 안에 있다(contracts C40).
 *
 * **정규장 판정을 화면의 시계로 하지 않는다** (ia.md §1:133). 브라우저 시각은
 * 사용자가 바꿀 수 있고 서버와 어긋나면 "눌리는데 거부되는" 상태가 된다.
 * 판정은 언제나 이 응답의 `tradable`·`reason` 이다.
 */
export function useOrderAvailable(stockCode: string, side: OrderSide) {
  return useQuoteSubscription({
    queryKey: queryKeys.orders.available(stockCode, side),
    fetchQuote: (signal) => getOrderAvailable(stockCode, side, signal),
    tier: 'order',
  });
}
