import { useMemo } from 'react';

import { useAccountSummary } from '../api/useAccountSummary';
import { useHomePortfolio } from '../api/useHomePortfolio';
import { useHomeStockQuotes } from '../api/useHomeStockQuotes';
import { useHomeWatchlist } from '../api/useHomeWatchlist';
import {
  applyQuoteToHolding,
  applyQuoteToWatchlistItem,
  toQuoteMap,
} from '../lib/applyQuotes';

/**
 * 홈 화면이 쓰는 계좌·보유·관심 데이터를 한데 모은다.
 *
 * 세 쿼리(`/account`·`/portfolio`·`/watchlist`)를 각각 부르고, 그 결과로 모은
 * 종목코드로 `/stocks/prices` 를 폴링해 보유·관심 목록의 시세만 주기적으로 새로
 * 얹는다(`applyQuotes.ts`) — ia.md §1 "홈과 포트폴리오는 데이터 출처가 겹친다"의
 * 홈 쪽 소비 지점이 이 훅 하나다.
 *
 * **총자산 카드의 "손익"은 프로토타입의 "오늘 손익"이 아니다.**
 * `GET /account`·`GET /portfolio` 어디에도 일간(전일 대비) 손익 필드가 없다 —
 * 있는 것은 보유 종목의 누적 평가손익(`evaluationProfit`, 평균 매수가 대비)뿐이다.
 * TODO(계약): 일간 손익 필드가 나중에 추가되면 이 훅과 `TotalAssetsSummary` 를
 * 함께 고친다. 지금은 "평가손익"(누적)으로 라벨을 바꿔 실제 있는 값만 보여준다.
 */
export function useHomeData() {
  const account = useAccountSummary();
  const portfolio = useHomePortfolio();
  const watchlist = useHomeWatchlist();

  const stockCodes = useMemo(() => {
    const holdingCodes = portfolio.data?.holdings.map((h) => h.stockCode) ?? [];
    const watchCodes = watchlist.data?.items.map((w) => w.stockCode) ?? [];
    return Array.from(new Set([...holdingCodes, ...watchCodes]));
  }, [portfolio.data, watchlist.data]);

  const quotes = useHomeStockQuotes(stockCodes);
  const quoteMap = useMemo(
    () => toQuoteMap(quotes.data?.items ?? []),
    [quotes.data],
  );

  const holdings = useMemo(
    () =>
      (portfolio.data?.holdings ?? []).map((holding) =>
        applyQuoteToHolding(holding, quoteMap),
      ),
    [portfolio.data, quoteMap],
  );

  const watchItems = useMemo(
    () =>
      (watchlist.data?.items ?? []).map((item) =>
        applyQuoteToWatchlistItem(item, quoteMap),
      ),
    [watchlist.data, quoteMap],
  );

  const evaluationTotals = useMemo(() => {
    let profit = 0;
    let cost = 0;
    for (const holding of holdings) {
      profit += holding.evaluationProfit;
      cost += holding.avgBuyPrice * holding.quantity;
    }
    return {
      profit,
      rate: cost === 0 ? 0 : (profit / cost) * 100,
    };
  }, [holdings]);

  return {
    account,
    holdings,
    holdingsPending: portfolio.isPending,
    holdingsError: portfolio.isError,
    holdingsRefetch: portfolio.refetch,
    watchItems,
    watchPending: watchlist.isPending,
    watchError: watchlist.isError,
    watchRefetch: watchlist.refetch,
    evaluationTotals,
  };
}
