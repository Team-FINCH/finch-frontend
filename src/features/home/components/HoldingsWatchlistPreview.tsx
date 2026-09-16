import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { HOME_LIST_TAB_PARAM, ROUTES } from '@/shared/config/routes';
import { formatKrw, formatSignedRate } from '@/shared/lib/formatNumber';
import { formatMarketLabel } from '@/shared/lib/marketLabel';
import type { AiBriefingItem } from '@/shared/types/ai/briefing';
import type { PortfolioSort } from '@/shared/types/portfolio';
import type { WatchlistSort } from '@/shared/types/stock';
import { ListEmpty } from '@/shared/ui/ListEmpty';
import { Skeleton } from '@/shared/ui/Skeleton';
import { StockRow } from '@/shared/ui/StockRow';

import { useHomeBriefing } from '../api/useHomeBriefing';
import type { useHomeData } from '../model/useHomeData';

/**
 * 미리보기는 3개다 (프로토타입 `hk.slice(0,3)`·`sortWatch(s.watch).slice(0,3)`,
 * design.md L342 "2~3개"). 더 보고 싶으면 아래 "전체 보기" 로 나간다.
 */
const PREVIEW_COUNT = 3;

/**
 * 관심 종목 정렬 (프로토타입 `watchSorts`). 라벨과 apiSpec §6.3 `sort` 열거값이
 * 그대로 대응한다 — 화면에서 다시 정렬하지 않고 서버가 정렬한 순서를 쓴다.
 */
const WATCH_SORTS: readonly { value: WatchlistSort; label: string }[] = [
  { value: 'REGISTERED', label: '등록순' },
  { value: 'NAME', label: '이름순' },
  { value: 'CHANGE_RATE', label: '등락률순' },
];

/**
 * 내 종목 정렬 (티켓 FINCH-292). `WATCH_SORTS` 와 같은 원칙이다 — 라벨은
 * apiSpec §8.1 `sort` 열거값과 그대로 대응하고, 화면에서 다시 정렬하지 않는다.
 * 가짓수가 둘뿐인 것은 서버가 그 둘만 지원해서다.
 */
const HOLDINGS_SORTS: readonly { value: PortfolioSort; label: string }[] = [
  { value: 'EVALUATION', label: '평가금액순' },
  { value: 'PROFIT_RATE', label: '수익률순' },
];

/**
 * 관심 종목 행의 관련 소식 (프로토타입 `watchPreview` 의 `hint`).
 *
 * 브리핑 항목의 `relatedTickers` 를 종목별로 센다 — 브리핑 응답이 종목별 소식
 * 개수를 따로 주지 않아서 프론트가 세는 수밖에 없다. 요약은 **먼저 나온 항목의
 * `title`** 이다. 응답은 `rank` 순으로 오므로(AI 명세 §8) 먼저 나온 것이 가장
 * 관련이 높다.
 */
type WatchRowNews = { count: number; summary: string };

function toWatchNewsMap(
  items: readonly AiBriefingItem[],
): Map<string, WatchRowNews> {
  const map = new Map<string, WatchRowNews>();
  for (const item of items) {
    for (const ticker of item.relatedTickers) {
      const prev = map.get(ticker);
      map.set(
        ticker,
        prev === undefined
          ? { count: 1, summary: item.title }
          : { count: prev.count + 1, summary: prev.summary },
      );
    }
  }
  return map;
}

