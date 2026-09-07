import { PageMain } from '@/shared/ui/PageMain';

/**
 * 결제 복귀(실패) — 카카오페이 승인 실패 뒤 돌아오는 자리. 카카오 실패 리다이렉트가
 * `?paymentId&code` 쿼리로 이 화면에 도착한다. `code` 에 어떤 값이 오는지는 아직
 * 미확정이다(`ia.md` §1 "결제 복귀 화면과 모의 이체 화면(잠정)", 미확정 P23).
 *
 * **`ia.md`(2026-09-05판)는 이 라우트를 "(잠정)"·"(미확정)"으로 적었다.** 오늘
 * (2026-09-07) 백엔드 `application.yaml` 의 `fail-path` 와 Jira 티켓 FINCH-145 로
 * 확정됐다 — `ia.md` 갱신은 별도다.
 *
 * 티켓: FINCH-145.
 *
 * 근거: `ia.md` §1 "홈·자산" 절 "결제 복귀 화면과 모의 이체 화면(잠정)".
 * API: 계약 없음 — 실패 표시만 하고 API 를 부르지 않는다. `confirm` 을 부르는 쪽은
 * 성공 복귀(`DepositCompletePage`)뿐이다.
 *
 * 화면 UI 는 이 티켓의 범위가 아니다. 라우트 자리만 잡는다.
 */
export function DepositFailPage() {
  return (
    <PageMain>
      <h1 className="text-lg font-semibold text-text-primary">충전 실패</h1>
    </PageMain>
  );
}
