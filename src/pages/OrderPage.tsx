import { PageMain } from '@/shared/ui/PageMain';

/**
 * 주문 — 시장가 매수·매도 실행. `?side=buy|sell`. 지정가·호가창은 범위 밖이다.
 *
 * 티켓: FINCH-49.
 *
 * 근거: `ia.md` §1 "탐색·거래" 표, §2 라우트 트리(쿼리 파라미터 표).
 * API: `GET /api/v1/orders/available?stockCode=&side=` ·
 * `POST /api/v1/orders` (`Idempotency-Key` 필수).
 *
 * 화면 UI 는 이 티켓의 범위가 아니다. 라우트 자리만 잡는다.
 */
export function OrderPage() {
  return (
    <PageMain>
      <h1 className="text-lg font-semibold text-text-primary">주문</h1>
    </PageMain>
  );
}
