import { request, requestNoContent } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  RecentStocksResponseSchema,
  type RecentStocksResponse,
} from '@/shared/types/stock';

/**
 * 최근 본 종목 (apiSpec §6.1). 최대 30건 FIFO (contracts C51).
 *
 * **등록 API 가 없다.** `GET /stocks/{stockCode}` 호출 자체가 서버에 기록을 남기므로
 * 프론트가 따로 기록 요청을 보내지 않는다 (ia.md §1).
 */
export function getRecentStocks(
  signal?: AbortSignal,
): Promise<RecentStocksResponse> {
  return request(API_PATHS.stocks.recent, {
    schema: RecentStocksResponseSchema,
    signal,
  });
}

/**
 * 최근 본 종목 1건 삭제 (apiSpec §6.1).
 *
 * **없는 대상을 지워도 `204` 다** (apiSpec §11.2 멱등 규칙). 목록에 없는 종목이나
 * 이미 지운 항목을 다시 지워도 실패하지 않으므로 "이미 지워졌습니다" 분기를 만들지 않는다.
 *
 * 식별자가 종목코드라 최근 검색어(`keywordId`, 숫자)와 다르다 — 최근 본 종목은
 * 문자열이 아니라 종목 자체를 저장하기 때문이다.
 */
export function deleteRecentStock(stockCode: string): Promise<void> {
  return requestNoContent(`${API_PATHS.stocks.recent}/${stockCode}`, {
    method: 'DELETE',
  });
}
