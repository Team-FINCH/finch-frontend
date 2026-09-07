import { type PaymentMethod } from '@/shared/types/deposit';

const OPTIONS: { value: PaymentMethod; label: string; description: string }[] =
  [
    {
      value: 'KAKAOPAY',
      label: '카카오페이',
      description: '카카오페이 결제창에서 결제해요',
    },
    {
      value: 'TRANSFER',
      label: '계좌이체',
      description: '이체 화면에서 승인을 진행해요',
    },
  ];

/** 결제 수단 선택 — 카카오페이 · 계좌이체 둘뿐이다(ia.md §1). */
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
            className={`flex flex-col items-start rounded-sm border px-4 py-3.5 text-left transition-colors duration-(--motion-fast) ${
              selected
                ? 'border-text-primary bg-primary-soft'
                : 'border-border-strong bg-surface'
            }`}
          >
            <span className="text-body-1 font-medium text-text-primary">
              {option.label}
            </span>
            <span className="mt-0.5 text-caption text-text-secondary">
              {option.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
