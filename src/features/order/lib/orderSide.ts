import { type OrderSide } from '@/shared/types/order';

/**
 * 주문 방향의 두 표기를 잇는다.
 *
 * **URL 은 소문자, API 는 대문자다.** ia.md §2 가 `?side=buy|sell` 로 정했고
 * apiSpec §7.1 의 `OrderSide` 는 `BUY`·`SELL` 이다. 둘을 한 자리에서 바꾸지 않으면
 * 화면마다 `toUpperCase()` 가 흩어지고, 한 곳을 빠뜨리면 400 이 난다.
 *
 * 모르는 값은 던지지 않고 `buy` 로 떨어뜨린다. 링크가 손으로 만들어져 들어오는
 * 자리라 오타 하나로 화면이 죽으면 안 된다.
 */
export const ORDER_SIDE_PARAM = 'side';

export const ORDER_SIDE_URL_VALUES = ['buy', 'sell'] as const;
export type OrderSideUrlValue = (typeof ORDER_SIDE_URL_VALUES)[number];

/** ia.md §2 표에 기본값이 없다. 매수를 기본으로 둔 것은 화면 결정이다. */
export const DEFAULT_ORDER_SIDE_URL_VALUE: OrderSideUrlValue = 'buy';

const URL_TO_API: Record<OrderSideUrlValue, OrderSide> = {
  buy: 'BUY',
  sell: 'SELL',
};

export function parseOrderSideParam(value: string | null): OrderSideUrlValue {
  return (ORDER_SIDE_URL_VALUES as readonly string[]).includes(value ?? '')
    ? (value as OrderSideUrlValue)
    : DEFAULT_ORDER_SIDE_URL_VALUE;
}

export function toApiOrderSide(value: OrderSideUrlValue): OrderSide {
  return URL_TO_API[value];
}

/** 화면 문구. 제목과 제출 버튼이 같은 낱말을 쓴다. */
export const ORDER_SIDE_LABEL: Record<OrderSideUrlValue, string> = {
  buy: '매수',
  sell: '매도',
};
