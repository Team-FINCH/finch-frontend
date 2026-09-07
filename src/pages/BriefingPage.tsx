import { useNavigate } from 'react-router-dom';

import { BriefingFullList } from '@/features/home/components/BriefingFullList';
import { ROUTES } from '@/shared/config/routes';
import { PageMain } from '@/shared/ui/PageMain';

/**
 * 브리핑 전체 — 오늘의 브리핑 항목 전체 열람. 홈 "전체 보기"의 도착지.
 * **경로 미확정(잠정)** — PRD v1.0 §06 화면 집계에는 독립 항목으로 없다
 * (`ia.md` §1 "홈·자산" 표, `ROUTES.briefing` 주석).
 *
 * 티켓: FINCH-142. (`ia.md` 2026-09-05판은 아직 "미발행"으로 적혀 있다 —
 * 이 값은 이후 발행된 Jira 티켓이다.)
 *
 * 근거: `ia.md` §1 "홈·자산" 표 · 프로토타입 `isBriefing` 블록(마크업 최종 근거).
 * API: `GET /api/v1/ai/briefing`. 본문 렌더는 `features/home/components/BriefingFullList.tsx`
 * 하나에 모았다 — 홈의 브리핑 블록과 같은 쿼리(`useHomeBriefing`)를 쓴다.
 */
export function BriefingPage() {
  const navigate = useNavigate();

  return (
    <PageMain>
      <div className="flex items-center pb-1">
        <button
          type="button"
          onClick={() => navigate(ROUTES.home)}
          aria-label="뒤로"
          className="flex size-10 flex-none items-center justify-center text-title-2 text-text-primary"
        >
          ‹
        </button>
      </div>
      <BriefingFullList />
    </PageMain>
  );
}
