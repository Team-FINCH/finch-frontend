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
 *
 * **둘을 한 줄에 나란히 놓는다** (QA 피드백 2026-09-22). 프로토타입은 세로로 쌓지만
 * (proto L2651–L2658) 항목이 라벨 한 줄뿐이라 카드 두 장이 세로로 100px 넘게 먹고,
 * 그만큼 아래 `확인` 섹션이 접힌 화면 밖으로 밀린다. **항목이 셋 이상이거나 설명
 * 줄이 붙으면 이 배치를 되돌려야 한다** — 한 줄에 담기는 것은 수단이 둘이고 라벨이
 * 넉 자·다섯 자라서다. 375px 기준 카드 하나가 162px 이고, 최소 지원 폭 320px 에서도
 * `카카오페이` 가 줄바꿈 없이 들어간다.
 *
 * 카드 자체의 모양(테두리·점·면색)은 건드리지 않았다. 바뀐 것은 배치뿐이다.
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
      className="grid grid-cols-2 gap-2.5"
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
            className={`flex items-center gap-2.5 rounded-sm border bg-surface px-3.5 py-3.5 text-left transition-colors duration-(--motion-fast) ${
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
            <span className="min-w-0 flex-1 text-body-1 font-medium whitespace-nowrap text-text-primary">
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
