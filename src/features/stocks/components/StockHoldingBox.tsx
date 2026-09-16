import {
  formatAmount,
  formatSignedAmountWithRate,
  getPriceDirection,
  type PriceDirection,
} from '@/shared/lib/formatNumber';
import { type StockHoldingSummary } from '@/shared/types/stock';

/**
 * 내 보유 요약 (프로토타입 `d.owned` 의 요약 카드, 새 디코드 L1710–L1719).
 *
 * **한 줄 요약 카드다. 키-값 상세가 아니다.** 껍데기에는 `{수량}주 보유` ·
 * `평균 {평단}원` · 평가손익 한 줄만 둔다.
 *
 * **누르면 이동하던 동작을 걷어냈다(FINCH-301, 2026-09-16).** 프로토타입은
 * 이 카드를 누르면 차트 탭 하단의 `내 보유 상세`(`scrollToHold`, 앵커
 * `hold-detail`)로 스크롤했다. 그 절이 보여주던 세 값 — 보유 수량·평균 매수가·
 * 평가손익 — 이 이 카드와 정확히 같아 절 자체를 없앴다(`StockChartTab` 참고).
 * 도착지가 사라졌으므로 셰브런과 `onClick`, 스크롤 로직도 함께 걷어냈다 —
 * 남겨 두면 눌러도 아무 일이 없는 죽은 버튼이 된다.
 *
 * 실측 — 면 `#F5F6F8` · 반경 12 · 안쪽 여백 15/17 · 가운데 묶음 줄 간격 4 ·
 * 제목 15px/600 · 보조 `.cp` · 평가손익 16px/600 등락색.
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
};

export function StockHoldingBox({ holding }: StockHoldingBoxProps) {
  const { evaluationProfit, evaluationProfitRate } = holding;
  const hasProfit = evaluationProfit !== null && evaluationProfitRate !== null;
  const profitClass = hasProfit
    ? DIRECTION_TEXT_CLASS[getPriceDirection(evaluationProfitRate)]
    : 'text-text-secondary';

  return (
    <section className="mt-5">
      <div className="flex w-full items-center gap-3 rounded-12 bg-surface-soft px-4.25 py-3.75">
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
            ? formatSignedAmountWithRate(evaluationProfit, evaluationProfitRate)
            : '—'}
        </span>
      </div>
    </section>
  );
}
