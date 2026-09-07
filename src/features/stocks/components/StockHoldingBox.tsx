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
  const profitClass =
    DIRECTION_TEXT_CLASS[getPriceDirection(holding.evaluationProfitRate)];

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
          value={`${formatSignedAmount(holding.evaluationProfit)}원 (${formatSignedRate(
            holding.evaluationProfitRate,
          )})`}
          valueClassName={`font-bold ${profitClass}`}
        />
      </SoftBox>
    </section>
  );
}
