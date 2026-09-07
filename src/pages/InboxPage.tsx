import { useNavigate } from 'react-router-dom';

import { InboxList } from '@/features/inbox';
import { ROUTES } from '@/shared/config/routes';
import { PageMain } from '@/shared/ui/PageMain';

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
 */
export function InboxPage() {
  const navigate = useNavigate();

  return (
    <PageMain>
      <div className="flex items-center gap-2 pb-1">
        <button
          type="button"
          onClick={() => navigate(ROUTES.home)}
          aria-label="뒤로"
          className="flex size-10 flex-none items-center justify-center text-title-2 text-text-primary"
        >
          ‹
        </button>
        <h1 className="text-title-3 text-text-primary">알림함</h1>
      </div>
      <InboxList />
    </PageMain>
  );
}
