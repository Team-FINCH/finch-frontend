import {
  formatAmount,
  formatKrw,
  formatSignedAmount,
  formatSignedRate,
  getPriceDirection,
  type PriceDirection,
} from '@/shared/lib/formatNumber';
import { type StockHoldingSummary } from '@/shared/types/stock';
import { SoftBox, SoftBoxRow } from '@/shared/ui/SoftBox';
import { NoValue } from '@/shared/ui/StockRow';

/**
 * 내 보유 상세 (프로토타입 `d.owned` 의 `.soft` 묶음).
 *
 * `shared/ui/SoftBox` 를 쓴다 — design.md §6 이 "그룹핑이 필요한 정보" 자리로 지정했고
 * 종목 상세의 내 보유가 그 예로 적혀 있다.
 *
 * **평가금액을 화면이 계산하지 않는다.** `StockHoldingSummary` 는 수량·평단·평가손익·
 * 수익률만 준다 (apiSpec §5.2). 평가금액은 `수량 x 현재가` 지만 그 곱을 여기서 하면
 * 현재가가 폴링으로 흔들릴 때 서버의 포트폴리오 숫자와 어긋난다. 그래서 응답에 있는
 * 값만 그린다 — 평가금액 줄은 넣지 않았다.
 *
 * 등락색은 평가손익 줄에만 붙는다 (컨벤션 §11 · SoftBoxRow 의 `valueClassName`).
 *
 * **현재가가 없으면 평가손익 두 필드가 `null` 로 온다** (contracts C93 · apiSpec v0.8.2 §5.2).
 * 수량과 평단은 시세와 무관하게 언제나 값이 있으므로 그 두 줄은 그대로 그리고,
 * 평가손익 줄만 값 없음으로 바꾼다. 줄 자체를 빼면 가진 주식이 사라진 것처럼 보인다.
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
  // 값이 없으면 등락색을 붙이지 않는다. 0원과 같은 색이 되면 "손익 없음" 으로 읽힌다.
  const profitClass =
    evaluationProfitRate === null
      ? 'text-text-secondary'
      : DIRECTION_TEXT_CLASS[getPriceDirection(evaluationProfitRate)];

  return (
    <section className="mt-8">
      <h2 className="mb-3.5 text-title-3 font-bold text-text-primary">
        내 보유
      </h2>
      <SoftBox>
        <SoftBoxRow
          label="보유 수량"
          value={`${formatAmount(holding.quantity)}주`}
        />
        <SoftBoxRow
          label="평균 매수가"
          value={formatKrw(holding.avgBuyPrice)}
        />
        <SoftBoxRow
          label="평가손익"
          value={
            evaluationProfit === null || evaluationProfitRate === null ? (
              <NoValue label="시세가 없어 평가손익을 계산할 수 없음" />
            ) : (
              `${formatSignedAmount(evaluationProfit)}원 (${formatSignedRate(
                evaluationProfitRate,
              )})`
            )
          }
          valueClassName={`font-bold ${profitClass}`}
        />
      </SoftBox>
    </section>
  );
}
