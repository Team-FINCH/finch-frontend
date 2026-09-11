import { useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';
import { type StockDetailResponse } from '@/shared/types/stock';

/**
 * 이미 받아 둔 종목 상세에서 종목명만 꺼낸다. **이 훅은 서버를 부르지 않는다.**
 *
 * 채팅 빈 상태의 맥락 문구와 추천 질문은 프로토타입이 종목명을 쓴다
 * (`{종목명}를 보다가 들어오셨네요.`). 우리는 쿼리로 `ticker`(6자리 코드)만
 * 받으므로 이름을 따로 구해야 한다.
 *
 * **부르지 않고 캐시만 읽는 이유** — `GET /stocks/{stockCode}` 호출 자체가 최근 본
 * 종목 기록이다(contracts C51). 채팅 화면에서 부르면 사용자가 보지도 않은 조회가
 * 기록으로 남고 `useStockDetail` 이 최근 본 종목 목록까지 무효화한다. 이름 한 개를
 * 얻으려고 낼 부작용이 아니다.
 *
 * **실제 진입 경로에서는 캐시가 있다.** `screen=stock_detail` 을 실어 보내는 자리는
 * 종목 상세의 AI 탭 하나뿐이고(`features/stocks/components/StockAiTab.tsx`), 그
 * 화면이 같은 키로 상세를 이미 받아 뒀다. 캐시에 없는 경우는 `/chat?screen=
 * stock_detail&ticker=…` 를 주소로 바로 열었을 때이고, 그때는 호출부가 대체
 * 라벨(`이 종목`)로 떨어진다.
 *
 * 값이 렌더 중에 바뀌는 것을 구독하지 않는다 — 빈 상태는 첫 메시지를 보내는 순간
 * 사라지고, 그 사이에 상세 캐시가 새로 채워질 경로가 없다.
 *
 * 이름을 제대로 받으려면 진입하는 쪽이 쿼리에 종목명을 함께 실어 주는 것이 맞다.
 * 그 변경은 `features/stocks` 에 있어 이 티켓 범위 밖이다.
 */
export function useCachedStockName(stockCode: string | null): string | null {
  const queryClient = useQueryClient();

  if (stockCode === null) {
    return null;
  }

  return (
    queryClient.getQueryData<StockDetailResponse>(
      queryKeys.stocks.detail(stockCode),
    )?.stockName ?? null
  );
}
