import { MARKET_HOURS_LABEL_KST } from '@/shared/config/apiContract';
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
 *
 * **문구를 화면이 짓지는 않는다.** 코드에 문자열을 맞추는 자리만 여기고, 값은
 * `design.md` §7.7 "주문할 수 없는 상태" 표에서 그대로 가져온다(L554~L556). 프로토타입
 * `app-logic.js` 의 `BLOCK` 도 같은 두 문자열이다. 끝에 마침표가 없는 것과 시세 수신
 * 실패만 하다체인 것까지 문서 그대로다 — 다듬으면 문서와 어긋난다.
 *
 * **`STOCK_SUSPENDED` 문구는 손대지 않았다.** design.md L275 는 탭바 캡슐을 `거래정지`
 * 한 줄로 적었고 프로토타입은 `거래정지된 종목이에요` 로 갈려 디자이너 회신 대기
 * 항목이다. 게다가 그 둘은 종목 상세의 탭바(`TradeTabBar`) 문구고 주문 화면은
 * `ActionBar` 를 쓴다. 회신이 오면 그때 정한다.
 */
const REASON_MESSAGE: Record<string, string> = {
  // 시각을 숫자로 박지 않는다. 거래 시간은 계약(contracts C44 · apiSpec §5.8)이고
  // 상수가 단일 원천이다 — 애프터마켓이 들어왔을 때 이 줄을 고칠 필요가 없었던
  // 이유이기도 하다(고칠 곳은 상수 하나였다).
  [ORDER_ERROR_CODES.MARKET_CLOSED]: `지금은 주문할 수 없어요 (거래 시간 ${MARKET_HOURS_LABEL_KST})`,
  [ORDER_ERROR_CODES.STOCK_SUSPENDED]: '거래정지 종목이라 주문할 수 없어요.',
  // design.md L555 그대로다.
  [ORDER_ERROR_CODES.PRICE_UNAVAILABLE]:
    '시세를 불러올 수 없어 주문이 제한됩니다',
  [ORDER_ERROR_CODES.INSUFFICIENT_CASH]: '주문할 수 있는 금액이 부족해요.',
  [ORDER_ERROR_CODES.INSUFFICIENT_QUANTITY]: '보유한 수량이 부족해요.',
};

export function describeOrderBlockReason(reason: string | null): string {
  if (reason === null) {
    return '지금은 주문할 수 없어요.';
  }
  return REASON_MESSAGE[reason] ?? '지금은 주문할 수 없어요.';
}
