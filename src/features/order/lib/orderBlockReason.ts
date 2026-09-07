import {
  MARKET_CLOSE_TIME_KST,
  MARKET_OPEN_TIME_KST,
} from '@/shared/config/apiContract';
import { ORDER_ERROR_CODES } from '@/shared/types/errorCodes';

/**
 * `GET /orders/available` 의 `reason` 을 화면 문구로 바꾼다 (apiSpec §7.3).
 *
 * **이 자리만 문구를 화면이 만든다.** 보통은 서버가 완성해 준 `message` 를 그대로
 * 쓰지만(컨벤션 §5), `reason` 은 에러 응답이 아니라 200 본문의 코드 문자열이라
 * 딸린 문구가 없다.
 *
 * 목록에 없는 코드가 올 수 있다 — 엔드포인트별 전체 코드 목록이 아직 없다
 * (contracts P6). 그래서 union 이 아니라 `string` 을 받고 모르는 값에는 중립 문구를
 * 준다. 여기서 `undefined` 를 돌려주면 버튼만 잠기고 이유가 안 보인다.
 */
const REASON_MESSAGE: Record<string, string> = {
  [ORDER_ERROR_CODES.MARKET_CLOSED]: `정규장 시간(${MARKET_OPEN_TIME_KST}~${MARKET_CLOSE_TIME_KST})에만 주문할 수 있어요.`,
  [ORDER_ERROR_CODES.STOCK_SUSPENDED]: '거래정지 종목이라 주문할 수 없어요.',
  [ORDER_ERROR_CODES.PRICE_UNAVAILABLE]:
    '지금 시세를 받지 못해 주문할 수 없어요.',
  [ORDER_ERROR_CODES.INSUFFICIENT_CASH]: '주문할 수 있는 금액이 부족해요.',
  [ORDER_ERROR_CODES.INSUFFICIENT_QUANTITY]: '보유한 수량이 부족해요.',
};

export function describeOrderBlockReason(reason: string | null): string {
  if (reason === null) {
    return '지금은 주문할 수 없어요.';
  }
  return REASON_MESSAGE[reason] ?? '지금은 주문할 수 없어요.';
}
