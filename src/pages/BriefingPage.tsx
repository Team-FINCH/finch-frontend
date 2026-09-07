import { PageMain } from '@/shared/ui/PageMain';

/**
 * 브리핑 전체 — 오늘의 브리핑 항목 전체 열람. 홈 "전체 보기"의 도착지.
 * **경로 미확정(잠정)** — PRD v1.0 §06 화면 집계에는 독립 항목으로 없다
 * (`ia.md` §1 "홈·자산" 표, `ROUTES.briefing` 주석).
 *
 * 티켓: FINCH-142. (`ia.md` 2026-09-05판은 아직 "미발행"으로 적혀 있다 —
 * 이 값은 이후 발행된 Jira 티켓이다.)
 *
 * 근거: `ia.md` §1 "홈·자산" 표.
 * API: `GET /api/v1/ai/briefing`.
 *
 * 화면 UI 는 이 티켓의 범위가 아니다. 라우트 자리만 잡는다.
 */
export function BriefingPage() {
  return (
    <PageMain>
      <h1 className="text-lg font-semibold text-text-primary">브리핑 전체</h1>
    </PageMain>
  );
}
