import { useMemo } from 'react';

import { ROUTES } from '@/shared/config/routes';
import { SERVICE_STOCKS } from '@/shared/config/serviceStocks';
import { toQuoteMap } from '@/shared/lib/applyQuotes';
import { StockRow } from '@/shared/ui/StockRow';

import { useServiceStockQuotes } from '../api/useServiceStockQuotes';

/**
 * 서비스 종목 목록 — 이 앱에서 거래할 수 있는 종목 전부(30개).
 *
 * ## 왜 있나
 *
 * 탐색의 두 묶음(최근 검색어 · 최근 본 종목)은 **둘 다 사용자의 행동 기록**이라
 * 처음 온 사람에게는 같이 비어 있다. 그보다 큰 구멍이 따로 있었다 — **서비스 종목이
 * 30개로 닫혀 있다는 사실을 앱 어디에서도 볼 수 없었다.** 검색은 두 글자 이상을
 * 요구하고(`STOCK_SEARCH_MIN_KEYWORD_LENGTH`) 온보딩은 임시 상수 4개만 보여주는데,
 * 유니버스 밖 종목은 `STOCK_NOT_FOUND` 다(FINCH-300). 경계선이 어디인지 볼 자리를
 * 만드는 것이 이 목록이다.
 *
 * ## 순위가 아니다
 *
 * **순위 숫자를 붙이지 않고 정렬하지 않는다.** `StockRow` 에 `rank` prop 이 있지만 쓰지
 * 않는다 — 그 자리는 걷어낸 시장 랭킹 화면의 것이다. 순서는 백엔드
 * `finch.universe.codes` 의 순서 그대로다(`shared/config/serviceStocks.ts`). 등락률로
 * 정렬하면 사람은 그것을 순위로 읽고, 랭킹·추천 API 를 만들지 않기로 한 결정
 * (2026-09-07, `design.md` 시장 랭킹 절)을 정렬로 되살리는 셈이다.
 *
 * 일부만 골라 보여주지도 않는다. 고르는 순간 선정 기준이 필요하고 그 기준이 곧 랭킹이다.
 * **전부면 기준이 필요 없다.**
 *
 * ## 이름은 로컬, 값만 원격
 *
 * 종목코드·종목명은 프론트 상수라 **네트워크와 무관하게 항상 그려진다.** 시세만
 * `GET /stocks/prices` 한 번(30개가 한도 50건 안에 들어간다)이고, 값이 없는 행은
 * `StockRow` 가 `—` 로 그린다(캐시 미스·거래정지와 같은 처리, apiSpec §5.4).
 * 그래서 이 목록에는 **빈 상태도 에러 상태도 없다** — 시세를 못 받아도 "어떤 종목이
 * 있나" 라는 질문에는 답이 나간다. 스켈레톤도 두지 않는다. 첫 시세를 기다리는 동안
 * 이름을 감추면 이 컴포넌트가 있는 이유가 사라진다.
 *
 * 구독이 끊겼을 때만 머리에 한 줄을 붙인다. 되살리는 버튼은 두지 않는다 —
 * `useQuoteSubscription` 의 폴링이 실패 뒤에도 계속 돌아 스스로 복구한다.
 *
 * 행 모양은 `RecentStockList` 와 같다 — 보조 줄이 종목코드고 구분선이 각 행 뒤에 온다.
 * 같은 화면에 세로로 이어 붙는 목록이라 두 목록의 행이 다르게 보이면 안 된다.
 */
export function ServiceStockList() {
  const quotes = useServiceStockQuotes();

  const quoteMap = useMemo(
    () => toQuoteMap(quotes.snapshot?.items ?? []),
    [quotes.snapshot],
  );

  return (
    <>
      {quotes.isDisconnected && quotes.snapshot === undefined ? (
        <p className="mb-1.5 text-caption text-text-muted">
          시세를 불러오지 못했어요. 종목을 누르면 상세에서 볼 수 있어요.
        </p>
      ) : null}

      <ul>
        {SERVICE_STOCKS.map((stock) => {
          const quote = quoteMap.get(stock.stockCode);

          return (
            <li key={stock.stockCode}>
              <StockRow
                stockCode={stock.stockCode}
                stockName={stock.stockName}
                sub={stock.stockCode}
                figures={{
                  kind: 'quote',
                  currentPrice: quote?.currentPrice ?? null,
                  changeRate: quote?.changeRate ?? null,
                }}
                to={ROUTES.stockDetail(stock.stockCode)}
              />
              <div className="ml-14 h-px bg-border opacity-50" />
            </li>
          );
        })}
      </ul>
    </>
  );
}
