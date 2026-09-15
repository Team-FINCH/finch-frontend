import { useMemo } from 'react';
import { Link } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';
import {
  applyQuoteToHolding,
  evaluationTotals,
  toQuoteMap,
} from '@/shared/lib/applyQuotes';
import {
  formatAmount,
  formatSignedAmount,
  formatSignedRate,
  getPriceDirection,
} from '@/shared/lib/formatNumber';
import { type Holding, type PortfolioSort } from '@/shared/types/portfolio';
import { ListEmpty } from '@/shared/ui/ListEmpty';
import { RollingNumber } from '@/shared/ui/RollingNumber';
import { Skeleton } from '@/shared/ui/Skeleton';
import { StockInitialBadge } from '@/shared/ui/StockInitialBadge';

import { usePortfolio } from '../api/usePortfolio';
import { usePortfolioStockQuotes } from '../api/usePortfolioStockQuotes';

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
 *
 * **헤드라인은 `평가 자산` 이라는 라벨 그대로 평가금액 합계를 넣는다.** 예전에는
 * `totalAsset`(예수금 + 평가금액)을 넣었는데, 바로 아래 줄에 예수금이 또 나와 같은
 * 돈을 두 번 세는 것처럼 읽혔다. 프로토타입도 `evalTotal` 을 넣는다(proto L2156).
 *
 * **보유 행은 `shared/ui/StockRow` 를 쓰지 않는다.** 프로토타입의 이 자리는 2단
 * 행이다 — 위 줄에 이름과 평가금액, 아래 줄에 수량·평단·비중과 손익을 놓아 위계를
 * 만든다(proto L2189-2205). `StockRow` 는 홈·탐색·종목 상세가 함께 쓰는 1단 행이라
 * 여기 모양으로 바꿀 수 없다.
 */