/**
 * 관심 종목 행의 보조 두 줄 (프로토타입 `watchPreview` — `sub` 와 `hint`).
 *
 * **종목코드는 이 줄에 적지 않는다** (2026-09-16 결정). 검색 결과와 달리 관심
 * 목록은 코드로 찾아 들어오는 경로가 아니라서 코드를 다시 보여줄 이유가 없다.
 * 첫 줄은 시장이다 — `GET /watchlist` 가 `market` 을 보내기 시작했다(백엔드
 * 확인, 2026-09-16). 아직 안 오는 경로가 있을 수 있어(`WatchlistItemSchema`
 * 주석 참고) `market` 이 `undefined` 면 첫 줄 자체를 그리지 않는다 — 빈 자리에
 * 구분점만 남기지 않는다.
 *
 * **`보유 중` 은 이 줄에서 뺐다.** 이제 종목명 옆 칩(`StockRow` 의 `held`
 * prop)이 그린다 — 두 자리에서 같은 사실을 말하지 않는다.
 *
 * **거래정지 태그는 없다.** 응답에 `suspended` 가 없다 (GitLab #67). 그래서
 * 프로토타입이 거래정지일 때 힌트를 지우는 분기도 만들지 못한다.
 *
 * 두 줄 모두 `StockRow` 가 감싸는 `--color-text-secondary` 를 그대로 쓴다.
 * 프로토타입은 첫 줄을 `--t3` 로 한 단계 낮추지만, 그 색은 흰 배경 대비 3.90 이라
 * 이 레포가 읽어야 하는 정보에는 쓰지 않기로 했다 (`StockRow` 의 `rank` 주석).
 */
function WatchRowSub({
  market,
  news,
  changeRate,
}: {
  /** `undefined` 면 시장 줄을 그리지 않는다(`WatchlistItemSchema` 주석) */
  market: string | undefined;
  news: WatchRowNews | undefined;
  /** `null` 이면 시세 없음(apiSpec §5.4) — 등락률 폴백 힌트를 만들지 못한다 */
  changeRate: number | null;
}) {
  const hint =
    news !== undefined
      ? `관련 소식 ${news.count}건 · ${news.summary}`
      : changeRate === null
        ? '시세 없음'
        : `오늘 ${formatSignedRate(changeRate)} 움직인 이유 보기`;

  return (
    <span className="flex min-w-0 flex-col gap-0.75">
      {market === undefined ? null : (
        <span className="truncate">{formatMarketLabel(market)}</span>
      )}
      <span className="truncate">{hint}</span>
    </span>
  );
}

type Tab = 'holdings' | 'watchlist';

type HoldingsWatchlistPreviewProps = Pick<
  ReturnType<typeof useHomeData>,
  | 'holdings'
  | 'holdingsPending'
  | 'holdingsError'
  | 'holdingsRefetch'
  | 'watchItems'
  | 'watchPending'
  | 'watchError'
  | 'watchRefetch'
> & {
  /** 내 종목 정렬. 쿼리를 가진 `useHomeData` 와 같은 값을 써야 해서 페이지가 갖는다 */
  holdingsSort: PortfolioSort;
  onHoldingsSortChange: (sort: PortfolioSort) => void;
  /** 관심 종목 정렬. 쿼리를 가진 `useHomeData` 와 같은 값을 써야 해서 페이지가 갖는다 */
  watchSort: WatchlistSort;
  onWatchSortChange: (sort: WatchlistSort) => void;
};

/**
 * 홈의 "내 종목 · 관심 종목" 미리보기 (ia.md §1 "홈·자산", 프로토타입
 * `showMyStocks`·`showWatchStocks` 토글).
 *
 * **관심 종목에는 "전체 보기"가 없다.** 프로토타입엔 `goWatchAll` 버튼이 있지만
 * ia.md §1 "관심 종목은 독립 화면을 갖지 않는다"가 확정 결정이라 이동할 라우트
 * 자체가 없다 — 버튼을 만들지 않고, 미리보기보다 많으면 개수만 알린다.
 *
 * 내 종목의 "전체 보기"는 `/portfolio`(다른 워커 소관 화면)로 보낸다 — 라우트만
 * 쓰고 그 화면 파일은 건드리지 않는다.
 */
