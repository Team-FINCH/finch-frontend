import { useQuery, type QueryKey } from '@tanstack/react-query';

import { QUOTE_POLLING_INTERVAL_MS } from '@/shared/config/apiContract';

import { useMarketStatus } from './useMarketStatus';

/**
 * 시세 구독 추상화 (apiSpec §5.6 · contracts C34).
 *
 * C34 는 "폴링은 임시 코드가 아니라 최종 구조의 폴백 경로다. 단 `subscribe` /
 * `unsubscribe` 추상화 뒤에 숨기고 그 뒤에서 STOMP 클라이언트로 교체한다" 로 확정됐다.
 * 이 훅이 그 추상화다. **소비처(훅·화면)는 "이 시세를 구독한다 / 해지한다" 만 알고,
 * 안쪽이 폴링인지 STOMP 인지 모른다.** 마운트가 subscribe, 언마운트가 unsubscribe 다.
 *
 * ## 왜 필요한가
 *
 * 시세를 폴링하는 훅이 세 feature(`stocks`·`home`·`order`)에 걸쳐 있고, 화면은
 * `useQuery` 의 필드(`isPending`·`isError`·`error`·`refetch`)를 직접 읽고 있었다.
 * 그 상태로 STOMP 로 바꾸면 훅 셋은 물론 화면까지 번진다 — C34 가 막으려던 것이
 * 정확히 그것이다. feature 간 import 는 금지라(`frontConvention` §2 의존 방향)
 * `shared/api` 에 둔다. 전송 계층(HTTP·쿼리 클라이언트)을 숨기는 자리가 여기다.
 *
 * ## 폴링 구현체 (지금 유일한 구현체)
 *
 * 안쪽은 `useQuery` 하나다. 폴링 선행 단계는 **무신호** 다 — 요청 자체가 관심 신호이고
 * 서버는 마지막 요청 시각 기준 TTL 30초 뒤 슬롯을 회수한다(apiSpec §5.6). 그래서
 * `subscribe()` = 폴링 시작, `unsubscribe()` = 폴링 중단이고, 이탈 이벤트에서 별도
 * 신호를 보내지 않는다.
 *
 * - `refetchInterval` — `QUOTE_POLLING_INTERVAL_MS[tier]`. **폴링 주기는 계약이 아니라
 *   프론트 재량이다.** 서버가 보장하는 것은 티어 TTL 30초뿐이고 관계식
 *   (`TTL >= 주기 x 4~6`)만 지키면 된다(contracts C40). 숫자를 여기 박지 않고
 *   `shared/config` 상수를 쓴다(ia.md §7).
 * - **`useMarketStatus` 의 `quotesLive` 가 `false` 면 `refetchInterval` 을 `false` 로
 *   준다** (`GET /market/status`, apiSpec §5.8 · 티켓 271). 장 밖에는 다시 물어도
 *   같은 값이 오므로 재요청만 멈춘다. **`enabled` 는 건드리지 않는다** — 껐다면
 *   쿼리 자체가 멈춰 이미 받아 둔 마지막 시세까지 화면에서 사라질 수 있다.
 *   `quotesLive` 를 아직 모르면(로딩 중) 원래 주기로 돈다 — 이 응답 없이 폴링해도
 *   틀리지 않으므로(§5.8) 모르는 동안 멈출 이유가 없다.
 * - `staleTime: 0` — 폴링 값이라 항상 오래된 것으로 본다. 안 그러면 기본 `staleTime`
 *   30초가 주기를 삼킨다. 주기와 같은 값도 안 된다 — 타이머가 깨어나는 순간이 막 stale 이
 *   되는 경계라 한 주기를 통째로 건너뛸 수 있다.
 * - `refetchIntervalInBackground: false` — 창이 백그라운드에 있으면 폴링을 멈춘다.
 *   기본값에 기대지 않고 적는다(컨벤션 §8).
 *
 * ## STOMP 구현체가 들어올 자리 (P9 — 시연 범위 밖, 여기서 만들지 않는다)
 *
 * STOMP 구현체는 **같은 `queryKey` 에 `queryClient.setQueryData` 로 수신 페이로드를
 * 흘려 넣는 형태**로 이 훅 안쪽에 들어온다. 두 경로의 시세 페이로드 스키마는 동일하다
 * (apiSpec §5.6). 캐시 키가 같으니 무효화·공유 지점은 그대로고, 바깥으로 내는
 * `QuoteSubscription` 모양도 그대로다 — 화면이 읽는 단어가 바뀌지 않는다.
 * 그때 `source` 에 선택 필드 `topic`(종목 코드에서 파생, `priceTopic()`)이 추가되고,
 * `orders/available` 처럼 topic 이 없는 소스는 폴링 경로에 남는다. C34 가 적은
 * `subscribe(stockCode, cb)` 의 `stockCode` 는 그 자리로 간다.
 *
 * ## `stale` 은 통과시킨다
 *
 * 서버가 준 `stale` 불리언(contracts C42)은 `snapshot` 안에 그대로 있다. 이 훅은
 * 페이로드를 해석하지 않고, "시세 지연" 임계 시간도 두지 않는다 — 그 값은 아직
 * 미확정이다(contracts P10).
 */

