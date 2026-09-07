import { useNavigate } from 'react-router-dom';

import {
  TransactionFilterChips,
  TransactionList,
  useTransactionFilterState,
  useTransactions,
} from '@/features/transactions';
import { PageMain } from '@/shared/ui/PageMain';

/**
 * 매매 내역 — 원장 통합 내역(매수·매도·충전·출금) 조회.
 * `?type=ALL|BUY|SELL|DEPOSIT|WITHDRAWAL`.
 *
 * **출금 행에는 결제 수단이 없다** — `paymentMethod` 가 `null` 로 온다
 * (`ia.md` §1 "홈·자산" 절, C86·C87).
 *
 * 티켓: FINCH-49.
 *
 * 근거: `ia.md` §1 "홈·자산" 표, §2 라우트 트리(쿼리 파라미터 표).
 * API: `GET /api/v1/transactions?type=&cursor=&size=`.
 *
 * 하단 탭바에 없는 화면이라(`ia.md` §3) 뒤로가기 버튼을 직접 그린다 — 마이페이지
 * "거래 내역" 행에서 들어오는 것을 전제로 `navigate(-1)`을 쓴다.
 */
export function TransactionsPage() {
  const navigate = useNavigate();
  const { type, setType } = useTransactionFilterState();
  const {
    data,
    isPending,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useTransactions(type);

  return (
    <PageMain>
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          aria-label="뒤로가기"
          onClick={() => navigate(-1)}
          className="-ml-2 flex size-11 flex-none items-center justify-center rounded-full text-title-2 text-text-primary"
        >
          ‹
        </button>
        <h1 className="text-title-3 text-text-primary">매매 내역</h1>
      </div>

      <TransactionFilterChips type={type} onChange={setType} />

      <TransactionList
        type={type}
        pages={data?.pages ?? []}
        isPending={isPending}
        isError={isError}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onFetchNextPage={() => void fetchNextPage()}
        onRetry={() => void refetch()}
      />
    </PageMain>
  );
}