export function HoldingsWatchlistPreview({
  holdings,
  holdingsPending,
  holdingsError,
  holdingsRefetch,
  holdingsSort,
  onHoldingsSortChange,
  watchItems,
  watchPending,
  watchError,
  watchRefetch,
  watchSort,
  onWatchSortChange,
}: HoldingsWatchlistPreviewProps) {
  /**
   * 기본 탭은 내 종목이다. 온보딩을 마치고 오면 관심 종목 탭이 열려야 하므로
   * (design.md §7.16 "완료 후 홈") 쿼리 파라미터로 첫 탭을 받는다.
   * 모르는 값이면 내 종목이다 — 주소를 손으로 고친 경우다.
   */
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(
    searchParams.get(HOME_LIST_TAB_PARAM) === 'watch'
      ? 'watchlist'
      : 'holdings',
  );

  return (
    <section className="mt-8.5">
      <div className="mb-2 flex items-baseline gap-5">
        <TabButton
          active={tab === 'holdings'}
          onClick={() => setTab('holdings')}
        >
          내 종목
        </TabButton>
        <TabButton
          active={tab === 'watchlist'}
          onClick={() => setTab('watchlist')}
        >
          관심 종목
        </TabButton>
      </div>

      {tab === 'holdings' ? (
        <HoldingsPanel
          holdings={holdings}
          isPending={holdingsPending}
          isError={holdingsError}
          onRetry={() => holdingsRefetch()}
          sort={holdingsSort}
          onSortChange={onHoldingsSortChange}
        />
      ) : (
        <WatchlistPanel
          items={watchItems}
          isPending={watchPending}
          isError={watchError}
          onRetry={() => watchRefetch()}
          sort={watchSort}
          onSortChange={onWatchSortChange}
        />
      )}
    </section>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative pb-2 text-section-title ${
        active ? 'text-text-primary' : 'text-text-secondary'
      }`}
    >
      {children}
      {/* 밑줄 인디케이터 (`.tabu>i`) — 좌우 12% 들여쓴 1.5px 막대를 opacity 로 켠다.
          색만으로 가르면 선택 상태가 약하게 읽힌다. */}
      <span
        aria-hidden="true"
        className={`absolute right-[12%] bottom-[3px] left-[12%] h-[1.5px] rounded-[1px] bg-text-primary transition-opacity duration-(--motion-normal) ease-standard ${
          active ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </button>
  );
}

/**
 * 낮춘 텍스트 동작 (`전체 보기 ›`). 테두리 버튼으로 만들면 목록보다 눈에 먼저
 * 들어온다 — 프로토타입도 이 자리를 `--t2` 텍스트로 낮춰 둔다.
 */
function ShowAllLink({ to }: { to: string }) {
  return (
    <Link
      to={to}
      className="mt-3 flex w-full items-center justify-center gap-1.25 py-3 text-label font-medium text-text-secondary"
    >
      전체 보기
      <span
        aria-hidden="true"
        className="text-label leading-none text-text-muted"
      >
        ›
      </span>
    </Link>
  );
}

function PreviewSkeleton() {
  return (
    <div className="flex flex-col gap-3 pt-2">
      <Skeleton className="h-18 w-full" />
      <Skeleton className="h-18 w-full" />
    </div>
  );
}

function PreviewError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="pt-2">
      <p className="text-body-2 font-medium text-text-secondary">
        불러오지 못했어요
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 text-label font-medium text-text-primary underline underline-offset-3"
      >
        다시 시도
      </button>
    </div>
  );
}

type HoldingsPanelProps = {
  holdings: ReturnType<typeof useHomeData>['holdings'];
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  sort: PortfolioSort;
  onSortChange: (sort: PortfolioSort) => void;
};

