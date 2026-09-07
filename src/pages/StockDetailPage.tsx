import { useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  StockAiTab,
  StockChartTab,
  StockDetailHeader,
  StockDetailTabNav,
  StockHoldingBox,
  StockInfoTab,
  parseCandlePeriod,
  parseStockDetailTab,
  useStockDetail,
  useStockQuote,
  useToggleWatchlist,
  STOCK_DETAIL_PERIOD_PARAM,
  STOCK_DETAIL_TAB_PARAM,
  type StockDetailTab,
} from '@/features/stocks';
import { ROUTES, STOCK_CODE_PARAM } from '@/shared/config/routes';
import { type CandlePeriod } from '@/shared/types/stock';
import { PageMain } from '@/shared/ui/PageMain';
import { Skeleton } from '@/shared/ui/Skeleton';
import { TradeTabBar } from '@/shared/ui/TabBar';

/**
 * 종목 상세 — 시세·차트·기업정보·AI 분석. `?tab=chart|info|ai` · `?period=1M|3M|1Y`.
 *
 * **`/stocks/:stockCode` 와 `?tab=ai` 는 프론트 혼자 정하는 값이 아니다** — 브리핑
 * 응답의 `deeplink` 를 AI 서버가 이 경로 문자열로 만들어 내려보낸다 (`ia.md` §2).
 *
 * 티켓: FINCH-38, FINCH-50.
 *
 * 근거: `ia.md` §1 "탐색·거래" 표, §2 라우트 트리(쿼리 파라미터 표) ·
 * 프로토타입 `finch-prototype.html` 의 `isDetail` 블록.
 * API: `GET /api/v1/stocks/{stockCode}` · `GET /api/v1/stocks/{stockCode}/candles?period=` ·
 * `GET /api/v1/stocks/{stockCode}/price` · `POST`/`DELETE /api/v1/watchlist`.
 *
 * ## 하단 바를 이 페이지가 직접 렌더하는 이유
 *
 * **`TradeTabBar` 를 페이지 안에서 렌더한다. 레이아웃이 아니다.** 종목 상세는
 * 라우터에서 `TabBarLayout` 밖, `StockCodeGuard` 아래에 있다 — `TabBarLayout` 은
 * 나브 변형(`TabBar`)만 렌더하므로 그 아래 두면 홈·탐색·포트폴리오·내 정보 탭이
 * 잘못 뜬다. 그리고 `app/router.tsx` 가 스스로 적어 둔 대로
 * "`TradeTabBar` 를 다는 레이아웃은 아직 없다 — 그 배선은 이 티켓 범위 밖이라
 * 만들지 않았다". 라우터와 `app/layouts/**` 는 이 티켓에서 건드리지 않는 파일이라
 * 새 레이아웃을 만들 수도 없다.
 *
 * 그래서 페이지가 직접 렌더하고, `fixed` 인 바에 본문이 가리지 않도록 아래 여백을
 * 탭 바 높이(98px) + safe-area 만큼 잡는다 — `TabBarLayout` 이 본문에 주는 값과 같다.
 * 프로토타입도 상세 화면 스크롤 영역에 `padding-bottom:96px` 을 준다.
 *
 * **나중에 레이아웃으로 옮길 사람에게** — 옮길 자리는 `app/layouts/` 에 새로 만드는
 * `TradeTabBarLayout` 이고, 라우터에서 `StockCodeGuard` 아래 종목 상세만 그 레이아웃으로
 * 감싸면 된다(주문 화면은 아니다 — 그쪽은 `ActionBar` 를 쓴다). 옮기면 이 파일에서
 * `TradeTabBar` 렌더와 `pb-[...]` 를 함께 걷어내야 한다. 둘 중 하나만 지우면 바가
 * 사라지거나 빈 여백이 남는다.
 *
 * 매수/매도는 주문 화면으로 보낸다 (`?side=buy|sell`, ia.md §2).
 * **거래정지 종목은 진입을 막는다** (contracts C46 "뱃지 노출 + 매수·매도 차단").
 */
