import { PageMain } from '@/shared/ui/PageMain';

/**
 * 결제 복귀(성공) — 카카오페이 승인 뒤 돌아오는 자리. 카카오가 서버의
 * `GET /deposits/kakao/approval` 로 리다이렉트하면, 서버가 이 화면으로
 * `?paymentId&paymentKey&amount` 쿼리를 실어 `302` 를 보낸다. 이 화면의 유일한 일은
 * 그 쿼리를 읽어 `POST /deposits/confirm` 을 부르는 것이다 (`ia.md` §1 "결제 복귀 화면").
 *
 * **`ia.md`(2026-09-05판)는 이 라우트를 "(잠정)"·"(미확정)"으로 적었다.** 오늘
 * (2026-09-07) 백엔드 `application.yaml` 의 `success-path` 와 Jira 티켓 FINCH-145
 * 로 확정됐다 — `ia.md` 갱신은 별도다.
 *
 * 티켓: FINCH-145.
 *
 * 근거: `ia.md` §1 "홈·자산" 절 "결제 복귀 화면과 모의 이체 화면(잠정)".
 * API: `POST /api/v1/deposits/confirm` (`Idempotency-Key` 안 씀 — `paymentKey` 가 멱등 기준).
 *
 * 화면 UI 는 이 티켓의 범위가 아니다. 라우트 자리만 잡는다.
 */
export function DepositCompletePage() {
  return (
    <PageMain>
      <h1 className="text-lg font-semibold text-text-primary">충전 완료</h1>
    </PageMain>
  );
}