function HoldingsPanel({
  holdings,
  isPending,
  isError,
  onRetry,
  sort,
  onSortChange,
}: HoldingsPanelProps) {
  if (isPending) {
    return <PreviewSkeleton />;
  }
  if (isError) {
    return <PreviewError onRetry={onRetry} />;
  }
  if (holdings.length === 0) {
    return (
      <ListEmpty
        className="py-7"
        title="아직 보유 종목이 없어요."
        description="한 종목만 담아도 진단과 주문 전 점검을 볼 수 있어요."
      />
    );
  }

  const preview = holdings.slice(0, PREVIEW_COUNT);

  return (
    <div className="flex flex-col">
      {/* 정렬 (`WATCH_SORTS`와 같은 원칙). 목록이 있을 때만 나온다 */}
      <div className="flex items-center gap-3.5 pb-2.5">
        {HOLDINGS_SORTS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSortChange(option.value)}
            aria-pressed={option.value === sort}
            className={`py-0.5 text-caption ${
              option.value === sort
                ? 'font-bold text-text-primary'
                : 'font-medium text-text-muted'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {preview.map((holding) => (
        <StockRow
          key={holding.stockCode}
          stockCode={holding.stockCode}
          stockName={holding.stockName}
          to={ROUTES.stockDetail(holding.stockCode)}
          sub={`${holding.quantity}주 · ${formatKrw(holding.avgBuyPrice)}`}
          figures={{
            kind: 'holding',
            evaluationAmount: holding.evaluationAmount,
            evaluationProfitRate: holding.evaluationProfitRate,
            // `StockRow` 가 이미 그리는 값이다(`figures.evaluationProfit`) — 응답에도
            // 있는데 여기서만 넘기지 않아 변동금액 줄이 비어 있었다.
            evaluationProfit: holding.evaluationProfit,
          }}
        />
      ))}
      <ShowAllLink to={ROUTES.portfolio} />
    </div>
  );
}

type WatchlistPanelProps = {
  items: ReturnType<typeof useHomeData>['watchItems'];
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  sort: WatchlistSort;
  onSortChange: (sort: WatchlistSort) => void;
};

function WatchlistPanel({
  items,
  isPending,
  isError,
  onRetry,
  sort,
  onSortChange,
}: WatchlistPanelProps) {
  /**
   * 브리핑을 새로 부르지 않는다. 같은 홈 화면의 `BriefingSection` 이 이미 같은
   * 쿼리 키(`queryKeys.ai.briefing()`)로 받아 뒀고, TanStack Query 가 그 캐시를
   * 그대로 준다 — 요청은 한 번만 나간다.
   *
   * 실패하거나 아직 안 왔으면 소식이 없는 것으로 본다. 관심 목록이 브리핑을
   * 기다리지 않는다 — 힌트는 보조 정보이고, 없으면 등락률 폴백이 대신한다.
   */
  const briefing = useHomeBriefing();
  const news = toWatchNewsMap(briefing.data?.content.items ?? []);

  if (isPending) {
    return <PreviewSkeleton />;
  }
  if (isError) {
    return <PreviewError onRetry={onRetry} />;
  }
  if (items.length === 0) {
    return (
      <ListEmpty
        className="py-6"
        title="아직 관심 종목이 없어요."
        description="종목을 담으면 관련 소식과 분석을 한곳에서 볼 수 있어요."
        action={
          // `.chip.sel` — 34px 캡슐, 검정 면. 테두리 버튼으로 만들면 회색 면 위에서
          // 안내와 동작의 위계가 뒤집힌다.
          <Link
            to={ROUTES.search}
            className="inline-flex h-8.5 items-center rounded-[11px] bg-primary px-3.5 text-label font-medium text-surface"
          >
            종목 찾아보기
          </Link>
        }
      />
    );
  }

  const preview = items.slice(0, PREVIEW_COUNT);

  return (
    <div className="flex flex-col">
      {/* 정렬 (프로토타입 `watchSorts`). 목록이 있을 때만 나온다 */}
      <div className="flex items-center gap-3.5 pb-2.5">
        {WATCH_SORTS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSortChange(option.value)}
            aria-pressed={option.value === sort}
            className={`py-0.5 text-caption ${
              option.value === sort
                ? 'font-bold text-text-primary'
                : 'font-medium text-text-muted'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {preview.map((item) => (
        <StockRow
          key={item.stockCode}
          stockCode={item.stockCode}
          stockName={item.stockName}
          to={ROUTES.stockDetail(item.stockCode)}
          held={item.held}
          sub={
            <WatchRowSub
              market={item.market}
              news={news.get(item.stockCode)}
              changeRate={item.changeRate}
            />
          }
          figures={{
            kind: 'quote',
            currentPrice: item.currentPrice,
            changeRate: item.changeRate,
          }}
        />
      ))}
      {items.length > PREVIEW_COUNT ? (
        <p className="pt-3 text-center text-caption text-text-muted">
          관심 종목 {items.length}개 중 {PREVIEW_COUNT}개
        </p>
      ) : null}
    </div>
  );
}