export function HoldingsTab({ sort, onSortChange }: HoldingsTabProps) {
  const { data, isPending, isError, refetch } = usePortfolio(sort);

  const stockCodes = useMemo(
    () => data?.holdings.map((holding) => holding.stockCode) ?? [],
    [data],
  );
  const quotes = usePortfolioStockQuotes(stockCodes);
  const quoteMap = useMemo(
    () => toQuoteMap(quotes.snapshot?.items ?? []),
    [quotes.snapshot],
  );
  // 홈과 같은 함수로 실시간 시세를 얹는다 — 서버 응답 시점의 값에 머물지 않는다
  // (`shared/lib/applyQuotes`, 티켓 273).
  const holdings = useMemo(
    () =>
      (data?.holdings ?? []).map((holding) =>
        applyQuoteToHolding(holding, quoteMap),
      ),
    [data, quoteMap],
  );
  const totals = useMemo(() => evaluationTotals(holdings), [holdings]);

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

  const { cashBalance, evaluationAmount } = data;
  // 홈과 같은 규칙(`shared/lib/applyQuotes` 의 `evaluationTotals`, 계약 C93)으로 낸
  // 합계다 — 시세 없는 종목은 분자·분모에서 함께 빠진다.
  const { profit: totalProfit, rate: totalProfitRate } = totals;
  const direction = getPriceDirection(totalProfit);
  const hasHoldings = holdings.length > 0;

  return (
    <div className="pt-4">
      <p className="text-caption text-text-muted">평가 자산</p>
      {/*
        프로토타입 `.d36` (36px/44px/700, -.03em) + `원` 은 20px/500 별도 span.
        숫자는 `.odo` 롤링이다 — 칸 높이 44px 은 `.d36` 의 행간이고
        `.ocell` 실측값과 같다(proto L1028, L1084).
      */}
      <p className="mt-1 text-[36px] leading-11 font-bold tracking-[-0.03em] text-text-primary tabular-nums">
        <RollingNumber
          value={evaluationAmount}
          text={formatAmount(evaluationAmount)}
          label={`${formatAmount(evaluationAmount)}원`}
        />
        <span className="text-[20px] font-medium text-text-secondary"> 원</span>
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
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-body-2 text-text-secondary">예수금</span>
        <span className="flex items-baseline gap-3">
          <span className="text-body-1 font-medium text-text-primary tabular-nums">
            {formatAmount(cashBalance)} 원
          </span>
          {/*
            매매하려다 돈이 모자란 순간이 이 자리다 — 프로토타입 `goDeposit`
            (proto L2170)과 `design.md` L610 이 같이 요구한다. 프로토타입
            재내보내기(커밋 `99c6c71`)에서 문구가 `충전하기` → `입금하기` 로
            바뀌었다(이슈 #45).
          */}
          <Link
            to={ROUTES.deposit}
            className="flex-none text-caption font-semibold text-text-secondary"
          >
            입금하기
          </Link>
        </span>
      </div>

      {/* 종목 개수는 `.sh` 의 오른쪽 끝이다. 정렬은 그 아래 별도 줄로 내려간다. */}
      <div className="mt-8 mb-3.5 flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-section-title text-text-primary">
          보유 종목
        </span>
        <span className="flex-none text-caption text-text-muted">
          {holdings.length}종목
        </span>
      </div>

      {/* 정렬할 것이 없으면 정렬도 없다 — 프로토타입은 `hasHold` 로 감춘다. */}
      {hasHoldings && (
        <div className="-mt-1.5 mb-2.5 flex items-center gap-3.5">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSortChange(option.value)}
              className={[
                'py-0.5 text-caption transition-colors duration-(--motion-fast) ease-standard',
                option.value === sort
                  ? 'font-bold text-text-primary'
                  : 'font-medium text-text-muted',
              ].join(' ')}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {hasHoldings ? (
        <div className="flex flex-col">
          {holdings.map((holding) => (
            <HoldingRow
              key={holding.stockCode}
              holding={holding}
              evaluationTotal={evaluationAmount}
            />
          ))}
        </div>
      ) : (
        /*
          목록 자리의 빈 상태라 화면 전체를 채우는 `EmptyState` 가 아니라
          `ListEmpty`(회색 면 `.soft`, 여백 28px 20px)를 쓴다. 동작은
          `.chip.sel` — 34px 캡슐에 검정 면이다(proto L2182-2186, L1107-1109).
          테두리 버튼으로 두면 회색 면 위에서 안내와 동작의 위계가 뒤집힌다.
        */
        <ListEmpty
          className="py-7"
          title="아직 보유 종목이 없어요."
          description="종목을 담으면 평가금액과 비중을 여기에서 볼 수 있어요."
          action={
            <Link
              to={ROUTES.search}
              className="inline-flex h-8.5 items-center rounded-[11px] bg-primary px-3.5 text-label font-medium text-surface"
            >
              종목 찾아보기
            </Link>
          }
        />
      )}
    </div>
  );
}

type HoldingRowProps = {
  holding: Holding;
  /** 비중의 분모. 프로토타입도 예수금을 뺀 평가금액 합계로 나눈다. */
  evaluationTotal: number;
};

/**
 * 보유 종목 한 줄 (프로토타입 `holdsFull`, proto L2188-2206).
 * 비중은 응답에 필드가 없어 화면이 계산한다 — 평가금액 합계가 이미 있어서
 * 지어내는 값이 아니다. 자릿수는 프로토타입과 같은 정수 %다.
 *
 * **시세가 없는 종목은 평가 네 필드가 전부 `null` 이다**(apiSpec v0.8.2). 그때는
 * 값 자리에 없다고 적는다 — 0 으로 치면 자산이 사라진 것처럼 보인다.
 */
function HoldingRow({ holding, evaluationTotal }: HoldingRowProps) {
  const { evaluationAmount, evaluationProfit, evaluationProfitRate } = holding;
  const weight =
    evaluationAmount === null || evaluationTotal === 0
      ? null
      : Math.round((evaluationAmount / evaluationTotal) * 100);
  const direction =
    evaluationProfitRate === null
      ? 'flat'
      : getPriceDirection(evaluationProfitRate);

  return (
    <Link
      to={ROUTES.stockDetail(holding.stockCode)}
      data-stock-code={holding.stockCode}
      className="flex w-full items-start gap-3 rounded-12 py-3.5 text-left transition-colors duration-(--motion-fast) ease-standard active:bg-primary-soft"
    >
      <StockInitialBadge
        stockCode={holding.stockCode}
        stockName={holding.stockName}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="flex items-center justify-between gap-2.5">
          <span className="truncate text-body-1 font-medium text-text-primary">
            {holding.stockName}
          </span>
          <span className="flex-none text-body-1 font-semibold text-text-primary tabular-nums">
            {evaluationAmount === null
              ? '시세 없음'
              : formatAmount(evaluationAmount)}
          </span>
        </span>
        <span className="flex items-start justify-between gap-2.5">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-caption whitespace-nowrap text-text-secondary">
              {formatAmount(holding.quantity)}주 · 평균{' '}
              {formatAmount(holding.avgBuyPrice)}원
            </span>
            {weight === null ? null : (
              <span className="text-caption whitespace-nowrap text-text-muted tabular-nums">
                비중 {weight}%
              </span>
            )}
          </span>
          <span
            className={`flex-none text-caption font-semibold whitespace-nowrap tabular-nums ${DIRECTION_TEXT_CLASS[direction]}`}
          >
            {evaluationProfit === null || evaluationProfitRate === null
              ? '등락 없음'
              : `${formatSignedAmount(evaluationProfit)} (${formatSignedRate(evaluationProfitRate)})`}
          </span>
        </span>
      </span>
    </Link>
  );
}
