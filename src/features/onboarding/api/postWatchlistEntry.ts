import { requestNoContent } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';

/**
 * 관심 종목 등록 (apiSpec §6.3).
 *
 * **명세가 `201 Created` 만 적고 응답 본문을 정의하지 않았다.** 본문을 가정해
 * 스키마를 만들면 계약처럼 굳으므로 `requestNoContent` 로 보내고, 결과는
 * 관심 목록을 다시 조회해서 확인한다. 목 핸들러도 같은 이유로 본문을 비워 둔다.
 */
export function postWatchlistEntry(stockCode: string): Promise<void> {
  return requestNoContent(API_PATHS.watchlist.list, {
    method: 'POST',
    body: { stockCode },
  });
}
