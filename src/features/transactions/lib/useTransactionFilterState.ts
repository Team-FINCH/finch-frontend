import { useSearchParams } from 'react-router-dom';

import { TransactionFilterSchema } from '@/shared/types/portfolio';

/** `/transactions?type=` 다섯 (ia.md §1 "매매 내역 필터는 전체 / 매수 / 매도 / 충전 / 출금 다섯이다"). */
export const TRANSACTION_FILTERS = [
  { value: 'ALL', label: '전체' },
  { value: 'BUY', label: '매수' },
  { value: 'SELL', label: '매도' },
  { value: 'DEPOSIT', label: '입금' },
  { value: 'WITHDRAWAL', label: '출금' },
] as const;

const DEFAULT_FILTER = 'ALL';

/**
 * `/transactions` 의 `type` 쿼리 상태. 잘못되거나 없는 값은 기본값(`ALL`)으로
 * 읽되 URL 은 고치지 않는다 — `usePortfolioTabState.ts` 와 같은 이유.
 *
 * 필터 전환은 같은 화면 안의 상태 전환이라 `replace`다(`frontConvention.md` §10).
 */
export function useTransactionFilterState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const typeParam = searchParams.get('type');
  const parsed = TransactionFilterSchema.safeParse(typeParam);
  const type = parsed.success ? parsed.data : DEFAULT_FILTER;

  function setType(nextType: string) {
    const next = new URLSearchParams(searchParams);
    next.set('type', nextType);
    setSearchParams(next, { replace: true });
  }

  return { type, setType };
}
