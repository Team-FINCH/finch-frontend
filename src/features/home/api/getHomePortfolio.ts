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
 * **`sort` 를 생략하지 않는다.** 홈 미리보기의 기본값 `EVALUATION` 은 apiSpec §8.1
 * 계약 기본값과 같아졌지만(정렬 칩의 맨 앞 항목을 기본으로 한다는 원칙, 사용자 결정
 * 2026-09-16), 그래서 생략해도 된다는 뜻은 아니다 — 사용자가 칩으로 정렬을 바꾸면
 * `sort` 는 더 이상 기본값이 아니므로 이 함수는 매번 현재 상태를 명시적으로 실어야
 * 한다(`HomePage` 의 `useState` 초기값 참고). 값이 우연히 겹칠 뿐, "기본값이니
 * 생략해도 되겠지" 하고 파라미터 자체를 없애면 정렬 변경이 반영되지 않는다.
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
