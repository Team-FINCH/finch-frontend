import { PageMain } from '@/shared/ui/PageMain';

/**
 * 모의 이체 — `TRANSFER` 수단의 `checkoutUrl` 도착지. 승인을 흉내 낸다.
 * `POST /deposits/{paymentId}/mock-approve` 로 `{paymentId, paymentKey, amount}` 를
 * 받고 이어서 `confirm` 을 부른다. 실패 흐름 시연을 위한 `scenario`
 * (`SUCCESS`(기본) · `INSUFFICIENT_BALANCE` · `LIMIT_EXCEEDED` · `TIMEOUT`) 선택을
 * 둔다 (`ia.md` §1 "결제 복귀 화면과 모의 이체 화면(잠정)").
 *
 * **`ia.md`(2026-09-05판)는 이 라우트를 "(잠정)"·"(미확정)"으로 적었다.** 오늘
 * (2026-09-07) 백엔드 `application.yaml` 의 `transfer-checkout-path` 와 Jira 티켓
 * FINCH-146 으로 확정됐다 — `ia.md` 갱신은 별도다.
 *
 * 티켓: FINCH-146.
 *
 * 근거: `ia.md` §1 "홈·자산" 절 "결제 복귀 화면과 모의 이체 화면(잠정)".
 * API: `POST /api/v1/deposits/{paymentId}/mock-approve` · `POST /api/v1/deposits/confirm`.
 *
 * 화면 UI 는 이 티켓의 범위가 아니다. 라우트 자리만 잡는다.
 */
export function DepositTransferPage() {
  return (
    <PageMain>
      <h1 className="text-lg font-semibold text-text-primary">모의 이체</h1>
    </PageMain>
  );
}
