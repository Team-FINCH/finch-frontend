import { PageMain } from '@/shared/ui/PageMain';

/**
 * 알림함 — Finch 가 물어다 놓는 것 열람: 적어야 할 것(매수 이유 기록 요청) ·
 * 확인해야 할 것(AI 추측 확인) · 읽을 것(브리핑). **경로 미확정** — `/inbox` 는
 * 프론트가 제안한 값이고 팀 확인을 받지 않았다 (`ia.md` §1 "AI" 절).
 *
 * 티켓: FINCH-141. (`ia.md` 2026-09-05판은 아직 "미발행"으로 적혀 있다 —
 * 이 값은 이후 발행된 Jira 티켓이다.)
 *
 * 근거: `ia.md` §1 "AI" 표, "알림함" 절.
 * API: 계약 없음 — GitLab 이슈 #26 1번으로 문의 중(목록 조회·읽음 처리 스펙 대기).
 *
 * 화면 UI 는 이 티켓의 범위가 아니다. 라우트 자리만 잡는다.
 */
export function InboxPage() {
  return (
    <PageMain>
      <h1 className="text-lg font-semibold text-text-primary">알림함</h1>
    </PageMain>
  );
}
