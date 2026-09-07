import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  PortfolioResponseSchema,
  type PortfolioResponse,
} from '@/shared/types/portfolio';

/**
 * 보유 종목 조회 (apiSpec §8.1). 홈의 "내 종목" 미리보기가 쓴다.
 *
 * **정렬 파라미터를 보내지 않는다.** `/portfolio` 화면(다른 티켓, FINCH-49 문서상
 * 표기가 같지만 실제 구현은 별도 워커)은 사용자가 `sort` 를 고르지만, 홈은 미리보기 3줄만
 * 보여주고 정렬 UI 가 없다 — 서버 기본값(`EVALUATION`)을 그대로 받는다.
 */
export function getHomePortfolio(
  signal?: AbortSignal,
): Promise<PortfolioResponse> {
  return request(API_PATHS.portfolio, {
    schema: PortfolioResponseSchema,
    signal,
  });
}
