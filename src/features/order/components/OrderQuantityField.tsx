import { formatAmount } from '@/shared/lib/formatNumber';

/**
 * 수량 입력 (프로토타입 `isOrder` 블록의 "수량" 묶음).
 *
 * **직접 입력 + 비율 버튼이다** (ia.md §1:132). 프로토타입은 수량을 글자로만 그리고
 * −/＋ 버튼을 두지만, ia.md 가 "직접 입력" 을 명시해서 실제 입력 요소로 만들었다.
 * 숫자 키패드를 띄우려고 `inputMode="numeric"` 을 쓴다 — `type="number"` 는 iOS 에서
 * 스피너와 소수점이 함께 붙고 `e`·`+` 같은 글자가 통과한다.
 *
 * 실측값 — 아래 2px 짙은 밑줄 · 수량 글자 28px(`text-title-1`) ·
 * −/＋ 버튼 40x40 반경 12px.
 *
 * 상한을 입력 단계에서 자르지 않는다. 최대 수량은 서버가 준 값이고(`maxQuantity`)
 * 폴링으로 바뀌는데, 입력 중에 값이 줄면 사용자가 친 숫자가 소리 없이 바뀐다.
 * 넘겼는지는 제출 버튼과 안내 문구가 말한다.
 */
type OrderQuantityFieldProps = {
  quantity: number;
  onChange: (quantity: number) => void;
  /** 오른쪽 위 보조 문구. `최대 13주` 처럼 분모를 알려준다. */
  maxNote: string;
};

export function OrderQuantityField({
  quantity,
  onChange,
  maxNote,
}: OrderQuantityFieldProps) {
  const step = (delta: number) => {
    onChange(Math.max(0, quantity + delta));
  };

  return (
    <section className="mt-8">
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <h2 className="text-title-3 font-bold text-text-primary">수량</h2>
        <span className="text-caption text-text-muted">{maxNote}</span>
      </div>

      <div className="flex items-center gap-3 border-b-2 border-text-primary pb-3">
        <input
          value={quantity === 0 ? '' : formatAmount(quantity)}
          onChange={(event) => {
            // 천 단위 구분 기호를 그대로 두면 숫자로 못 읽는다. 숫자만 남긴다.
            const digitsOnly = event.target.value.replace(/\D/g, '');
            onChange(digitsOnly === '' ? 0 : Number(digitsOnly));
          }}
          inputMode="numeric"
          placeholder="0"
          aria-label="주문 수량"
          className="min-w-0 flex-1 bg-transparent text-title-1 text-text-primary tabular-nums outline-none placeholder:text-text-muted"
        />
        <span className="flex-none text-title-3 text-text-secondary">주</span>
        <div className="flex flex-none gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={quantity <= 0}
            aria-label="1주 줄이기"
            className="size-10 rounded-12 border border-border-strong bg-surface text-title-3 leading-none font-medium text-text-primary disabled:text-disabled-text"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="1주 늘리기"
            className="size-10 rounded-12 border border-border-strong bg-surface text-title-3 leading-none font-medium text-text-primary"
          >
            ＋
          </button>
        </div>
      </div>
    </section>
  );
}
