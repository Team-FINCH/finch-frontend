import type { Holding } from '@/shared/types/portfolio';
import type { KrwAmount, Percent } from '@/shared/types/primitives';
import {
  hasQuoteValues,
  type StockQuote,
  type WatchlistItem,
} from '@/shared/types/stock';

/**
 * 실시간 시세 적용과 평가손익 합계 (apiSpec §8.1 · 계약 C93).
 *
 * 홈과 포트폴리오 둘 다 보유 종목에 실시간 현재가를 얹고 그 결과로 합계를 낸다.
 * 두 화면이 각자 계산하면 어긋난다(티켓 273) — 이 파일 하나를 공유해서 막는다.
 */

/**
 * `GET /stocks/prices` 배치 결과를 코드로 찾기 쉽게 맵으로 바꾼다.
 * 존재하지 않는 코드는 애초에 `items` 에 없다(apiSpec §5.5) — 맵에도 없다.
 */
export function toQuoteMap(
  quotes: readonly StockQuote[],
): Map<string, StockQuote> {
  return new Map(quotes.map((quote) => [quote.stockCode, quote]));
}

/**
 * 보유 종목 한 줄에 새 시세를 덮어쓴다. `stale` 이거나 값이 없으면 원래 값을
 * 그대로 둔다 — 폴링이 실패했다고 화면 값을 비우지 않는다(`hasQuoteValues` 규약).
 * 평가금액·평가손익·평가손익률은 새 현재가로 다시 계산한다. 서버가 내려준 계산식
 * (`evaluationAmount = 수량 x 현재가`, apiSpec §8.1)과 같은 식을 쓴다.
 */
export function applyQuoteToHolding(
  holding: Holding,
  quoteMap: Map<string, StockQuote>,
): Holding {
  const quote = quoteMap.get(holding.stockCode);
  if (quote === undefined || !hasQuoteValues(quote)) {
    return holding;
  }

  // 브랜드가 다른 두 값(KrwAmount x Quantity)의 곱은 순수 number 로 떨어진다.
  // 이미 검증된 시세·수량으로 계산한 값이라 여기서만 다시 브랜딩한다.
  const evaluationAmount = (quote.currentPrice * holding.quantity) as KrwAmount;
  const cost = holding.avgBuyPrice * holding.quantity;
  const evaluationProfit = (evaluationAmount - cost) as KrwAmount;
  const evaluationProfitRate = (
    cost === 0 ? 0 : (evaluationProfit / cost) * 100
  ) as Percent;

  return {
    ...holding,
    currentPrice: quote.currentPrice,
    evaluationAmount,
    evaluationProfit,
    evaluationProfitRate,
  };
}

/** 관심 종목 한 줄에 새 시세를 덮어쓴다. 규칙은 `applyQuoteToHolding` 과 같다. */
export function applyQuoteToWatchlistItem(
  item: WatchlistItem,
  quoteMap: Map<string, StockQuote>,
): WatchlistItem {
  const quote = quoteMap.get(item.stockCode);
  if (quote === undefined || !hasQuoteValues(quote)) {
    return item;
  }

  return {
    ...item,
    currentPrice: quote.currentPrice,
    changeAmount: quote.changeAmount,
    changeRate: quote.changeRate,
  };
}

/** 보유 종목 합계(평가손익·수익률). 분모가 0 이면 `rate` 는 0 이다. */
export type EvaluationTotals = {
  profit: number;
  rate: number;
};

/**
 * 평가손익·수익률 합계 (apiSpec v0.8.2 · 계약 C93).
 *
 * **`evaluationProfit` 이 `null` 인 종목(시세 없음)은 분자·분모에서 함께 뺀다.**
 * 분자에서만 빼면 그 종목의 취득원가가 분모에는 남아 통째로 손실로 잡힌다
 * (티켓 273) — 서버가 상단 `evaluationAmount` 합계를 낼 때 쓰는 규칙과 같다.
 *
 * **이 함수가 서버의 `evaluationAmount`(평가 자산 헤드라인)를 대신하지 않는다.**
 * 그 값은 화면이 다시 정의하지 않고 서버가 준 값을 그대로 쓴다 — 여기서 내는 것은
 * 개별 종목의 `evaluationProfit`(실시간 시세가 얹힌 값)으로 낸 손익·수익률 합계뿐이다.
 */
export function evaluationTotals(
  holdings: readonly Holding[],
): EvaluationTotals {
  let profit = 0;
  let cost = 0;
  for (const holding of holdings) {
    if (holding.evaluationProfit === null) {
      continue;
    }
    profit += holding.evaluationProfit;
    cost += holding.avgBuyPrice * holding.quantity;
  }
  return {
    profit,
    rate: cost === 0 ? 0 : (profit / cost) * 100,
  };
}
