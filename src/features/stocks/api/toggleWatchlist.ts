import { requestNoContent } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';

/**
 * 관심 종목 담기·해제 (apiSpec §6.3).
 *
 * **담기 응답에 본문이 없다.** 명세가 본문을 정의하지 않아 서버도 `201` 을 빈 채로
 * 준다 — 화면은 응답을 읽지 않고 상세를 다시 불러 `watched` 를 갱신한다.
 * 그래서 `request` 가 아니라 `requestNoContent` 를 쓴다. `request` 로 보내면
 * `response.json()` 에서 SchemaError 가 나 성공이 실패로 보인다.
 *
 * 해제는 `204` 고 **없는 대상을 지워도 `204` 다** (apiSpec §11.2 멱등 규칙).
 * "이미 해제됨" 분기를 만들지 않는다.
 *
 * 담기는 두 가지로 거절될 수 있다 — `WATCHLIST_ALREADY_EXISTS`(409) ·
 * `WATCHLIST_LIMIT_EXCEEDED`(409, 최대 50건 contracts C50). 둘 다 `HttpError` 로
 * 올라가고 문구는 서버가 완성해 준 `message` 를 그대로 쓴다 (컨벤션 §5).
 *
 * **목록 조회(`GET /watchlist`)는 여기 없다.** 관심 종목은 독립 화면을 갖지 않고
 * 홈의 섹션이 그 API 를 부른다 (ia.md §1 "관심 종목은 이 절에서 뺐다").
 */
export function addWatchlist(stockCode: string): Promise<void> {
  return requestNoContent(API_PATHS.watchlist.list, {
    method: 'POST',
    body: { stockCode },
  });
}

export function removeWatchlist(stockCode: string): Promise<void> {
  return requestNoContent(API_PATHS.watchlist.remove(stockCode), {
    method: 'DELETE',
  });
}
