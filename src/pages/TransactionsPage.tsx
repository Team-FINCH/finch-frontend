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
 * 화면 UI 는 이 티켓의 범위가 아니다. 라우트 자리만 잡는다.
 */
export function TransactionsPage() {
  return (
    <PageMain>
      <h1 className="text-lg font-semibold text-text-primary">매매 내역</h1>
    </PageMain>
  );
}
