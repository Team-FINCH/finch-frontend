import { PageMain } from '@/shared/ui/PageMain';

/**
 * 종목 검색 — 종목명·코드로 찾기. 입력이 비어 있으면 최근 검색어 초기 상태다
 * (`ia.md` §1: 최근 검색어는 자기 라우트를 갖지 않고 `/search` 의 초기 상태다).
 *
 * 티켓: FINCH-38.
 *
 * 근거: `ia.md` §1 "탐색·거래" 표.
 * API: `GET /api/v1/stocks/search?keyword=&size=` (검색) ·
 * `GET /api/v1/stocks/search/recent` · `DELETE /api/v1/stocks/search/recent/{keywordId}` ·
 * `DELETE /api/v1/stocks/search/recent` (최근 검색어).
 *
 * 화면 UI 는 이 티켓의 범위가 아니다. 라우트 자리만 잡는다.
 */
export function SearchPage() {
  return (
    <PageMain>
      <h1 className="text-lg font-semibold text-text-primary">종목 검색</h1>
    </PageMain>
  );
}
