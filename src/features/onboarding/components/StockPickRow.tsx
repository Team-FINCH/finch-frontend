/**
 * 온보딩의 종목 한 줄 (design.md §7.16 "종목 리스트"·"선택 인디케이터").
 *
 * **가격과 등락률을 보여주지 않는다.** 고르는 화면이라 종목 식별만 필요하고,
 * 숫자가 붙으면 "무엇을 살까" 화면으로 읽힌다. 카드 배경·테두리도 없다.
 *
 * 행 전체가 클릭 영역이고, 선택은 우측 원형 체크와 종목명 굵기로만 알린다 —
 * 카드 반전이나 색 채우기 같은 큰 상태 변화는 쓰지 않는다.
 */
type StockPickRowProps = {
  stockCode: string;
  stockName: string;
  /** `종목코드 · 시장` 형태의 보조 한 줄. 시장을 모르면 종목코드만 넘긴다 */
  sub: string;
  selected: boolean;
  /** 거래정지 뱃지. 담는 것 자체는 막지 않는다 (design.md §7.16) */
  suspended?: boolean;
  onToggle: () => void;
};

export function StockPickRow({
  stockCode,
  stockName,
  sub,
  selected,
  suspended = false,
  onToggle,
}: StockPickRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      data-stock-code={stockCode}
      className="flex w-full items-center gap-3 border-b border-border py-2.75 text-left"
    >
      <span
        aria-hidden="true"
        className="flex size-9 flex-none items-center justify-center rounded-md bg-surface-soft text-caption font-bold text-text-secondary"
      >
        {stockName.slice(0, 1)}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.25">
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className={`truncate text-body-1 ${
              selected ? 'font-bold' : 'font-medium'
            } text-text-primary`}
          >
            {stockName}
          </span>
          {suspended ? (
            <span className="inline-flex h-6 flex-none items-center rounded-sm bg-primary-soft px-2 text-caption font-medium text-text-secondary">
              거래정지
            </span>
          ) : null}
        </span>
        <span className="truncate text-caption text-text-secondary">{sub}</span>
      </span>

      {/* 22px 원형 체크. 미선택은 테두리만, 선택은 본문색으로 채운다 */}
      <span
        aria-hidden="true"
        className={`flex size-5.5 flex-none items-center justify-center rounded-full border text-[11px] leading-none ${
          selected
            ? 'border-text-primary bg-text-primary text-surface'
            : 'border-border-strong bg-transparent text-transparent'
        }`}
      >
        ✓
      </span>
    </button>
  );
}
