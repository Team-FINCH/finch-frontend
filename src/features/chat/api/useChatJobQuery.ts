import { useQuery } from '@tanstack/react-query';

import { CHAT_JOB_POLLING_INTERVAL_MS } from '@/shared/config/apiContract';
import { queryKeys } from '@/shared/config/queryKeys';

import { getChatJob } from './getChatJob';

/**
 * 진행 중인 AI 채팅 job 폴링 (FINCH-290).
 *
 * **완료 통지는 폴링으로 받는다. SSE 를 쓰지 않는다** — 폐기된 결정이고(커밋
 * `34ed34a`) 되살리려면 백엔드 스트리밍 프록시가 먼저다(`contracts.md` C4).
 *
 * - `refetchInterval` — `queued`·`running` 인 동안만 돈다. 끝난 job 을 계속 묻는
 *   것은 값이 바뀔 수 없는 것을 두드리는 것이라 함수형으로 꺼 준다. 주기의 근거는
 *   `CHAT_JOB_POLLING_INTERVAL_MS` 주석에 있다
 * - `refetchIntervalInBackground: false` — 창이 백그라운드면 멈춘다. 기본값에
 *   기대지 않고 적는다(컨벤션 §8). 멈춰도 job 은 서버에서 계속 돌고, 돌아오면
 *   `staleTime: 0` 이라 곧바로 다시 묻는다
 * - `staleTime: 0` — 폴링 값이라 항상 오래된 것으로 본다. 기본값 30초를 그대로 두면
 *   주기를 삼킨다(`useMarketIndices` 와 같은 이유)
 * - `retry: false` — 조회가 실패해도 다시 묻지 않는다. **다음 주기가 곧 재시도다.**
 *   기본 정책(최대 2회 지수 백오프)을 그대로 두면 2초 주기 위에 백오프가 겹쳐
 *   요청이 몰린다
 *
 * `jobId` 가 `null` 이면(기다리는 job 이 없다) 아예 부르지 않는다 — 그것도 정상
 * 상태다(`enabled`).
 */
export function useChatJobQuery(jobId: string | null) {
  return useQuery({
    queryKey: queryKeys.ai.chatJob(jobId ?? ''),
    queryFn: ({ signal }) => getChatJob(jobId as string, signal),
    enabled: jobId !== null,
    refetchInterval: (query) =>
      query.state.data?.kind === 'pending' || query.state.data === undefined
        ? CHAT_JOB_POLLING_INTERVAL_MS
        : false,
    refetchIntervalInBackground: false,
    staleTime: 0,
    retry: false,
  });
}
