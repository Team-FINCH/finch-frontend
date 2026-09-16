import { useMemo } from 'react';

import {
  applyQuoteToHolding,
  applyQuoteToWatchlistItem,
  evaluationTotals as computeEvaluationTotals,
  toQuoteMap,
} from '@/shared/lib/applyQuotes';
import type { PortfolioSort } from '@/shared/types/portfolio';
import type { WatchlistSort } from '@/shared/types/stock';

import { useAccountSummary } from '../api/useAccountSummary';
import { useHomePortfolio } from '../api/useHomePortfolio';
import { useHomeStockQuotes } from '../api/useHomeStockQuotes';
import { useHomeWatchlist } from '../api/useHomeWatchlist';

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
 *
 * 내 종목·관심 종목 정렬은 둘 다 화면이 고른 값을 그대로 받는다 — 정렬 버튼은
 * 목록 안에 있지만 쿼리는 이 훅이 갖고 있어 상태를 페이지까지 올렸다.
 */
export function useHomeData(
  portfolioSort: PortfolioSort,
  watchSort: WatchlistSort,
) {
  const account = useAccountSummary();
  const portfolio = useHomePortfolio(portfolioSort);
  const watchlist = useHomeWatchlist(watchSort);

  const stockCodes = useMemo(() => {
    const holdingCodes = portfolio.data?.holdings.map((h) => h.stockCode) ?? [];
    const watchCodes = watchlist.data?.items.map((w) => w.stockCode) ?? [];
    return Array.from(new Set([...holdingCodes, ...watchCodes]));
  }, [portfolio.data, watchlist.data]);

  const quotes = useHomeStockQuotes(stockCodes);
  const quoteMap = useMemo(
    () => toQuoteMap(quotes.snapshot?.items ?? []),
    [quotes.snapshot],
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

  // 시세를 모르는 종목은 합계에서 뺀다 — 분자와 분모를 함께 빼야 수익률이 왜곡되지 않는다
  // (apiSpec v0.8.2 · 계약 C93. 서버의 evaluationAmount 합계도 같은 규칙이다).
  // 포트폴리오 화면도 같은 규칙을 같은 함수(`shared/lib/applyQuotes`)로 쓴다(티켓 273).
  const evaluationTotals = useMemo(
    () => computeEvaluationTotals(holdings),
    [holdings],
  );

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
