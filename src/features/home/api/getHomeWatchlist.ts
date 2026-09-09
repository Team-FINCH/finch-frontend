import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  WatchlistResponseSchema,
  type WatchlistResponse,
  type WatchlistSort,
} from '@/shared/types/stock';

/**
 * 관심 종목 조회 (apiSpec §6.3). 홈의 "관심 종목" 미리보기가 쓴다.
 *
 * 정렬은 화면이 고른다 — 프로토타입 홈의 관심 목록에 `등록순 · 이름순 · 등락률순`
 * 세 버튼이 있고(`watchSorts`), 그 셋이 apiSpec `sort` 열거값과 그대로 대응한다.
 * 서버가 정렬해 주므로 화면에서 다시 정렬하지 않는다.
 */
export function getHomeWatchlist(
  sort: WatchlistSort,
  signal?: AbortSignal,
): Promise<WatchlistResponse> {
  return request(`${API_PATHS.watchlist.list}?sort=${sort}`, {
    schema: WatchlistResponseSchema,
    signal,
  });
}
