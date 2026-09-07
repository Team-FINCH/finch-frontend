import { useQuery } from '@tanstack/react-query';

import { QUOTE_POLLING_INTERVAL_MS } from '@/shared/config/apiContract';
import { queryKeys } from '@/shared/config/queryKeys';
import { type OrderSide } from '@/shared/types/order';

import { getOrderAvailable } from './getOrderAvailable';

/**
 * 주문 가능 정보.
 *
 * **폴링한다.** 이 응답이 현재가·예수금·최대 수량·거래 가능 여부를 한꺼번에 들고 있어서,
 * 멈춰 있으면 장 마감이나 잔고 변화가 화면에 반영되지 않은 채 제출 버튼이 열려 있다.
 * 주기는 주문 화면 권장값(3초)이다 — 계약이 아니라 프론트 재량이고
 * 관계식(`TTL >= 주기 x 4~6`)을 지킨다 (contracts C40).
 *
 * **정규장 판정을 화면의 시계로 하지 않는다** (ia.md §1:133). 브라우저 시각은
 * 사용자가 바꿀 수 있고 서버와 어긋나면 "눌리는데 거부되는" 상태가 된다.
 * 판정은 언제나 이 응답의 `tradable`·`reason` 이다.
 */
export function useOrderAvailable(stockCode: string, side: OrderSide) {
  return useQuery({
    queryKey: queryKeys.orders.available(stockCode, side),
    queryFn: ({ signal }) => getOrderAvailable(stockCode, side, signal),
    refetchInterval: QUOTE_POLLING_INTERVAL_MS.order,
    staleTime: 0,
  });
}
