import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  StockAiTab,
  StockChartTab,
  StockDetailHeader,
  StockDetailTabNav,
  StockHoldingBox,
  parseCandleInterval,
  parseStockDetailTab,
  useStockDetail,
  useStockQuote,
  useToggleWatchlist,
  STOCK_DETAIL_INTERVAL_PARAM,
  STOCK_DETAIL_TAB_PARAM,
  type StockDetailTab,
} from '@/features/stocks';
import { isHttpError } from '@/shared/api';
import { ROUTES, STOCK_CODE_PARAM } from '@/shared/config/routes';
import { showToast } from '@/shared/hooks/useToastStore';
import { STOCK_ERROR_CODES } from '@/shared/types/errorCodes';
import {
  hasDetailQuoteValues,
  type CandleInterval,
} from '@/shared/types/stock';
import { PageMain } from '@/shared/ui/PageMain';
import { Skeleton } from '@/shared/ui/Skeleton';
import { TradeTabBar } from '@/shared/ui/TabBar';

/**
 * 종목 상세 — 시세·차트·AI 분석. `?tab=chart|ai` · `?interval=DAY|WEEK|MONTH`.
 *
 * **기업 탭(`?tab=info`)은 2026-09-11 에 뺐다** — 기업 정보 API 를 만들지 않기로
 * 확정했다(GitLab 이슈 #40). 옛 링크로 들어와도 `parseStockDetailTab` 이 기본
 * 탭(차트)으로 떨어뜨린다.
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
 * ## 스크롤 경계 — 머리와 현재가만 고정이고 나머지는 굴러간다
 *
 * 프로토타입은 `.nav` · 현재가 블록 · `.tabs` 를 **셋 다** `flex:none` 으로 두고
 * `.sc` 만 `overflow-y:auto` 로 굴린다 (새 디코드 L1696 · L1704 · L1741 · L1746).
 * **이 화면은 거기서 벗어난다** (FINCH-317, 2026-09-17 사용자 결정).
 * 모바일에서 그 고정 묶음이 화면 높이의 절반 가까이를 먹어 AI 분석 탭을 읽을 때
 * 남는 높이가 모자랐다. 실제 화면을 보고 정한 것이라 프로토타입과 맞추려고
 * 되돌리지 않는다 — 되돌리면 같은 답답함이 그대로 돌아온다.
 *
 * ```
 * 껍데기        h-dvh flex-col overflow-hidden  + --page-bottom-space:96px
 *   고정 묶음   헤더 · 현재가                    <- 굴러가지 않는다
 *   PageMain    flex-1 overflow-y-auto
 *     보유 카드                                 <- 굴러 올라가 사라진다
 *     탭 목록    sticky top-0                   <- 같이 올라가다 스크롤 위에 붙는다
 *     탭 내용
 *   TradeTabBar
 * ```
 *
 * 이 페이지도 `TabBarLayout` 과 같은 껍데기(`h-dvh flex-col overflow-hidden`)를
 * 직접 두른다 — `PageMain` 은 바깥이 높이가 고정된 세로 flex 일 때만 스크롤
 * 컨테이너가 된다. 탭 목록이 **어떻게** 붙는지(좌우 음수 마진 · 불투명 배경 ·
 * 위 여백을 `margin` 이 아니라 `padding` 으로 주는 이유)는
 * `features/stocks/components/StockDetailTabNav` 주석에 있다.
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
 * **시세가 없는 종목도 막는다** (contracts C102, 2026-09-17 결정) — 주문은 시장가뿐이라
 * 현재가가 없으면 예상 체결 금액을 만들 수 없고, 매도만 열어 두면 보유자가 금액을
 * 모른 채 파는 화면이 된다. 두 조건은 독립이고 함께 참일 수 있다(`TradeTabBar` 참고).
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

  // 스크롤 경계선(FINCH-326) — 고정 묶음 아래로 내용이 지나갈 때만 선을
  // 보인다. `PageMain` 은 고칠 수 없어(공유 컴포넌트) 이 껍데기의 ref 로
  // `<main>` 을 찾아 직접 리스너를 단다. `isScrolled` 는 `scrollTop` 이 0 을
  // 넘는 경계를 지날 때만 바뀌므로 매 스크롤 프레임마다 리렌더되지 않는다.
  const shellRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const scrollArea = shellRef.current?.querySelector('main');
    if (!scrollArea) {
      return;
    }

    const handleScroll = () => {
      const scrolled = scrollArea.scrollTop > 0;
      setIsScrolled((prev) => (prev === scrolled ? prev : scrolled));
    };

    handleScroll();
    scrollArea.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollArea.removeEventListener('scroll', handleScroll);
  }, [detail.isPending, detail.isError]);

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

  const handleIntervalChange = (next: CandleInterval) => {
    setParam(STOCK_DETAIL_INTERVAL_PARAM, next);
  };

  if (detail.isPending) {
    return (
      <PageMain className="pt-6">
        <Skeleton className="h-11 w-2/3" />
        <Skeleton className="mt-6 h-11 w-1/2" />
        <Skeleton className="mt-8 h-[150px] w-full" />
      </PageMain>
    );
  }

  if (detail.isError) {
    return (
      <PageMain className="pt-6">
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
    <div
      ref={shellRef}
      className="flex h-dvh flex-col overflow-hidden [--page-bottom-space:96px]"
    >
      {/* 고정 묶음 — 프로토타입 `.nav` 와 현재가 블록. 위 주석 "스크롤 경계" 참고.

          **두 티켓이 같은 어긋남을 각자 고쳤고 합쳐서 이 모양이 됐다.**
          한 화면에서 왼쪽 기준선이 15px 과 26px 로 갈려 있던 것이 문제였다 —
          이 묶음은 15px(`px-3.75`), 본문 `PageMain` 은 26px 이었다.
          `FINCH-319` 는 묶음을 26px 로 올리고 `‹` 만 헤더 안에서 음수
          마진으로 빼냈고, `FINCH-317` 은 26px 에 서야 할 보유 카드와 탭
          목록을 묶음 밖 `PageMain` 안으로 옮겼다. 어느 한쪽만으로는 부족했다 —
          319 만으로는 보유 카드가 고정된 채 화면 높이를 먹고, 317 만으로는
          현재가가 여전히 본문과 11px 어긋난다.

          좌우 26px(`px-6.5`)은 본문 `PageMain` 과 같은 값이다(FINCH-319).
          여기 남은 것은 헤더와 현재가뿐인데, 현재가는 본문과 같은 열에 서야
          하므로 15px 로 되돌리지 마라. `‹` 버튼만 15px 자리를 지키면 되고
          그것은 아래 `StockDetailHeader` 가 자기 음수 마진(`-mx-2.75`)으로 한다.

          `StockDetailTabNav` 의 `-mx-6.5 … px-6.5` 는 **이 줄이 아니라
          `PageMain` 의 26px 을 전제한다** — 317 이 그 줄을 `PageMain` 안으로
          옮겼다. 둘의 값이 같아 보이지만 기준이 다르므로 이 줄을 고쳐도 그쪽은
          따라오지 않는다.

          위 여백은 없다 — `PageHeader`·`SubPageHeader` 를 쓰는 다른 화면은 전부
          헤더가 화면 맨 위에 붙는다(둘 다 `pt` 없이 높이만 정해져 있다). 여기만
          24px 을 주면 제목이 다른 화면보다 내려와 보인다.

          아래 `border-b` 는 항상 그려 두고 색만 바꾼다 — `isScrolled` 를 따라
          클래스 자체를 넣었다 뺐다 하면 1px 만큼 높이가 바뀌어 스크롤이
          맨 위로 돌아오는 순간 그 아래 내용이 1px 튄다. 투명 → `--color-border`
          로 색만 바꾸면 높이는 그대로다. 맨 위에서 투명인 것은 잘리는 내용이
          없어 선이 군더더기이기 때문이다(FINCH-326). */}
      <div
        className={`mx-auto w-full max-w-md flex-none border-b px-6.5 transition-colors duration-(--motion-normal) ease-standard ${
          isScrolled ? 'border-border' : 'border-transparent'
        }`}
      >
        <StockDetailHeader
          detail={data}
          quote={quote.snapshot}
          onToggleWatch={() => {
            const { stockName, watched } = data;

            toggleWatch.mutate(
              { stockCode, watched },
              {
                // 종목명이 있는 자리가 여기뿐이라 훅이 아니라 호출부에 붙였다.
                // `useToggleWatchlist` 의 variables 에는 종목코드만 있다.
                onSuccess: () => {
                  showToast(
                    watched
                      ? `${stockName}를 관심 종목에서 뺐어요.`
                      : `${stockName}를 관심 종목에 담았어요.`,
                  );
                },
                // **50건 초과 하나만 붙인다.** 다른 실패(이미 담김·네트워크)는
                // 지금처럼 조용히 둔다 — 실패 문구의 위계는 디자인 파트가
                // `design.md` 에 쓰는 중이고(이슈 #54 회신) 그 전에 우리가
                // 자리마다 문구를 지어내면 나중에 두 판이 어긋난다.
                // 이 한 줄만 예외인 이유는 디자인이 문구를 확정해 줬기 때문이다.
                onError: (error) => {
                  if (
                    isHttpError(error) &&
                    error.code === STOCK_ERROR_CODES.WATCHLIST_LIMIT_EXCEEDED
                  ) {
                    showToast(
                      '관심 종목은 50개까지 담을 수 있어요. 홈의 관심 종목에서 하나 빼고 담아주세요.',
                    );
                  }
                },
              },
            );
          }}
          isTogglePending={toggleWatch.isPending}
        />
      </div>

      {/* 보유 카드부터 아래가 전부 굴러간다. 탭 내용의 위 여백은 각 탭이 스스로
          갖는다(프로토타입 18px). */}
      <PageMain className="pt-0">
        {/* 보유 블록은 `holding !== null` 로만 판단한다 — 전량 매도하면 `null` 이
            내려온다 (contracts C76). 수량 0 으로 오지 않는다.
            **없는 종목에서는 탭 목록이 헤더 바로 아래에 온다** — 탭 목록의 위 여백이
            자기 `padding` 이라 이 카드의 유무와 무관하게 같은 값으로 선다. */}
        {data.holding !== null && <StockHoldingBox holding={data.holding} />}

        <StockDetailTabNav activeTab={activeTab} onChange={handleTabChange} />

        {activeTab === 'chart' && (
          <StockChartTab
            stockCode={stockCode}
            interval={interval}
            onIntervalChange={handleIntervalChange}
            avgBuyPrice={data.holding?.avgBuyPrice ?? null}
            suspended={data.suspended}
            suspendedReason={data.suspendedReason}
            currentPrice={data.currentPrice}
          />
        )}
        {activeTab === 'ai' && (
          <StockAiTab
            stockCode={stockCode}
            stockName={data.stockName}
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
      {/* 종목 맥락을 AI 진입 버튼에 넘긴다 —
          `/chat?screen=stock_detail&ticker=…&stockName=…`
          (프로토타입 `openChatCtx`, 새 디코드 L3555). 경로 파라미터는 검증만 거친
          평범한 문자열이라 브랜드 타입이 붙은 응답 값을 쓴다.
          **종목명도 함께 넘긴다** (FINCH-248) — 채팅 빈 상태 문구가 쓰는 것은
          코드가 아니라 이름인데, 채팅 화면은 이름 하나를 얻으려고 상세를 다시 부를 수
          없다. 그 호출 자체가 최근 본 종목 기록이다(contracts C51). 이 화면은 이미
          받아 둔 값을 갖고 있으므로 여기서 얹는다. */}
      <TradeTabBar
        stockCode={data.stockCode}
        stockName={data.stockName}
        suspended={data.suspended}
        priceUnavailable={!hasDetailQuoteValues(data)}
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
