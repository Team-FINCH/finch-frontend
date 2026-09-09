import { BriefingFullList } from '@/features/home/components/BriefingFullList';
import { PageMain } from '@/shared/ui/PageMain';
import { SubPageHeader } from '@/shared/ui/SubPageHeader';

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
 *
 * 상단 헤더는 `shared/ui/SubPageHeader` 다(FINCH-196, 인라인 뒤로가기 넷을 공용화).
 * 제목 `데일리 브리핑` 은 프로토타입 `isBriefing` 의 `.navt`(L2795)와 design.md §7.17
 * ("`‹` 뒤로 + 화면 제목 `데일리 브리핑`")이 같은 것을 말한다 — 이전 인라인 판은 제목 없이
 * `‹` 만 그렸다. 뒤로가기는 언제나 홈으로 가던 것을 프로토타입 `back()` 과 같이 스택을
 * 되돌리는 것으로 바꿨다. 들어온 곳이 홈이라 결과는 같고, 새 탭에서 바로 열면 홈으로 간다.
 */
export function BriefingPage() {
  return (
    <PageMain>
      <SubPageHeader title="데일리 브리핑" className="pb-1" />
      <BriefingFullList />
    </PageMain>
  );
}
