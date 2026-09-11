import { useQuery } from '@tanstack/react-query';

import { MARKET_INDICES_POLLING_INTERVAL_MS } from '@/shared/config/apiContract';
import { queryKeys } from '@/shared/config/queryKeys';

import { getMarketIndices } from './getMarketIndices';

/**
 * 홈 헤더의 시장 지수 (`GET /market/indices`, apiSpec §5.7 · 이슈 #65).
 *
 * **`useQuoteSubscription` 을 거치지 않는다.** 그 훅은 종목 시세의 슬롯·TTL
 * 모델(요청이 곧 관심 신호, TTL 30초)을 감싸는 것인데 지수에는 그 모델이 없다 —
 * 서버가 관심 신호와 무관하게 10초마다 상시 수집한다(§5.7). 슬롯을 붙잡지
 * 않으므로 폴링을 멈춰도 값이 늙지 않고, 반대로 시세 티어 주기(3초)로 물으면
 * 서버가 갱신하지 않은 같은 값을 다섯 번 받는다. 이슈 #65 도 "일반 쿼리 +
 * `refetchInterval`" 로 명시했다.
 *
 * - `staleTime: 0` — 폴링 값이라 항상 오래된 것으로 본다. 기본값 30초를 그대로
 *   두면 15초 주기를 삼킨다(`useQuoteSubscription` 과 같은 이유).
 * - `refetchIntervalInBackground: false` — 창이 백그라운드면 멈춘다. 기본값에
 *   기대지 않고 적는다(컨벤션 §8).
 */
export function useMarketIndices() {
  return useQuery({
    queryKey: queryKeys.market.indices(),
    queryFn: ({ signal }) => getMarketIndices(signal),
    refetchInterval: MARKET_INDICES_POLLING_INTERVAL_MS,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });
}
