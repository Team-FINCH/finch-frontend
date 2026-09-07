import { ORDER_QUANTITY_RATIO_PRESETS } from '@/shared/config/apiContract';

/**
 * 비율 버튼 10% / 25% / 50% / 최대 (contracts C45 · ia.md §1:132).
 *
 * **분모를 화면이 계산하지 않는다.** `GET /orders/available` 의 `maxQuantity`(매수) ·
 * `holdingQuantity`(매도) 를 그대로 받아 곱한다. 예수금 나누기 현재가를 여기서 하면
 * 수수료·호가 단위가 빠져 서버 판정과 어긋난다.
 *
 * "최대" 는 비율이 아니라 분모 그 자체다 — 그래서 `ORDER_QUANTITY_RATIO_PRESETS`
 * (0.1·0.25·0.5) 에 들어 있지 않고 따로 그린다.
 *
 * 내림한다. 올리면 최대 수량을 넘겨 서버가 거절한다.
 */
type OrderRatioButtonsProps = {
  /** 비율의 분모. 매수면 `maxQuantity`, 매도면 `holdingQuantity`. */
  baseQuantity: number;
  onSelect: (quantity: number) => void;
};

export function OrderRatioButtons({
  baseQuantity,
  onSelect,
}: OrderRatioButtonsProps) {
  return (
    <div
      role="group"
      aria-label="수량 비율 선택"
      className="mt-3.5 flex h-9.5 gap-1 rounded-12 bg-surface-soft p-1"
    >
      {ORDER_QUANTITY_RATIO_PRESETS.map((ratio) => (
        <button
          key={ratio}
          type="button"
          disabled={baseQuantity <= 0}
          onClick={() => onSelect(Math.floor(baseQuantity * ratio))}
          className="flex-1 rounded-[9px] text-body-2 font-medium text-text-secondary transition-all duration-(--motion-normal) ease-standard active:bg-surface disabled:text-disabled-text"
        >
          {ratio * 100}%
        </button>
      ))}
      <button
        type="button"
        disabled={baseQuantity <= 0}
        onClick={() => onSelect(baseQuantity)}
        className="flex-1 rounded-[9px] text-body-2 font-medium text-text-secondary transition-all duration-(--motion-normal) ease-standard active:bg-surface disabled:text-disabled-text"
      >
        최대
      </button>
    </div>
  );
}
