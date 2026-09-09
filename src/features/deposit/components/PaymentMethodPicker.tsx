import { type PaymentMethod } from '@/shared/types/deposit';

const OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'KAKAOPAY', label: '카카오페이' },
  { value: 'TRANSFER', label: '계좌이체' },
];

/**
 * 결제 수단 선택 — 카카오페이 · 계좌이체 둘뿐이다(`ia.md` §1).
 *
 * 항목은 **라벨 하나뿐이다** (proto `template.html` L2653·L2657). 전에 있던 설명
 * 한 줄(`카카오페이 결제창에서 결제해요` · `이체 화면에서 승인을 진행해요`)은
 * 프로토타입·`design.md`·`ia.md` 어디에도 없는 문구라 뺐다.
 *
 * 선택은 **원형 라디오 점**이 말한다 (proto L2652·L2656 · L4114–L4115). 점은 20px 이고
 * 선택 시 `6px solid var(--t1)`, 아닐 때 `2px solid var(--border2)` 다. 카드는 테두리
 * 색만 바뀐다 — 선택 `var(--t1)`, 아닐 때 `var(--border)` (proto L4112–L4113).
 * 면색은 바꾸지 않는다. 프로토타입의 `.card` 는 늘 `var(--surface)` 다.
 */
export function PaymentMethodPicker({
  value,
  onChange,
}: {
  value: PaymentMethod | null;
  onChange: (value: PaymentMethod) => void;
}) {
  return (
    <div
      className="flex flex-col gap-2.5"
      role="radiogroup"
      aria-label="결제 수단"
    >
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`flex items-center gap-3 rounded-sm border bg-surface px-4 py-3.5 text-left transition-colors duration-(--motion-fast) ${
              selected ? 'border-text-primary' : 'border-border'
            }`}
          >
            <span
              aria-hidden="true"
              className={`size-5 flex-none rounded-full ${
                selected
                  ? 'border-[6px] border-text-primary'
                  : 'border-2 border-border-strong'
              }`}
            />
            <span className="flex-1 text-body-1 font-medium text-text-primary">
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
