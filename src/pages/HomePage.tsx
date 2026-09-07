import { PageMain } from '@/shared/ui/PageMain';

/**
 * 홈 — 총자산·손익 요약, 보유 종목·관심 종목 요약, 오늘의 브리핑.
 *
 * 티켓: FINCH-49. (`_inbox` 인수인계 표는 FINCH-29 로 적었으나
 * `ia.md` §1 "홈·자산" 표의 실제 값은 2-8/FINCH-49 다 — 이 파일은 ia.md 를 따른다.)
 *
 * 근거: `ia.md` §1 "홈·자산" 표.
 * API: `GET /api/v1/account` · `GET /api/v1/portfolio` ·
 * `GET /api/v1/watchlist?sort=` · `GET /api/v1/stocks/prices`.
 *
 * 화면 UI 는 이 티켓의 범위가 아니다. 라우트 자리만 잡는다.
 */
export function HomePage() {
  return (
    <PageMain>
      <h1 className="text-lg font-semibold text-text-primary">홈</h1>
    </PageMain>
  );
}
