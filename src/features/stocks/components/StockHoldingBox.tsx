import {
  formatAmount,
  formatSignedAmount,
  formatSignedRate,
  getPriceDirection,
  type PriceDirection,
} from '@/shared/lib/formatNumber';
import { type StockHoldingSummary } from '@/shared/types/stock';

/**
 * 내 보유 요약 (프로토타입 `d.owned` 의 눌리는 요약 카드, 새 디코드 L1710–L1719).
 *
 * **한 줄 요약 카드다. 키-값 상세가 아니다.** 프로토타입은 두 단계로 나눈다 —
 * 껍데기에는 `{수량}주 보유` · `평균 {평단}원` · 평가손익 한 줄만 두고, 누르면
 * 차트 탭 하단의 `내 보유 상세`(`StockChartTab` 의 `#hold-detail`)로 보낸다.
 * 전에는 상세 세 줄을 이 자리에 바로 뒀는데 그러면 카드가 갈 곳이 없어진다.
 *
 * 실측 — 면 `#F5F6F8` · 반경 12 · 안쪽 여백 15/17 · 가운데 묶음 줄 간격 4 ·
 * 제목 15px/600 · 보조 `.cp` · 평가손익 16px/600 등락색 · 오른쪽 셰브런 15px `--t3`.
 * 면색 `#F5F6F8` 은 토큰이 없어 `--color-surface-soft`(`#F1F3F6`)로 그렸다 —
 * 반톤 차이라 눈에 띄지 않고, 새 색 토큰은 `shared/styles` 주인이 정한다.
 *
 * 제목(`내 보유`)을 그리지 않는다 — 프로토타입 카드에 제목이 없다.
 *
 * **평가손익이 없을 수 있다** (contracts C93 · apiSpec v0.8.2 §5.2). 현재가가 없으면
 * 평가손익 두 필드가 `null` 로 온다. 그때는 등락색을 붙이지 않고 `—` 로 둔다 —
 * 프로토타입도 값이 없는 자리를 `—` 로 그린다(`myAvg`·`myPnl`). 0원과 같은 색이 되면
 * "손익 없음" 으로 읽힌다.
 */
const DIRECTION_TEXT_CLASS: Record<PriceDirection, string> = {
  rise: 'text-stock-up',
  fall: 'text-stock-down',
  flat: 'text-stock-neutral',
};

type StockHoldingBoxProps = {
  holding: StockHoldingSummary;
  /** 누르면 차트 탭의 `내 보유 상세` 로 보낸다 (프로토타입 `scrollToHold`). */
  onPress: () => void;
};

export function StockHoldingBox({ holding, onPress }: StockHoldingBoxProps) {
  const { evaluationProfit, evaluationProfitRate } = holding;
  const hasProfit = evaluationProfit !== null && evaluationProfitRate !== null;
  const profitClass = hasProfit
    ? DIRECTION_TEXT_CLASS[getPriceDirection(evaluationProfitRate)]
    : 'text-text-secondary';

  return (
    <section className="mt-5">
      <button
        type="button"
        onClick={onPress}
        className="flex w-full items-center gap-3 rounded-12 bg-surface-soft px-4.25 py-3.75 text-left active:bg-primary-soft"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[15px] font-semibold text-text-primary tabular-nums">
            {formatAmount(holding.quantity)}주 보유
          </span>
          <span className="text-caption text-text-muted tabular-nums">
            평균 {formatAmount(holding.avgBuyPrice)}원
          </span>
        </span>
        <span
          className={`flex-none text-body-1 font-semibold whitespace-nowrap tabular-nums ${profitClass}`}
        >
          {hasProfit
            ? `${formatSignedAmount(evaluationProfit)}원 (${formatSignedRate(
                evaluationProfitRate,
              )})`
            : '—'}
        </span>
        <span
          aria-hidden="true"
          className="flex-none text-[15px] text-text-muted"
        >
          ›
        </span>
      </button>
    </section>
  );
}
