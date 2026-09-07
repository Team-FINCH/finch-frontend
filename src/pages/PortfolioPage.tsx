import { PageMain } from '@/shared/ui/PageMain';

/**
 * 포트폴리오 — 보유 종목 상세·평가손익, AI 진단, 수익률 원인 분석, 투자 기준(위키)
 * 4중 탭. `?tab=holdings|diagnosis|cause|wiki` · `?sort=EVALUATION|PROFIT_RATE`.
 *
 * **`?tab=wiki` 가 위키의 유일한 라우트다** — 독립 화면(구 `/my/wiki`)은 없앴다
 * (`ia.md` §1 "AI가 이해한 나 — 위키 화면"의 "라우트를 하나로 합친 이유").
 *
 * 티켓: FINCH-49.
 *
 * 근거: `ia.md` §1 "홈·자산" 표, §2 라우트 트리(쿼리 파라미터 표).
 * API: `GET /api/v1/portfolio?sort=` · `GET /api/v1/stocks/prices`
 * (위키 탭은 `GET /api/v1/ai/wiki` · `PUT /api/v1/ai/wiki/theses/{stockCode}` ·
 * `DELETE /api/v1/ai/wiki/facts/{factId}`, `ia.md` §1 "AI가 이해한 나" 절).
 *
 * 화면 UI 는 이 티켓의 범위가 아니다. 라우트 자리만 잡는다.
 */
export function PortfolioPage() {
  return (
    <PageMain>
      <h1 className="text-lg font-semibold text-text-primary">포트폴리오</h1>
    </PageMain>
  );
}
