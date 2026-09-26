import {
  formatKrw,
  formatSignedAmount,
  getPriceDirection,
  type PriceDirection,
} from '@/shared/lib/formatNumber';
import { type OrderResponse } from '@/shared/types/order';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { SoftBox, SoftBoxRow } from '@/shared/ui/SoftBox';

/**
 * 체결 결과 (apiSpec §7.1 `201` 응답).
 *
 * **접수 알림이 아니라 체결 결과다.** 시장가 즉시 체결이라 응답에 체결가·체결금액·
 * 체결 후 예수금이 이미 들어 있다. "주문이 접수되었습니다" 라고 쓰지 않는다.
 *
 * `realizedProfit` 은 매도일 때만 값이 있다 — 매수에서는 `null` 이라 줄을 만들지 않는다.
 *
 * 바텀시트를 쓰면 `useSheetOverlayStore` 를 통해 하단 탭 바가 자동으로 빠진다
 * (`BottomSheet` 가 스스로 알린다). 결과 위에 매수/매도 바가 남지 않는다.
 */
const DIRECTION_TEXT_CLASS: Record<PriceDirection, string> = {
  rise: 'text-stock-up',
  fall: 'text-stock-down',
  flat: 'text-stock-neutral',
};

type OrderResultSheetProps = {
  result: OrderResponse | null;
  onClose: () => void;
};

export function OrderResultSheet({ result, onClose }: OrderResultSheetProps) {
  const sideLabel = result?.side === 'SELL' ? '매도' : '매수';

  return (
    <BottomSheet
      open={result !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={`${sideLabel} 체결`}
      hideTitle
    >
      {result !== null && (
        <div className="pb-2">
          <p className="text-title-3 font-bold text-text-primary">
            {result.stockName} {result.quantity}주를 {sideLabel}했어요
          </p>

          <SoftBox className="mt-4">
            <SoftBoxRow
              label="체결가"
              value={formatKrw(result.executedPrice)}
            />
            <SoftBoxRow
              label="체결 금액"
              value={formatKrw(result.executedAmount)}
              valueClassName="font-bold"
            />
            <SoftBoxRow
              label="주문 후 예수금"
              value={formatKrw(result.cashBalanceAfter)}
              divided
            />
            {result.realizedProfit !== null && (
              <SoftBoxRow
                label="실현손익"
                value={`${formatSignedAmount(result.realizedProfit)}원`}
                valueClassName={`font-bold ${
                  DIRECTION_TEXT_CLASS[getPriceDirection(result.realizedProfit)]
                }`}
              />
            )}
          </SoftBox>

          {/* `확인` 이었다 (FINCH-351). 체결은 이미 끝났고 이 버튼이 하는
              일은 시트를 닫는 것 하나라, 진단 모달(`닫기`)과 같은 말을 쓴다. */}
          <Button className="mt-5" onClick={onClose}>
            닫기
          </Button>
        </div>
      )}
    </BottomSheet>
  );
}
