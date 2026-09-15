import { useQuery, type QueryObserverOptions } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';
import { type MarketStatus } from '@/shared/types/market';

import { getMarketStatus } from './getMarketStatus';

/**
 * 시장 상태 (`GET /market/status`, apiSpec §5.8 v0.8.14 · 이슈 #78 · 티켓 271).
 *
 * "지금 시세를 물어야 하나"를 서버 시계로 판단하게 하는 자리다. `stocks`·`home`·
 * `order` 세 feature 가 전부 시세를 쓰고 feature 간 import 는 금지라
 * (`frontConvention` §2 의존 방향), `useQuoteSubscription` 과 같은 이유로 `shared/api`
 * 에 둔다. **시장 시간표(09:00·15:30·16:00·20:00)는 여기 없다** — 그 판정은 서버가
 * 하고, 이 훅은 응답값만 그대로 옮긴다.
 *
 * ## 언제 다시 부르나
 *
 * - 마운트 시 한 번 (`useQuery` 기본 동작)
 * - `nextChangeAt` 이 지나면 한 번 더. **경계 시각 자체는 아직 이전 세션이라**
 *   (apiSpec §5.8 — 15:30:00 은 정규장) 정각이 아니라 `NEXT_CHANGE_REFETCH_BUFFER_MS`
 *   만큼 지나서 부른다. `refetchInterval` 을 응답의 `nextChangeAt` 에서 매번
 *   다시 계산하는 함수로 줘서, 새 응답이 오면 다음 예약도 그 응답 기준으로
 *   갱신된다 — 타이머를 직접 관리하지 않는다
 * - `nextChangeAt` 이 `null` 이면(시연용 always-open) 다시 부를 시점이 없어
 *   `refetchInterval` 이 `false` 다
 * - 탭이 백그라운드에서 돌아왔을 때도 한 번 다시 부른다(`refetchOnWindowFocus`).
 *   전역 기본값(`createQueryClient`)이 `false` 라 여기서 켠다
 */

/**
 * 세션 경계 시각을 지난 뒤 몇 ms 를 더 기다리고 다시 부르는가. 시간표 숫자가
 * 아니라 "경계는 이전 세션에 속한다"는 서버 판정 규칙을 프론트에서 지키기 위한
 * 여유값이다 — 정각에 그대로 부르면 서버가 아직 이전 세션으로 답할 수 있다.
 */
const NEXT_CHANGE_REFETCH_BUFFER_MS = 5_000;

/** 최소 대기. 서버·클라이언트 시계가 어긋나 `nextChangeAt` 이 이미 지났어도 연달아 부르지 않는다. */
const MIN_REFETCH_DELAY_MS = 1_000;

function nextRefetchDelayMs(
  nextChangeAt: MarketStatus['nextChangeAt'],
): number | false {
  if (nextChangeAt === null) {
    return false;
  }
  const delay =
    new Date(nextChangeAt).getTime() -
    Date.now() +
    NEXT_CHANGE_REFETCH_BUFFER_MS;
  return Math.max(delay, MIN_REFETCH_DELAY_MS);
}

type MarketStatusRefetchInterval = NonNullable<
  QueryObserverOptions<MarketStatus>['refetchInterval']
>;

const refetchInterval: MarketStatusRefetchInterval = (query) =>
  nextRefetchDelayMs(query.state.data?.nextChangeAt ?? null);

export function useMarketStatus() {
  return useQuery({
    queryKey: queryKeys.market.status(),
    queryFn: ({ signal }) => getMarketStatus(signal),
    refetchInterval,
    refetchOnWindowFocus: true,
  });
}
