import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  OrderAvailableResponseSchema,
  type OrderAvailableResponse,
  type OrderSide,
} from '@/shared/types/order';

/**
 * 주문 가능 정보 (apiSpec §7.3 · contracts C45).
 *
 * **`tradable: false` 도 200 이다.** 거절 사유는 에러가 아니라 본문의 `reason` 으로
 * 온다 — 화면은 이것으로 제출 버튼을 잠근다.
 *
 * **비율 버튼의 분모가 여기서 온다.** `maxQuantity`(매수) · `holdingQuantity`(매도) 를
 * 그대로 쓰고 화면이 예수금 나누기 현재가를 계산하지 않는다 (contracts C45).
 */
export function getOrderAvailable(
  stockCode: string,
  side: OrderSide,
  signal?: AbortSignal,
): Promise<OrderAvailableResponse> {
  const query = new URLSearchParams({ stockCode, side });
  return request(`${API_PATHS.orders.available}?${query.toString()}`, {
    schema: OrderAvailableResponseSchema,
    signal,
  });
}
