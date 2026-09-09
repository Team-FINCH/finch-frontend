import { InboxList } from '@/features/inbox';
import { PageMain } from '@/shared/ui/PageMain';
import { SubPageHeader } from '@/shared/ui/SubPageHeader';

/**
 * 알림함 — Finch 가 물어다 놓는 것 열람: 적어야 할 것(매수 이유 기록 요청) ·
 * 확인해야 할 것(AI 추측 확인) · 읽을 것(브리핑). **경로 미확정** — `/inbox` 는
 * 프론트가 제안한 값이고 팀 확인을 받지 않았다 (`ia.md` §1 "AI" 절).
 *
 * 티켓: FINCH-141. (`ia.md` 2026-09-05판은 아직 "미발행"으로 적혀 있다 —
 * 이 값은 이후 발행된 Jira 티켓이다.)
 *
 * 근거: `ia.md` §1 "AI" 표, "알림함" 절 · design.md §7.11 알림함 · 프로토타입
 * `isMail` 블록(마크업 최종 근거, 내부 식별자는 여전히 `isMail`·`goMail` 이다).
 * API: **계약 없음** — GitLab 이슈 #26 1번으로 문의 중(목록 조회·읽음 처리 스펙
 * 대기). `features/inbox/model/types.ts` 가 지어낸 스키마이고 머리 주석에
 * 그 사실을 적어 뒀다.
 *
 * 상단 헤더는 `shared/ui/SubPageHeader` 다(FINCH-196). 뒤로가기가 언제나 홈으로
 * 가던 것을 프로토타입 `closeMail`→`back()` 과 같이 스택을 되돌리는 것으로 바꿨다 —
 * 알림함은 홈·포트폴리오·마이페이지 세 헤더의 뱃지에서 들어오므로(ia.md §1 "알림함")
 * 홈으로 고정하면 포트폴리오에서 온 사용자가 엉뚱한 곳에 떨어진다.
 */
export function InboxPage() {
  return (
    <PageMain>
      <SubPageHeader title="알림함" className="pb-1" />
      <InboxList />
    </PageMain>
  );
}
