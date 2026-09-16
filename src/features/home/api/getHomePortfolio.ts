import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  PortfolioResponseSchema,
  type PortfolioResponse,
  type PortfolioSort,
} from '@/shared/types/portfolio';

/**
 * 보유 종목 조회 (apiSpec §8.1). 홈의 "내 종목" 미리보기가 쓴다.
 *
 * `/portfolio` 화면(다른 티켓, FINCH-49 문서상 표기가 같지만 실제 구현은 별도
 * 워커)과 같은 엔드포인트를 같은 응답 스키마로 읽는다 — `sort` 를 쿼리 키에도 함께
 * 실어(`queryKeys.portfolio.summary`) 두 화면이 같은 정렬을 보면 캐시를 나눠 쓴다.
 *
 * **`sort` 를 생략하지 않는다.** 계약 기본값은 `EVALUATION` 이지만 홈 미리보기의
 * 기본은 `PROFIT_RATE` 다(사용자 결정, 2026-09-16) — 파라미터를 빼면 서버 기본값이
 * 오므로 화면 기본값을 유지하려면 항상 명시해야 한다(`HomePage` 의 `useState` 초기값
 * 참고). 다음에 "기본값이니 생략해도 되겠지" 하고 지우면 정렬이 조용히 바뀐다.
 */
export function getHomePortfolio(
  sort: PortfolioSort,
  signal?: AbortSignal,
): Promise<PortfolioResponse> {
  const query = new URLSearchParams({ sort }).toString();
  return request(`${API_PATHS.portfolio}?${query}`, {
    schema: PortfolioResponseSchema,
    signal,
  });
}
