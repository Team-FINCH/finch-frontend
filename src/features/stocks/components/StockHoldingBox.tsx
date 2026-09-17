import {
  formatAmount,
  formatSignedAmountWithRate,
  getPriceDirection,
  type PriceDirection,
} from '@/shared/lib/formatNumber';
import { type StockHoldingSummary } from '@/shared/types/stock';
import { SoftBox, SoftBoxRow } from '@/shared/ui/SoftBox';

/**
 * 내 보유 요약 (종목 상세 상단, 현재가 요약 바로 아래).
 *
 * **라벨 있는 표다. 라벨 없는 한 줄 카드가 아니다(FINCH-301,
 * 2026-09-16 재수정).** 이전 판은 라벨 없이 `{금액} / {비율}` 두 줄만 둔
 * 카드였는데, 그 모양이 바로 위 현재가 요약(오늘 등락)과 똑같아 실제 화면에서
 * 사용자가 둘을 구분하지 못했다 — 라벨이 없으면 어느 숫자가 오늘 등락이고
 * 어느 쪽이 평가손익인지 알 길이 없다. 앞 커밋에서 지운 `내 보유 상세`
 * (`StockChartTab` 참고)가 라벨 있는 표로 이미 이 문제를 풀고 있었으므로 그
 * 모양을 이 자리로 옮겼다 — 정보를 지운 것이 아니라 중복이던 두 자리를
 * 하나로 합친 것이다.
 *
 * **2행이다. `내 보유 상세`의 3행을 그대로 옮기지 않는다(사용자 결정,
 * 2026-09-16).** 3행이면 차트가 그만큼 아래로 밀린다. 보유 수량과 평균
 * 매수가를 `보유` 한 줄에 합쳤다.
 *
 *   보유          1주 · 평균 323,500원
 *   평가손익      -15,000원 (4.64%)
 *
 * `SoftBox`·`SoftBoxRow`(`shared/ui`)를 그대로 쓴다 — `내 보유 상세`가 쓰던
 * 것과 같은 컴포넌트라 고칠 이유가 없다. 그 컴포넌트의 반경 10px·안쪽 여백
 * 16px 을 그대로 받아들이면, 이전 카드(반경 12·`px-4.25 py-3.75`, 2행 기준
 * 대략 74px)보다 박스가 약 16px 커진다(2행 기준 대략 90px = 안쪽 여백
 * 16×2 + 행 높이 24 + 행 간격 10 + 행 높이 24) — `shared/ui` 를 손대지 않고
 * 그대로 쓰는 대신 받아들인 차이다.
 *
 * **평가손익이 없을 수 있다** (contracts C93 · apiSpec v0.8.2 §5.2). 현재가가
 * 없으면 평가손익 두 필드가 `null` 로 온다. 그때는 등락색을 붙이지 않고 `—` 로
 * 둔다 — 0원과 같은 색이 되면 "손익 없음" 으로 읽힌다.
 *
 * **누르지 않는다.** 이전 판이 갖고 있던 `onClick`·셰브런·스크롤 로직은
 * `내 보유 상세` 로 이동하던 것이었는데 그 절이 사라졌으므로(앞 커밋) 되살리지
 * 않는다.
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
  // 방향은 비율이 아니라 금액으로 정한다 — `formatSignedAmountWithRate` 주석과 같은
  // 기준이다. 반올림 경계에서 금액과 비율의 부호가 갈릴 수 있고, 화면이 대표하는
  // 값은 "평가손익"(금액)이지 "수익률"이 아니다.
  const profitClass = hasProfit
    ? DIRECTION_TEXT_CLASS[getPriceDirection(evaluationProfit)]
    : 'text-text-secondary';

  return (
    <section className="mt-5">
      <SoftBox>
        <SoftBoxRow
          label="보유"
          value={`${formatAmount(holding.quantity)}주 · 평균 ${formatAmount(
            holding.avgBuyPrice,
          )}원`}
        />
        <SoftBoxRow
          label="평가손익"
          value={
            hasProfit
              ? formatSignedAmountWithRate(
                  evaluationProfit,
                  evaluationProfitRate,
                )
              : '—'
          }
          valueClassName={profitClass}
        />
      </SoftBox>
    </section>
  );
}
