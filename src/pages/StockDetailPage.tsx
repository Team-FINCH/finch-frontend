import { useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  StockAiTab,
  StockChartTab,
  StockDetailHeader,
  StockDetailTabNav,
  StockHoldingBox,
  StockInfoTab,
  parseCandleInterval,
  parseStockDetailTab,
  useStockDetail,
  useStockQuote,
  useToggleWatchlist,
  STOCK_DETAIL_INTERVAL_PARAM,
  STOCK_DETAIL_TAB_PARAM,
  type StockDetailTab,
} from '@/features/stocks';
import { ROUTES, STOCK_CODE_PARAM } from '@/shared/config/routes';
import { type CandleInterval } from '@/shared/types/stock';
import { PageMain } from '@/shared/ui/PageMain';
import { Skeleton } from '@/shared/ui/Skeleton';
import { TradeTabBar } from '@/shared/ui/TabBar';

/**
 * 종목 상세 — 시세·차트·기업정보·AI 분석. `?tab=chart|info|ai` · `?interval=DAY|WEEK|MONTH`.
 *
 * **`/stocks/:stockCode` 와 `?tab=ai` 는 프론트 혼자 정하는 값이 아니다** — 브리핑
 * 응답의 `deeplink` 를 AI 서버가 이 경로 문자열로 만들어 내려보낸다 (`ia.md` §2).
 *
 * **`?interval=` 은 ia.md 의 쿼리 파라미터 표에 아직 없는 파라미터다** — 봉 종류
 * 탭이 쓴다. `interval` 자체는 apiSpec §5.3(v0.8.4 확정 · 이슈 #37 회신)로
 * 확정됐고, ia.md §2 가 잠근 `?period=1M|3M|1Y|3Y` 는 이 화면 어디서도 바꾸지
 * 않는다(근거는 `@/shared/types/candleInterval.ts` ·
 * `features/stocks/lib/stockDetailParams.ts` 머리 주석 참고).
 *
 * 티켓: FINCH-38, FINCH-50.
 *
 * 근거: `ia.md` §1 "탐색·거래" 표, §2 라우트 트리(쿼리 파라미터 표) ·
 * 프로토타입 `finch-prototype.html` 의 `isDetail` 블록.
 * API: `GET /api/v1/stocks/{stockCode}` ·
 * `GET /api/v1/stocks/{stockCode}/candles?period=&interval=` ·
 * `GET /api/v1/stocks/{stockCode}/price` · `POST`/`DELETE /api/v1/watchlist`.
 *
 * ## 스크롤 경계 — 머리·시세·탭은 고정이고 탭 내용만 굴러간다
 *
 * 프로토타입은 `.nav` · 현재가 블록 · `.tabs` 를 `flex:none` 으로 두고 `.sc` 만
 * `overflow-y:auto` 로 굴린다 (새 디코드 L1696 · L1704 · L1741 · L1746). 그래서
 * 이 페이지도 `TabBarLayout` 과 같은 껍데기(`h-dvh flex-col overflow-hidden`)를
 * 직접 두르고, 고정 묶음을 껍데기에 두고 탭 내용만 `PageMain` 에 담는다 —
 * `PageMain` 은 바깥이 높이가 고정된 세로 flex 일 때만 스크롤 컨테이너가 된다.
 *
 * `app/layouts/TabBarLayout` 을 그대로 쓸 수 없다 — 그 레이아웃은 나브 변형
 * (`TabBar`)을 함께 렌더해서 홈·탐색·포트폴리오·마이페이지 탭이 잘못 뜬다.
 * `--page-bottom-space` 는 프로토타입이 이 화면에 직접 적은 96px 이다
 * (탭 바가 있는 상시 화면의 132px 이 아니다).
 *
 * ## 하단 바를 이 페이지가 직접 렌더하는 이유
 *
 * **`TradeTabBar` 를 페이지 안에서 렌더한다. 레이아웃이 아니다.** 종목 상세는
 * 라우터에서 `TabBarLayout` 밖, `StockCodeGuard` 아래에 있다. `app/router.tsx` 가
 * 스스로 적어 둔 대로 "`TradeTabBar` 를 다는 레이아웃은 아직 없다 — 그 배선은 이
 * 티켓 범위 밖이라 만들지 않았다". 라우터와 `app/layouts/**` 는 이 티켓에서
 * 건드리지 않는 파일이라 새 레이아웃을 만들 수도 없다.
 *
 * **나중에 레이아웃으로 옮길 사람에게** — 옮길 자리는 `app/layouts/` 에 새로 만드는
 * `TradeTabBarLayout` 이고, 라우터에서 `StockCodeGuard` 아래 종목 상세만 그 레이아웃으로
 * 감싸면 된다(주문 화면은 아니다 — 그쪽은 `ActionBar` 를 쓴다). 옮기면 이 파일에서
 * 껍데기 `div` 와 `TradeTabBar` 렌더를 함께 걷어내야 한다. 둘 중 하나만 지우면
 * 바가 사라지거나 스크롤 경계가 무너진다.
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
  const interval = parseCandleInterval(
    searchParams.get(STOCK_DETAIL_INTERVAL_PARAM),
  );

  const detail = useStockDetail(stockCode);
  const quote = useStockQuote(stockCode);
  const toggleWatch = useToggleWatchlist();

  /**
   * 탭·봉 종류는 URL 에 쓴다 (탭은 ia.md §2, 봉 종류는 위 주석 참고).
   * `replace: true` 로 덮어써서 탭을 오간 횟수만큼 히스토리가 쌓이지 않게 한다 —
   * 뒤로가기는 종목 상세를 떠나는 동작이어야 한다.
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

  /**
   * 내 보유 요약 카드를 누르면 차트 탭으로 바꾸고 `내 보유 상세` 로 스크롤한다
   * (프로토타입 `scrollToHold` — 새 디코드 L3465).
   *
   * 탭을 바꾸면 그 자리 DOM 이 이번 렌더 뒤에 붙으므로 같은 틱에서는 앵커를 못
   * 찾는다. `requestAnimationFrame` 으로 한 프레임 미뤄 커밋된 뒤에 찾는다 —
   * 이미 차트 탭이면 바꿀 것이 없어 그 프레임에 바로 스크롤된다.
   */
  const handleHoldingPress = () => {
    setParam(STOCK_DETAIL_TAB_PARAM, 'chart');
    requestAnimationFrame(() => {
      document
        .getElementById('hold-detail')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };
  const handleIntervalChange = (next: CandleInterval) => {
    setParam(STOCK_DETAIL_INTERVAL_PARAM, next);
  };

  if (detail.isPending) {
    return (
      <PageMain>
        <Skeleton className="h-11 w-2/3" />
        <Skeleton className="mt-6 h-11 w-1/2" />
        <Skeleton className="mt-8 h-[150px] w-full" />
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
    <div className="flex h-dvh flex-col overflow-hidden [--page-bottom-space:96px]">
      {/* 고정 묶음 — 프로토타입 `.nav` · 현재가 블록 · `.tabs`. 위 주석 참고.
          좌우 26px 과 위 24px 은 `PageMain` 이 주던 값을 그대로 가져온 것이다. */}
      <div className="mx-auto w-full max-w-md flex-none px-6.5 pt-6">
        <StockDetailHeader
          detail={data}
          quote={quote.snapshot}
          onToggleWatch={() => {
            toggleWatch.mutate({ stockCode, watched: data.watched });
          }}
          isTogglePending={toggleWatch.isPending}
        />

        {/* 보유 블록은 `holding !== null` 로만 판단한다 — 전량 매도하면 `null` 이
            내려온다 (contracts C76). 수량 0 으로 오지 않는다. */}
        {data.holding !== null && (
          <StockHoldingBox
            holding={data.holding}
            onPress={handleHoldingPress}
          />
        )}

        <StockDetailTabNav activeTab={activeTab} onChange={handleTabChange} />
      </div>

      {/* 탭 내용만 굴러간다. 위 여백은 각 탭이 스스로 갖는다(프로토타입 18px). */}
      <PageMain className="pt-0">
        {activeTab === 'chart' && (
          <StockChartTab
            stockCode={stockCode}
            interval={interval}
            onIntervalChange={handleIntervalChange}
            avgBuyPrice={data.holding?.avgBuyPrice ?? null}
            suspended={data.suspended}
            suspendedReason={data.suspendedReason}
            currentPrice={data.currentPrice}
            holding={data.holding}
          />
        )}
        {activeTab === 'info' && <StockInfoTab />}
        {activeTab === 'ai' && (
          <StockAiTab
            stockCode={stockCode}
            isActive={activeTab === 'ai'}
            owned={data.holding !== null}
          />
        )}
      </PageMain>

      {/*
        거래정지면 매수·매도 진입 자체를 막는다 (contracts C46 · ia.md §1:130).
        **바를 숨기지 않고 비활성 캡슐로 바꾼다** — 전에는 렌더 자체를 걷어냈는데
        `TradeTabBar` 에 비활성 변형이 없어서였다. design.md v2.2 가 그 변형을
        명세로 올려 만들었다(FINCH-166). 바가 사라지면 하단 여백만 남아
        화면이 잘린 것처럼 보이고, 왜 살 수 없는지도 바 자리에서 말해 주는 편이 낫다.
      */}
      {/* 종목 맥락을 AI 진입 버튼에 넘긴다 — `/chat?screen=stock_detail&ticker=…`
          (프로토타입 `openChatCtx`, 새 디코드 L3555). 경로 파라미터는 검증만 거친
          평범한 문자열이라 브랜드 타입이 붙은 응답 값을 쓴다. */}
      <TradeTabBar
        stockCode={data.stockCode}
        suspended={data.suspended}
        onBuy={() => {
          void navigate(`${ROUTES.stockOrder(stockCode)}?side=buy`);
        }}
        onSell={() => {
          void navigate(`${ROUTES.stockOrder(stockCode)}?side=sell`);
        }}
      />
    </div>
  );
}