/** 폴링 주기 티어. `QUOTE_POLLING_INTERVAL_MS` 의 키에서 파생한다 — 값을 두 번 적지 않는다. */
export type QuotePollingTier = keyof typeof QUOTE_POLLING_INTERVAL_MS;

/**
 * 구독할 시세의 출처.
 *
 * `queryKey` 는 **기존 키 팩토리(`queryKeys`)의 값을 그대로 넘긴다.** 다른 코드가 그
 * 키로 캐시를 무효화하므로 여기서 새 키를 만들면 무효화가 비껴간다.
 */
export type QuoteSubscriptionSource<TQuote> = {
  queryKey: QueryKey;
  /** 폴링 경로의 한 번 읽기. 요청 자체가 관심 신호다(apiSpec §5.6 무신호). */
  fetchQuote: (signal: AbortSignal) => Promise<TQuote>;
  tier: QuotePollingTier;
  /** `false` 면 구독하지 않는다(폴링을 시작하지 않는다). 기본 `true`. */
  enabled?: boolean;
};

/**
 * 구독 상태. **전송 방식에 중립적인 이름**이다 — 폴링에서 STOMP 로 바꿔도 화면이 읽는
 * 단어가 그대로여야 추상화다.
 *
 * | 상태 | 뜻 |
 * |---|---|
 * | `isConnecting` | 첫 값을 아직 받지 못했다. 스켈레톤을 그린다 |
 * | `isDisconnected` | 구독이 끊겼다(요청 실패). `failure` 에 사유가 있다. **마지막 값은 `snapshot` 에 남아 있을 수 있다** — "시세 지연" 표시(C42)는 마지막 수신 값이 그려지고 있음을 전제한다 |
 * | 둘 다 아니면 | 살아 있다. `snapshot` 이 있다 |
 *
 * 불리언 리터럴로 좁힌다 — `isConnecting`·`isDisconnected` 를 early-return 으로 걸러
 * 낸 뒤에는 `snapshot` 이 `TQuote` 다. 화면이 `undefined` 검사를 다시 하지 않는다.
 */
export type QuoteSubscription<TQuote> =
  | {
      isConnecting: true;
      isDisconnected: false;
      snapshot: undefined;
      failure: null;
      reconnect: () => void;
    }
  | {
      isConnecting: false;
      isDisconnected: true;
      snapshot: TQuote | undefined;
      failure: Error;
      reconnect: () => void;
    }
  | {
      isConnecting: false;
      isDisconnected: false;
      snapshot: TQuote;
      failure: null;
      reconnect: () => void;
    };

export function useQuoteSubscription<TQuote>(
  source: QuoteSubscriptionSource<TQuote>,
): QuoteSubscription<TQuote> {
  const { queryKey, fetchQuote, tier, enabled = true } = source;

  // quotesLive 를 모르는 동안(로딩 중)은 원래 주기로 돈다 — 이 응답 없이 폴링해도
  // 틀리지 않는다(apiSpec §5.8).
  const { data: marketStatus } = useMarketStatus();
  const refetchInterval =
    marketStatus?.quotesLive === false
      ? false
      : QUOTE_POLLING_INTERVAL_MS[tier];

  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => fetchQuote(signal),
    enabled,
    refetchInterval,
    // 폴링 값이라 항상 오래된 것으로 본다. 안 그러면 기본 staleTime 30초가 주기를 삼킨다.
    staleTime: 0,
    refetchIntervalInBackground: false,
  });

  // 재구독. 폴링 경로에서는 지금 한 번 다시 읽는 것이다. 결과는 상태로 돌아오므로
  // 프로미스를 밖에 내지 않는다.
  const reconnect = () => {
    void query.refetch();
  };

  if (query.isPending) {
    return {
      isConnecting: true,
      isDisconnected: false,
      snapshot: undefined,
      failure: null,
      reconnect,
    };
  }

  if (query.isError) {
    return {
      isConnecting: false,
      isDisconnected: true,
      snapshot: query.data,
      failure: query.error,
      reconnect,
    };
  }

  return {
    isConnecting: false,
    isDisconnected: false,
    snapshot: query.data,
    failure: null,
    reconnect,
  };
}
