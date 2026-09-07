import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  StockDetailResponseSchema,
  type StockDetailResponse,
} from '@/shared/types/stock';

/**
 * 종목 상세 (apiSpec §5.2).
 *
 * **이 호출이 최근 본 종목 기록이다** (contracts C51). 부수효과가 있는 GET 이라
 * 화면을 열 때마다 목록 맨 앞으로 올라간다. 그래서 성공 뒤에 최근 본 종목 쿼리를
 * 무효화한다 — 안 하면 검색 화면으로 돌아갔을 때 방금 본 종목이 빠져 있다.
 *
 * `holding` 은 보유하지 않으면 `null` 이고 **전량 매도해도 `null` 로 내려온다**
 * (contracts C76). 화면은 `holding !== null` 로 보유 블록 렌더 여부를 판단한다.
 */
export function getStockDetail(
  stockCode: string,
  signal?: AbortSignal,
): Promise<StockDetailResponse> {
  return request(API_PATHS.stocks.detail(stockCode), {
    schema: StockDetailResponseSchema,
    signal,
  });
}
