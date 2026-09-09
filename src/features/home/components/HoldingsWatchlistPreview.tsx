import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { HOME_LIST_TAB_PARAM, ROUTES } from '@/shared/config/routes';
import { formatKrw } from '@/shared/lib/formatNumber';
import type { WatchlistSort } from '@/shared/types/stock';
import { ListEmpty } from '@/shared/ui/ListEmpty';
import { Skeleton } from '@/shared/ui/Skeleton';
import { StockRow } from '@/shared/ui/StockRow';

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
};

function HoldingsPanel({
  holdings,
  isPending,
  isError,
  onRetry,
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
          sub={item.held ? '보유 중' : undefined}
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
