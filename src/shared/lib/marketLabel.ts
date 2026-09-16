/**
 * 시장 구분(`Market`, `shared/types/stock.ts`)의 한국어 표기.
 *
 * `StockDetailHeader`·`StockSearchResultList`·관심 목록이 같은 매핑을 각자 파일에
 * 두고 있었다 (FINCH-307, 관심 목록이 `market` 을 받기 시작하며 셋째가 됐다).
 * 한 곳으로 모았다.
 *
 * **`?? market` 폴백을 반드시 지킨다.** 서버가 아직 모르는 시장 값을 보내도(신규
 * 상장 시장 추가 등) 화면이 비지 않고 원본 문자열을 그대로 보여준다.
 */
const MARKET_LABEL: Record<string, string> = {
  KOSPI: '코스피',
  KOSDAQ: '코스닥',
};

export function formatMarketLabel(market: string): string {
  return MARKET_LABEL[market] ?? market;
}
