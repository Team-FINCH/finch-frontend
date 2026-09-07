import { PageMain } from '@/shared/ui/PageMain';

/**
 * 충전 — 모의 결제로 예수금 충전. 4단계(준비 → 결제창 → 승인 → 확정) 중 이 화면이
 * 담당하는 것은 첫 단계(`ready`)까지다. 금액 입력·프리셋, 결제 수단(카카오페이/
 * 계좌이체) 선택, 확인 단계를 거쳐 `checkoutUrl` 로 이동한다 (`ia.md` §1 "홈·자산" 절).
 *
 * 티켓: FINCH-35.
 *
 * 근거: `ia.md` §1 "홈·자산" 표.
 * API: `GET /api/v1/deposits/limit` · `POST /api/v1/deposits/ready` (멱등성 헤더 없음).
 *
 * 화면 UI 는 이 티켓의 범위가 아니다. 라우트 자리만 잡는다.
 */
export function DepositPage() {
  return (
    <PageMain>
      <h1 className="text-lg font-semibold text-text-primary">충전</h1>
    </PageMain>
  );
}
