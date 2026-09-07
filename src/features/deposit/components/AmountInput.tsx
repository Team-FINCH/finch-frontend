import { formatAmount } from '@/shared/lib/formatNumber';

/**
 * 금액 입력 + 프리셋. 충전(+1만/+10만/+100만)과 출금(둘 다 없음, 컴포지션으로 뺀다)
 * 이 함께 쓴다 — `ia.md` §1 "충전 화면"은 프리셋을 명시하지만 "출금 화면" 절은
 * "프리셋 버튼과 별도 확인 단계는 명세에 없다"고 적어 지어내지 않는다.
 *
 * 프로토타입에 입력 전용 클래스가 없어(`SoftBox.tsx` 주석 참고) 반경·테두리는
 * Soft Box 계열 토큰(`rounded-sm`·`border-border-strong`)을 그대로 빌려 썼다.
 */
type AmountInputProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  /** 충전만 프리셋을 받는다. 안 넘기면 프리셋 자리를 만들지 않는다 */
  presets?: readonly number[];
  label: string;
  errorMessage?: string;
};

export function AmountInput({
  value,
  onChange,
  presets,
  label,
  errorMessage,
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
        className="mb-2 block text-label text-text-secondary"
      >
        {label}
      </label>
      <div
        className={`flex items-center gap-2 rounded-sm border px-4 py-3.5 ${
          errorMessage
            ? 'border-danger'
            : 'border-border-strong focus-within:border-text-primary'
        }`}
      >
        <input
          id="deposit-amount"
          type="text"
          inputMode="numeric"
          placeholder="0"
          value={value === null ? '' : formatAmount(value)}
          onChange={(event) => handleRawChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-title-2 tabular-nums outline-none"
        />
        <span className="text-body-1 text-text-secondary">원</span>
      </div>
      {errorMessage !== undefined && (
        <p className="mt-2 text-caption text-danger">{errorMessage}</p>
      )}

      {presets !== undefined && (
        <div className="mt-3 flex gap-2">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => addPreset(preset)}
              className="flex-1 rounded-sm border border-border-strong bg-surface py-2.5 text-label text-text-primary"
            >
              +{formatAmount(preset)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
