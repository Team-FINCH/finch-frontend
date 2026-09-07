import { PageMain } from '@/shared/ui/PageMain';

/**
 * 출금 — 예수금을 뺀다. 입력은 금액 하나뿐이다(은행·계좌번호 없음). 출금 가능액은
 * `GET /account` 의 `cashBalance` 전액이고 별도 한도가 없다 (`ia.md` §1 "출금 화면").
 * 진입점은 마이페이지다.
 *
 * 티켓: FINCH-138.
 *
 * 근거: `ia.md` §1 "홈·자산" 표, "출금 화면" 절.
 * API: `GET /api/v1/account` · `POST /api/v1/withdrawals` (`Idempotency-Key` 필수).
 *
 * 화면 UI 는 이 티켓의 범위가 아니다. 라우트 자리만 잡는다.
 */
export function WithdrawPage() {
  return (
    <PageMain>
      <h1 className="text-lg font-semibold text-text-primary">출금</h1>
    </PageMain>
  );
}
