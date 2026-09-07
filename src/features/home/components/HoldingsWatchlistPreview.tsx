import { useState } from 'react';

import { ROUTES } from '@/shared/config/routes';
import { formatKrw } from '@/shared/lib/formatNumber';
import { LinkButton } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';
import { StockRow } from '@/shared/ui/StockRow';

import type { useHomeData } from '../model/useHomeData';

const PREVIEW_COUNT = 5;

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
>;

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
}: HoldingsWatchlistPreviewProps) {
  const [tab, setTab] = useState<Tab>('holdings');

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
      className={`text-caption font-medium ${active ? 'text-text-primary' : 'text-text-muted'}`}
    >
      {children}
    </button>
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
      <EmptyState
        className="py-7"
        title="아직 보유 종목이 없어요."
        description="한 종목만 담아도 진단과 주문 전 점검을 볼 수 있어요."
      />
    );
  }

  const preview = holdings.slice(0, PREVIEW_COUNT);

  return (
    <div className="flex flex-col divide-y divide-border">
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
      <div className="pt-3">
        <LinkButton
          to={ROUTES.portfolio}
          variant="secondary"
          className="min-h-11"
        >
          전체 보기
        </LinkButton>
      </div>
    </div>
  );
}

type WatchlistPanelProps = {
  items: ReturnType<typeof useHomeData>['watchItems'];
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
};

function WatchlistPanel({
  items,
  isPending,
  isError,
  onRetry,
}: WatchlistPanelProps) {
  if (isPending) {
    return <PreviewSkeleton />;
  }
  if (isError) {
    return <PreviewError onRetry={onRetry} />;
  }
  if (items.length === 0) {
    return (
      <EmptyState
        className="py-6"
        title="아직 관심 종목이 없어요."
        description="눈여겨보는 종목을 담아보세요."
        action={
          <LinkButton
            to={ROUTES.search}
            variant="secondary"
            className="min-h-11"
          >
            종목 찾아보기
          </LinkButton>
        }
      />
    );
  }

  const preview = items.slice(0, PREVIEW_COUNT);

  return (
    <div className="flex flex-col divide-y divide-border">
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
