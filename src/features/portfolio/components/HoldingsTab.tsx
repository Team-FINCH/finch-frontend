import { ROUTES } from '@/shared/config/routes';
import {
  formatKrw,
  formatSignedAmount,
  formatSignedRate,
  getPriceDirection,
} from '@/shared/lib/formatNumber';
import { type PortfolioSort } from '@/shared/types/portfolio';
import { LinkButton } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';
import { StockRow } from '@/shared/ui/StockRow';

import { usePortfolio } from '../api/usePortfolio';

type HoldingsTabProps = {
  sort: PortfolioSort;
  onSortChange: (sort: PortfolioSort) => void;
};

const SORT_OPTIONS: { value: PortfolioSort; label: string }[] = [
  { value: 'EVALUATION', label: '평가금액순' },
  { value: 'PROFIT_RATE', label: '수익률순' },
];

const DIRECTION_TEXT_CLASS = {
  rise: 'text-stock-up',
  fall: 'text-stock-down',
  flat: 'text-stock-neutral',
} as const;

/**
 * "보유" 탭 (프로토타입 `isPfHold` 블록). `GET /portfolio?sort=` 하나로 상단 자산
 * 요약과 보유 목록을 함께 그린다(apiSpec §8.1).
 */
export function HoldingsTab({ sort, onSortChange }: HoldingsTabProps) {
  const { data, isPending, isError, refetch } = usePortfolio(sort);

  if (isPending) {
    return (
      <div className="flex flex-col gap-3 pt-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-6 h-18 w-full" />
        <Skeleton className="h-18 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <p className="text-body-2 text-text-secondary">
          잔고를 불러오지 못했어요.
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="h-9.5 rounded-sm border border-border-strong px-4.5 text-label text-text-primary"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (data === undefined) {
    return null;
  }

  const { cashBalance, evaluationAmount, totalAsset, holdings } = data;
  const totalCost = holdings.reduce(
    (sum, holding) => sum + holding.avgBuyPrice * holding.quantity,
    0,
  );
  const totalProfit = evaluationAmount - totalCost;
  // `PercentSchema` 계열이 아니라 화면이 직접 만든 값이라 formatSignedRate 대신
  // formatSignedAmount 로 부호만 맞추고 %는 별도 계산한다.
  const totalProfitRate = totalCost === 0 ? 0 : (totalProfit / totalCost) * 100;
  const direction = getPriceDirection(totalProfit);

  return (
    <div className="pt-4">
      <p className="text-body-2 text-text-secondary">평가 자산</p>
      <p className="mt-1 text-title-1 text-text-primary tabular-nums">
        {formatKrw(totalAsset)}
      </p>

      <div className="mt-5.5 flex items-center justify-between">
        <span className="text-body-2 text-text-secondary">평가손익</span>
        <span
          className={`text-body-1 font-semibold tabular-nums ${DIRECTION_TEXT_CLASS[direction]}`}
        >
          {formatSignedAmount(totalProfit)}원 (
          {formatSignedRate(totalProfitRate)})
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-body-2 text-text-secondary">예수금</span>
        <span className="text-body-1 font-medium text-text-primary tabular-nums">
          {formatKrw(cashBalance)}
        </span>
      </div>

      <div className="mt-8 mb-3.5 flex items-baseline justify-between gap-3">
        <span className="text-title-3 text-text-primary">
          보유 종목{' '}
          <span className="text-caption text-text-secondary">
            {holdings.length}종목
          </span>
        </span>
        <span className="flex gap-1">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSortChange(option.value)}
              className={[
                'h-7 rounded-sm px-2.5 text-caption font-medium transition-colors duration-(--motion-fast) ease-standard',
                option.value === sort
                  ? 'bg-primary-soft text-text-primary'
                  : 'text-text-muted',
              ].join(' ')}
            >
              {option.label}
            </button>
          ))}
        </span>
      </div>

      {holdings.length === 0 ? (
        <EmptyState
          title="아직 보유한 종목이 없어요."
          description="관심있는 종목을 담아보세요."
          action={
            <LinkButton
              to={ROUTES.search}
              variant="secondary"
              className="w-auto px-6"
            >
              종목 둘러보기
            </LinkButton>
          }
        />
      ) : (
        <div className="flex flex-col">
          {holdings.map((holding) => (
            <StockRow
              key={holding.stockCode}
              stockCode={holding.stockCode}
              stockName={holding.stockName}
              to={ROUTES.stockDetail(holding.stockCode)}
              sub={`${holding.quantity}주 · 평균 ${formatKrw(holding.avgBuyPrice)}`}
              figures={{
                kind: 'holding',
                evaluationAmount: holding.evaluationAmount,
                evaluationProfitRate: holding.evaluationProfitRate,
                evaluationProfit: holding.evaluationProfit,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
