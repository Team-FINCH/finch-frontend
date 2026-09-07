import { formatKrw } from '@/shared/lib/formatNumber';
import { SoftBox, SoftBoxRow } from '@/shared/ui/SoftBox';

/**
 * 주문 요약 (프로토타입 `isOrder` 블록의 `.soft`).
 *
 * **예상 금액이다. 체결가가 아니다.** 시장가라 체결 직전 재검증에서 값이 갈릴 수
 * 있고, 그때 서버는 수량을 줄여 체결하지 않고 주문을 거부한다 (apiSpec §7.2).
 * 그래서 "예상" 을 문구에 남긴다 — 숫자가 확정처럼 보이면 체결가가 달랐을 때
 * 사용자가 속았다고 느낀다.
 *
 * 매도는 예수금이 늘고 매수는 준다. 부호는 부르는 쪽이 계산해 넘긴다.
 */
type OrderSummaryBoxProps = {
  /** 수량 x 현재가. 서버가 주는 값이 아니라 예상치다. */
  estimatedAmount: number;
  /** 주문 뒤 예수금 예상. */
  cashAfter: number;
};

export function OrderSummaryBox({
  estimatedAmount,
  cashAfter,
}: OrderSummaryBoxProps) {
  return (
    <SoftBox className="mt-8">
      <SoftBoxRow
        label="예상 주문 금액"
        value={formatKrw(estimatedAmount)}
        valueClassName="font-bold"
      />
      <SoftBoxRow label="주문 후 예수금" value={formatKrw(cashAfter)} />
    </SoftBox>
  );
}
