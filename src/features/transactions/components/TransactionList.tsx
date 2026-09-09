import { Fragment } from 'react';

import { formatKstMonthDay, formatKstTime } from '@/shared/lib/formatDate';
import { formatKrw, formatSignedAmount } from '@/shared/lib/formatNumber';
import { type PaymentMethod } from '@/shared/types/deposit';
import { type Transaction } from '@/shared/types/portfolio';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';

import { type TRANSACTION_FILTERS } from '../lib/useTransactionFilterState';

/** 원장 유형 → 화면 배지 문구 (ia.md §1 "매매 내역 필터는 다섯이다"). */
const KIND_LABEL: Record<Transaction['type'], string> = {
  BUY: '매수',
  SELL: '매도',
  DEPOSIT: '입금',
  WITHDRAWAL: '출금',
  INITIAL_GRANT: '최초 지급',
};

/**
 * 원장 유형별 잔고 증감 방향. `amount` 는 항상 양수 절대값으로 오고 방향은
 * `type` 으로만 표시한다(contracts C87) — 서버가 부호를 주지 않는다.
 */
const OUTFLOW_TYPES = new Set<Transaction['type']>(['BUY', 'WITHDRAWAL']);

/** 라벨은 결제 수단 선택 화면(`PaymentMethodPicker`)과 같은 말을 쓴다. */
const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  KAKAOPAY: '카카오페이',
  TRANSFER: '계좌이체',
};

function transactionDetail(transaction: Transaction): string | null {
  if (transaction.type === 'BUY' || transaction.type === 'SELL') {
    return transaction.quantity === null || transaction.price === null
      ? null
      : `${transaction.quantity}주 · ${formatKrw(transaction.price)}`;
  }
  if (transaction.paymentMethod !== null) {
    return PAYMENT_METHOD_LABEL[transaction.paymentMethod];
  }
  // 출금 행은 수단을 받지 않아 detail 이 없다(contracts C86) — 배지만으로 충분하다.
  return null;
}

type TransactionListProps = {
  type: (typeof TRANSACTION_FILTERS)[number]['value'];
  pages: { items: Transaction[] }[];
  isPending: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onFetchNextPage: () => void;
  onRetry: () => void;
};

/**
 * 매매 내역 목록 — 날짜별로 묶어 그린다(프로토타입 `txDays` 그룹).
 * 목록은 최신순 고정이라 순서대로 훑으며 날짜가 바뀔 때만 새 그룹 헤더를 만든다.
 */
export function TransactionList({
  type,
  pages,
  isPending,
  isError,
  hasNextPage,
  isFetchingNextPage,
  onFetchNextPage,
  onRetry,
}: TransactionListProps) {
  if (isPending) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <p className="text-body-2 text-text-secondary">
          매매 내역을 불러오지 못했어요.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="h-9.5 rounded-sm border border-border-strong px-4.5 text-label text-text-primary"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const items = pages.flatMap((page) => page.items);

  if (items.length === 0) {
    return (
      <EmptyState
        className="pt-6"
        title={
          type === 'ALL'
            ? '아직 매매 내역이 없어요.'
            : '해당 유형의 내역이 없어요.'
        }
        description={
          type === 'ALL' ? '첫 거래를 시작하면 여기에 기록돼요.' : undefined
        }
      />
    );
  }

  // 날짜 그룹 헤더를 렌더 중에 변수를 변경해 판정하지 않는다 — 목록을 먼저
  // 훑어 각 행에 "이 행 앞에 날짜 헤더가 필요한가"를 미리 계산해 둔다.
  const rows = items.map((transaction, index) => {
    const date = formatKstMonthDay(transaction.occurredAt);
    const previousDate =
      index === 0 ? null : formatKstMonthDay(items[index - 1]!.occurredAt);
    return { transaction, date, showDateHeader: date !== previousDate };
  });

  return (
    <div className="pt-2">
      {rows.map(({ transaction, date, showDateHeader }) => {
        const detail = transactionDetail(transaction);
        const isOutflow = OUTFLOW_TYPES.has(transaction.type);
        const name = transaction.stockName ?? KIND_LABEL[transaction.type];

        return (
          <Fragment key={transaction.transactionId}>
            {showDateHeader && (
              <p className="mt-5.5 mb-1.5 text-caption text-text-secondary first:mt-0">
                {date}
              </p>
            )}
            <div className="flex items-start gap-3 border-b border-border/55 py-3.5 last:border-0">
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center gap-1.75">
                  <span className="truncate text-body-1 font-medium text-text-primary">
                    {name}
                  </span>
                  <span className="inline-flex h-5.25 flex-none items-center rounded-xs bg-surface-soft px-1.5 text-caption font-medium text-text-secondary">
                    {KIND_LABEL[transaction.type]}
                  </span>
                </span>
                {detail !== null && (
                  <span className="text-caption text-text-secondary">
                    {detail}
                  </span>
                )}
              </span>
              <span className="flex flex-none flex-col items-end gap-1">
                <span className="text-body-1 font-semibold text-text-primary tabular-nums">
                  {isOutflow
                    ? formatSignedAmount(-transaction.amount)
                    : formatSignedAmount(transaction.amount)}
                </span>
                <span className="text-caption text-text-secondary tabular-nums">
                  {formatKstTime(transaction.occurredAt)}
                </span>
              </span>
            </div>
          </Fragment>
        );
      })}

      {hasNextPage && (
        <button
          type="button"
          onClick={onFetchNextPage}
          disabled={isFetchingNextPage}
          className="mt-4 h-11 w-full rounded-sm border border-border text-label font-medium text-text-secondary disabled:text-text-muted"
        >
          {isFetchingNextPage ? '불러오는 중…' : '더 보기'}
        </button>
      )}
    </div>
  );
}
