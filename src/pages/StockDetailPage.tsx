import { PageMain } from '@/shared/ui/PageMain';

/**
 * 종목 상세 — 시세·차트·기업정보·AI 분석. `?tab=chart|info|ai` · `?period=1M|3M|1Y`.
 *
 * **`/stocks/:stockCode` 와 `?tab=ai` 는 프론트 혼자 정하는 값이 아니다** — 브리핑
 * 응답의 `deeplink` 를 AI 서버가 이 경로 문자열로 만들어 내려보낸다 (`ia.md` §2).
 *
 * 티켓: FINCH-38, FINCH-50.
 *
 * 근거: `ia.md` §1 "탐색·거래" 표, §2 라우트 트리(쿼리 파라미터 표).
 * API: `GET /api/v1/stocks/{stockCode}` · `GET /api/v1/stocks/{stockCode}/candles?period=` ·
 * `GET /api/v1/stocks/{stockCode}/price` · `POST`/`DELETE /api/v1/watchlist`.
 *
 * 화면 UI 는 이 티켓의 범위가 아니다. 라우트 자리만 잡는다.
 */
export function StockDetailPage() {
  return (
    <PageMain>
      <h1 className="text-lg font-semibold text-text-primary">종목 상세</h1>
    </PageMain>
  );
}
