import { request } from '@/shared/api';
import {
  API_PATHS,
  CURSOR_PAGE_DEFAULT_SIZE,
} from '@/shared/config/apiContract';
import {
  TransactionsResponseSchema,
  type TransactionFilter,
  type TransactionsResponse,
} from '@/shared/types/portfolio';

/**
 * `GET /transactions?type=&cursor=&size=` (apiSpec §8.2 v0.8). 커서는 불투명
 * 문자열이라 파싱·조작하지 않고 받은 `nextCursor`를 그대로 다음 요청에 넣는다
 * (`frontConvention.md` §5 "커서 페이징").
 */
export function getTransactions(
  type: TransactionFilter,
  cursor: string | null,
  signal?: AbortSignal,
): Promise<TransactionsResponse> {
  const params = new URLSearchParams({
    type,
    size: String(CURSOR_PAGE_DEFAULT_SIZE),
  });
  if (cursor !== null) {
    params.set('cursor', cursor);
  }

  return request(`${API_PATHS.transactions}?${params.toString()}`, {
    schema: TransactionsResponseSchema,
    signal,
  });
}
