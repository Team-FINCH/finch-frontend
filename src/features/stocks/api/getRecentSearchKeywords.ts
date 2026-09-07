import { request, requestNoContent } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  RecentSearchKeywordsResponseSchema,
  type RecentSearchKeywordsResponse,
} from '@/shared/types/stock';

/** 최근 검색어 목록 (apiSpec §6.2). `searchedAt` 최신순으로 내려온다. 최대 10건. */
export function getRecentSearchKeywords(
  signal?: AbortSignal,
): Promise<RecentSearchKeywordsResponse> {
  return request(API_PATHS.stocks.recentSearchKeywords, {
    schema: RecentSearchKeywordsResponseSchema,
    signal,
  });
}

/**
 * 최근 검색어 1건 삭제 (apiSpec §6.2).
 *
 * **없는 대상을 지워도 `204` 다.** 남의 `keywordId` 를 지목해도 마찬가지다 —
 * 존재 여부 자체가 정보 노출이라 서버가 구분하지 않는다 (이슈 #23 3번 회신).
 * 그래서 화면에 "이미 지워진 검색어입니다" 같은 분기를 만들지 않는다.
 *
 * `keywordId` 는 종목코드와 달리 숫자다 (ERD §2.11 `recent_search_keyword` PK).
 */
export function deleteRecentSearchKeyword(keywordId: number): Promise<void> {
  return requestNoContent(
    `${API_PATHS.stocks.recentSearchKeywords}/${keywordId}`,
    { method: 'DELETE' },
  );
}

/** 최근 검색어 전체 삭제 (apiSpec §6.2). 비어 있어도 `204` 다. */
export function deleteAllRecentSearchKeywords(): Promise<void> {
  return requestNoContent(API_PATHS.stocks.recentSearchKeywords, {
    method: 'DELETE',
  });
}
