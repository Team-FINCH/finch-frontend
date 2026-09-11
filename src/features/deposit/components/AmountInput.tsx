import { type ReactNode } from 'react';

import { formatAmount } from '@/shared/lib/formatNumber';

/**
 * 금액 입력 + 프리셋. 입금(`+1만`/`+10만`/`+100만`)과 출금(프리셋 없음)이 함께 쓴다 —
 * `design.md` L988 "금액 프리셋 버튼을 만들지 않는다. 충전에만 있는 것이다".
 *
 * 프로토타입은 **밑줄형**이다 (proto `template.html` L2627–L2628). 박스가 아니라
 * `border-bottom:2px solid var(--t1)` 한 줄이고 입력값이 Display 크기다 —
 * `design.md` L945 "입력값은 Display 크기", L206 Display 36~40px.
 *
 * 한도 초과는 빨간 테두리·빨간 글씨가 아니라 원형 `!` + 회색 문구다
 * (`design.md` L950 "원형 `!` + 문구다. 빨간 박스를 쓰지 않는다" · proto L2635–L2636).
 * 자리는 프리셋 **다음**이다 (proto L2633–L2638).
 *
 * **두 화면 치수는 입금 쪽으로 통일했다** (이슈 #54 회신 2026-09-11 「라」).
 * 프로토타입의 출금 입력(proto L2761–L2763)은 밑줄 1.5px · 입력 38px(자간 -.025em) ·
 * `원` 22px/600 으로 달랐는데, 두 시안을 따로 그린 결과일 뿐이라 한쪽으로 모았다.
 * 고른 이유도 회신이 적었다 — 1.5px 에서는 상태색 차이가 잘 안 보이고, 출금은
 * 예수금 전액까지 들어가 자릿수가 길어 38px 이 390px 폭에서 넘칠 위험이 있다.
 * `원` 은 20px/500/`--t3` 로 낮춘다. 숫자와 같은 크기·색이면 금액이 두 덩어리로 읽힌다.
 *
 * **밑줄 색만 출금 쪽 규칙을 두 화면 공통으로 가져왔다** — 미입력 `--border2` ·
 * 입력 `--t1` · 초과 `--t3` (`design.md` L978). 입금에도 미입력·초과 상태가
 * 똑같이 있다(프로토타입 `depOver`).
 */
type AmountInputProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  /** 입금만 프리셋을 받는다. 안 넘기면 프리셋 자리를 만들지 않는다 */
  presets?: readonly number[];
  label: string;
  errorMessage?: string;
  /**
   * 입력 바로 아래, **오류 문구보다 위**에 붙는 보조 줄. 출금이 여기에
   * `출금 가능 금액 … + 전액` 한 줄을 넣는다(proto L2807-2810).
   *
   * 자리를 밖에서 그리지 않고 슬롯으로 받는 이유는 **차례 때문이다.** 프로토타입
   * 출금 화면은 입력 → 가능 금액 → 오류 순인데, 오류를 이 컴포넌트가 그리므로
   * 호출부가 `AmountInput` 다음에 그리면 가능 금액이 오류보다 아래로 간다.
   */
  hint?: ReactNode;
};

/**
 * 밑줄 색. 세 상태가 있고 **초과가 입력을 이긴다** — 값이 들어 있어도 한도를 넘으면
 * 초과 색이다. 빨간색을 쓰지 않는 것은 아래 `.info` 안내와 같은 이유다
 * (`design.md` §10 "Red Warning Box 금지").
 */
function underlineClass(value: number | null, hasError: boolean): string {
  if (value === null) {
    return 'border-border-strong';
  }
  return hasError ? 'border-text-muted' : 'border-text-primary';
}

/**
 * 프리셋 라벨. 프로토타입은 `+1만` `+10만` `+100만` 이다 (proto L2631 ·
 * `design.md` L945). 넘어오는 값이 10,000·100,000·1,000,000 이라 만 단위로 접는다.
 * 만으로 나누어지지 않는 값이 오면 접지 않고 그대로 적는다 — 억 단위 표기는
 * 근거가 없어 만들지 않았다.
 */
function formatPresetLabel(preset: number): string {
  return preset % 10_000 === 0
    ? `${formatAmount(preset / 10_000)}만`
    : formatAmount(preset);
}

export function AmountInput({
  value,
  onChange,
  presets,
  label,
  errorMessage,
  hint,
}: AmountInputProps) {
  function handleRawChange(raw: string) {
    const digitsOnly = raw.replace(/[^0-9]/g, '');
    if (digitsOnly === '') {
      onChange(null);
      return;
    }
    onChange(Number(digitsOnly));
  }

  function addPreset(preset: number) {
    onChange((value ?? 0) + preset);
  }

  return (
    <div>
      <label
        htmlFor="deposit-amount"
        className="mb-2 block text-caption text-text-muted"
      >
        {label}
      </label>
      <div
        className={`flex items-baseline justify-between gap-2 border-b-2 pb-3 transition-colors duration-(--motion-fast) ease-standard ${underlineClass(
          value,
          errorMessage !== undefined,
        )}`}
      >
        <input
          id="deposit-amount"
          type="text"
          inputMode="numeric"
          placeholder="0"
          value={value === null ? '' : formatAmount(value)}
          onChange={(event) => handleRawChange(event.target.value)}
          aria-invalid={errorMessage !== undefined}
          aria-describedby={
            errorMessage === undefined ? undefined : 'deposit-amount-error'
          }
          className="min-w-0 flex-1 bg-transparent text-display tracking-[-0.02em] tabular-nums outline-none"
        />
        <span className="flex-none text-[20px] font-medium text-text-muted">
          원
        </span>
      </div>

      {/* 프로토타입 `.seg` — 높이 44px · 반경 12px · 안쪽 여백 4px · 버튼 반경 9px ·
          글자 15px/500 `--t3`. 눌러도 선택 상태로 남지 않는 더하기 버튼이라
          `.seg button.on` 은 쓰지 않고, 눌린 순간의 표시만 `OrderRatioButtons.tsx:37`
          과 같은 방식으로 준다 (proto L1101–L1103, L2630–L2632). */}
      {presets !== undefined && (
        <div className="mt-3.5 flex h-11 gap-1 rounded-12 bg-surface-soft p-1">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => addPreset(preset)}
              className="flex-1 rounded-[9px] text-body-2 font-medium text-text-muted transition-all duration-(--motion-normal) ease-standard active:bg-surface"
            >
              +{formatPresetLabel(preset)}
            </button>
          ))}
        </div>
      )}

      {/* 윗 여백 14px 은 프리셋(`.seg`)과 같은 자리라 같은 값이다
          (proto L2807 `margin-top:14px`). */}
      {hint !== undefined && <div className="mt-3.5">{hint}</div>}

      {/* 프로토타입 `.info` — 18px 원 · 테두리 1.4px `--t3` · 글자 11px/700
          (proto L1145). 본문은 `.b2` 15px 에 행간만 21px 로 좁힌다 (proto L2636). */}
      {errorMessage !== undefined && (
        <div className="mt-3.5 flex items-start gap-2">
          <span
            aria-hidden="true"
            className="mt-px flex size-4.5 flex-none items-center justify-center rounded-full border-[1.4px] border-text-muted text-[11px] font-bold text-text-muted"
          >
            !
          </span>
          <span
            id="deposit-amount-error"
            className="flex-1 text-body-2 leading-[21px] text-text-secondary"
          >
            {errorMessage}
          </span>
        </div>
      )}
    </div>
  );
}
