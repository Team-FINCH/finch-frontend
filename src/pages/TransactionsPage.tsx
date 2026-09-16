import {
  TransactionFilterChips,
  TransactionList,
  useTransactionFilterState,
  useTransactions,
} from '@/features/transactions';
import { ROUTES } from '@/shared/config/routes';
import { PageMain } from '@/shared/ui/PageMain';
import { SubPageHeader } from '@/shared/ui/SubPageHeader';

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
 * 하단 탭바에 없는 화면이라(`ia.md` §3) 상단에 뒤로가기를 둔다 — `shared/ui/SubPageHeader`
 * (FINCH-196). 마이페이지 "거래 내역" 행에서 들어오는 것을 전제로 스택을 하나
 * 되돌리고, 새 탭에서 바로 열었으면 마이페이지로 보낸다. 제목 `매매 내역` 은 `ia.md` §1
 * 이 정한 화면 이름이다(프로토타입 `.navt` 와 design.md §7.13 은 옛 이름 `거래 내역`).
 */
export function TransactionsPage() {
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
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* 앱 셸 — 본문만 이 안에서 굴러간다 (FINCH-297, `shared/ui/PageMain` 주석). */}
      <SubPageHeader title="매매 내역" fallbackTo={ROUTES.my} />
      {/* 헤더와 첫 요소 사이 16px 은 `PageMain` 의 `pt-4` 다 — 헤더의 `mb-4` 였던
          것을 옮겼다. 그 띠는 본문과 함께 굴러가야 한다(`PageHeader` 주석). */}
      <PageMain className="pt-4">
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
    </div>
  );
}
