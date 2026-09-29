import { findStock, livePriceOf } from './catalog';
import { store } from './store';

/**
 * 평가금액·총자산 계산 (apiSpec §3.1 · §8.1 계산식).
 * 서버가 원장 기준으로 계산해 내려주는 값이라 화면은 표시만 한다. 목도 같은 식을 쓴다.
 *
 * 모두 원 단위 정수다. 나눗셈이 들어가는 수익률만 백분율이고 소수점 둘째 자리까지 반올림한다.
 */

/**
 * 보유 종목의 현재가. **시세를 모르면 `null` 이다** (apiSpec v0.8.2 · §5.4 값 없음).
 *
 * 전에는 평균 매수가로 메웠는데, 그러면 시세를 모르는 종목이 손익 0 으로 보인다.
 * v0.8.2 가 그 자리를 `null` 로 정했으므로 목도 같은 모양으로 답한다.
 */
export function currentPriceOf(stockCode: string): number | null {
  const stock = findStock(stockCode);
  if (stock === undefined || stock.quoteState === 'missing') {
    return null;
  }
  // 평가금액도 함께 움직여야 한다. 시세는 흐르는데 총자산만 멈춰 있으면
  // 두 숫자가 서로 다른 시점을 가리킨다.
  return livePriceOf(stock);
}

/**
 * 평가금액 = Σ(보유 수량 × 현재가)
 *
 * **시세가 없는 종목은 더하지 않는다** (apiSpec v0.8.2). 0 으로 치면 자산이 사라진
 * 것처럼 보이므로 빼고, 그 종목의 평가 필드가 `null` 인 것으로 부분값임을 알린다.
 */
export function evaluationAmount(): number {
  return store.holdings.reduce((sum, holding) => {
    const currentPrice = currentPriceOf(holding.stockCode);
    return currentPrice === null ? sum : sum + holding.quantity * currentPrice;
  }, 0);
}

/** 총자산 = 예수금 + 평가금액 */
export function totalAsset(): number {
  return store.cashBalance + evaluationAmount();
}

/** 백분율 수익률. 분모가 0 이면 0 이다 (`3.23` = +3.23%). */
export function profitRate(profit: number, base: number): number {
  if (base === 0) {
    return 0;
  }
  return Math.round((profit / base) * 10000) / 100;
}
