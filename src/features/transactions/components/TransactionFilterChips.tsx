import { TRANSACTION_FILTERS } from '../lib/useTransactionFilterState';

type TransactionFilterChipsProps = {
  type: (typeof TRANSACTION_FILTERS)[number]['value'];
  onChange: (type: string) => void;
};

/**
 * 매매 내역 필터 칩 (프로토타입 `.chip` 실측 — 높이 34px · 반경 11px · 선택 시
 * `--brand-soft` 면 + 1px 안쪽 테두리).
 *
 * **반경은 --radius-sm(10px)을 그대로 쓴다.** 프로토타입 실측값(11px)과 1px
 * 차이인데, 토큰 파일 주석(`styles/index.css` `--radius-sm`)이 "칩을 만들 때
 * 이 값으로 맞출지 프로토타입 값으로 갈지 정한다"고 미리 남겨 둔 자리라 새
 * 토큰을 추가하지 않고 기존 계단에 맞췄다.
 *
 * 색은 등락이 아니라 "선택됨" 상태라 `--color-stock-*` 를 쓰지 않는다
 * (`frontConvention.md` §11 "등락 표기는 등락 표시 밖에서 쓰지 않는다").
 */
export function TransactionFilterChips({
  type,
  onChange,
}: TransactionFilterChipsProps) {
  return (
    <div
      role="tablist"
      aria-label="매매 내역 필터"
      className="scroll-touch flex gap-1.5 overflow-x-auto pb-1"
    >
      {TRANSACTION_FILTERS.map((filter) => {
        const isActive = filter.value === type;
        return (
          <button
            key={filter.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(filter.value)}
            className={[
              'inline-flex h-8.5 flex-none items-center gap-1.25 rounded-sm px-3.5 text-label transition-colors duration-(--motion-fast) ease-standard',
              isActive
                ? 'bg-primary-soft text-text-primary shadow-[inset_0_0_0_1px_var(--color-border-strong)]'
                : 'bg-surface-soft text-text-secondary',
            ].join(' ')}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