export function StockDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // 형식 검증은 `StockCodeGuard` 가 이미 했다. 여기 오면 6자리 문자열이다.
  const stockCode = params[STOCK_CODE_PARAM] ?? '';

  const activeTab = parseStockDetailTab(
    searchParams.get(STOCK_DETAIL_TAB_PARAM),
  );
  const period = parseCandlePeriod(searchParams.get(STOCK_DETAIL_PERIOD_PARAM));

  const detail = useStockDetail(stockCode);
  const quote = useStockQuote(stockCode);
  const toggleWatch = useToggleWatchlist();

  /**
   * 탭·기간은 URL 에 쓴다 (ia.md §2). `replace: true` 로 덮어써서 탭을 오간 횟수만큼
   * 히스토리가 쌓이지 않게 한다 — 뒤로가기는 종목 상세를 떠나는 동작이어야 한다.
   */
  const setParam = useCallback(
    (key: string, value: string) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set(key, value);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleTabChange = (tab: StockDetailTab) => {
    setParam(STOCK_DETAIL_TAB_PARAM, tab);
  };
  const handlePeriodChange = (next: CandlePeriod) => {
    setParam(STOCK_DETAIL_PERIOD_PARAM, next);
  };

  if (detail.isPending) {
    return (
      <PageMain>
        <Skeleton className="h-11 w-2/3" />
        <Skeleton className="mt-6 h-11 w-1/2" />
        <Skeleton className="mt-8 h-[220px] w-full" />
      </PageMain>
    );
  }

  if (detail.isError) {
    return (
      <PageMain>
        <div className="pt-10 text-center">
          <p className="text-title-3 text-text-primary">
            종목 정보를 불러오지 못했어요
          </p>
          <p className="mt-2 text-body-2 text-text-secondary">
            {detail.error.message}
          </p>
          <button
            type="button"
            onClick={() => void detail.refetch()}
            className="mt-5 text-label font-medium text-text-secondary underline underline-offset-[3px]"
          >
            다시 시도
          </button>
        </div>
      </PageMain>
    );
  }

  const data = detail.data;

  return (
    <>
      {/* 하단 고정 바에 마지막 내용이 가리지 않도록 여백을 준다. 위 주석 참고. */}
      <PageMain className="pb-[calc(98px+env(safe-area-inset-bottom))]">
        <StockDetailHeader
          detail={data}
          quote={quote.data}
          onToggleWatch={() => {
            toggleWatch.mutate({ stockCode, watched: data.watched });
          }}
          isTogglePending={toggleWatch.isPending}
        />

        {/* 보유 블록은 `holding !== null` 로만 판단한다 — 전량 매도하면 `null` 이
            내려온다 (contracts C76). 수량 0 으로 오지 않는다. */}
        {data.holding !== null && <StockHoldingBox holding={data.holding} />}

        <StockDetailTabNav activeTab={activeTab} onChange={handleTabChange} />

        {activeTab === 'chart' && (
          <StockChartTab
            stockCode={stockCode}
            period={period}
            onPeriodChange={handlePeriodChange}
            avgBuyPrice={data.holding?.avgBuyPrice ?? null}
          />
        )}
        {activeTab === 'info' && <StockInfoTab />}
        {activeTab === 'ai' && (
          <StockAiTab stockCode={stockCode} isActive={activeTab === 'ai'} />
        )}
      </PageMain>

      {/*
        거래정지면 매수·매도 진입 자체를 막는다 (contracts C46 · ia.md §1:130).
        바를 비활성 상태로 남기지 않고 렌더하지 않는다 — `TradeTabBar` 에 비활성
        변형(`.tstop`)이 없고, 사유는 헤더의 거래정지 안내가 이미 말하고 있다.
      */}
      {!data.suspended && (
        <TradeTabBar
          onBuy={() => {
            void navigate(`${ROUTES.stockOrder(stockCode)}?side=buy`);
          }}
          onSell={() => {
            void navigate(`${ROUTES.stockOrder(stockCode)}?side=sell`);
          }}
        />
      )}
    </>
  );
}
