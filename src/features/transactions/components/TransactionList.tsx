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
 * 원장 유형별 배지의 면색·글자색. **프로토타입 실측값이다** — `tx` fixture 가
 * 매수에 `tag:"u"`, 매도에 `tag:"d"`, 입금에 `tag:"g"` 를 준다. 다섯 유형이 전부
 * 회색이던 것을 이 갈래대로 나눴다.
 *
 * ```
 * .tag.u{background:#FDECEC;color:#C13B3B}            매수  적색
 * .tag.d{background:#EEF4FE;color:#2563EB}            매도  청색
 * .tag.g{background:#F1F3F6;color:var(--t2)/#565C66}  입금  회색
 * ```
 *
 * **등락 색 관례와 같은 방향이다** — 잔고가 나가는 매수가 적색, 들어오는 매도가
 * 청색이다(CLAUDE.md "등락 색은 국내 관례를 따른다"). 다만 `--color-stock-up` ·
 * `--color-stock-down` 을 쓰지 않는다. 저 토큰은 **값의 등락**을 뜻하고 여기는
 * **거래 종류**를 가르는 자리라 뜻이 다르다. 태그 글자색(`#C13B3B`·`#2563EB`)도
 * 등락 토큰(`#C93B3B`·`#2258C9`)과 값이 미세하게 달라, 프로토타입은 둘을 별개
 * 색 계열로 두고 있다.
 *
 * **어두운 면 위의 값(`rgba(242,115,115,.16)` · `#F27373` 류)을 쓰지 않는다.**
 * 투명도를 얹은 값이라 흰 면에 올리면 거의 보이지 않는다. 알림함 태그
 * (`features/inbox/components/InboxItemRow`)가 같은 이유로 라이트 한 벌만 쓴다.
 *
 * **입금 계열 셋은 토큰을 그대로 둔다.** 프로토타입 `.tag.g` 의 라이트 값
 * `#F1F3F6` · `#565C66` 이 우리 `--color-surface-soft` · `--color-text-secondary`
 * 와 정확히 같은 값이다 — 값이 없어서 남겨 둔 것이 아니라 같아서 토큰으로 적는다.
 * 출금·최초 지급은 프로토타입 `tx` 에 표본이 없는데, 둘 다 종목 매매가 아닌
 * 현금 이동이라 입금과 같은 회색으로 묶었다.
 *
 * **토큰으로 올리지 않고 지역 상수로 둔다.** 알림함 태그가 같은 판단을 한
 * 이유와 같다 — 이 값을 쓰는 자리가 매매 내역 한 곳뿐이고, `styles/index.css` 는
 * 지금 다른 브랜치가 자라게 하는 공용 파일이라 여기서 토큰을 더하면 머지할 때
 * 한쪽이 다른 쪽을 지운다.
 */
const KIND_TAG_CLASS: Record<Transaction['type'], string> = {
  BUY: 'bg-[#FDECEC] text-[#C13B3B]',
  SELL: 'bg-[#EEF4FE] text-[#2563EB]',
  DEPOSIT: 'bg-surface-soft text-text-secondary',
  WITHDRAWAL: 'bg-surface-soft text-text-secondary',
  INITIAL_GRANT: 'bg-surface-soft text-text-secondary',
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
                  {/* 크기는 지금 것을 유지한다 — 프로토타입 `.tag` 는
                      `24px · radius 8 · 13px` 이지만 목록 행의 밀도가 달라
                      이미 대조를 마친 자리다. 이번에 바꾼 것은 색뿐이다. */}
                  <span
                    className={`inline-flex h-5.25 flex-none items-center rounded-xs px-1.5 text-caption font-medium ${KIND_TAG_CLASS[transaction.type]}`}
                  >
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
