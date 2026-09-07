import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  WatchlistResponseSchema,
  type WatchlistResponse,
} from '@/shared/types/stock';

/**
 * 관심 종목 조회 (apiSpec §6.3). 홈의 "관심 종목" 미리보기가 쓴다.
 * `sort=REGISTERED` 고정 — 홈에는 정렬 UI 가 없고 서버 기본값과 같은 값을 명시한다.
 */
export function getHomeWatchlist(
  signal?: AbortSignal,
): Promise<WatchlistResponse> {
  return request(`${API_PATHS.watchlist.list}?sort=REGISTERED`, {
    schema: WatchlistResponseSchema,
    signal,
  });
}
