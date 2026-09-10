import { QueryClient } from '@tanstack/react-query';

import { type ErrorDetail } from '@/shared/types/error';

import { HttpError, SchemaError } from './errors';

const MAX_RETRY_COUNT = 2;

/**
 * `429 AI_UPSTREAM_RATE_LIMITED` 의 `detail.reason` 중 **기다려도 풀리지 않는** 값
 * (apiSpec §10.4 v0.8.6 · MR !195). 그날의 AI 사용량을 다 쓴 것이라 자정(KST)까지
 * 같은 답이 온다. 나머지 한 값 `request_rate_limit` 은 분당 한도라 `Retry-After`
 * 뒤에 풀린다 — 그쪽은 지금처럼 재시도한다.
 */
const DAILY_TOKEN_BUDGET_REASON = 'daily_token_budget';

/**
 * `detail` 은 코드마다 키 구성이 달라 값이 `unknown` 이다 — 읽는 쪽이 좁힌다
 * (`shared/types/error.ts` `ErrorDetail`). `ErrorDetail` 에 `reason` 을 박지 않는
 * 이유가 그것이고, 같은 방식으로 좁히는 선례가 `depositErrorMessages.ts` 다.
 */
function readReason(detail: ErrorDetail | null): string | null {
  const value = detail?.reason;
  return typeof value === 'string' ? value : null;
}

/**
 * 재시도 정책 (컨벤션 §5).
 * - 스키마 실패는 재시도하지 않는다. 다시 보내도 같은 응답이 온다
 * - 429 는 재시도한다. 대기 시간은 retryDelay 에서 Retry-After 를 우선한다
 * - **단, 429 의 `detail.reason` 이 `daily_token_budget` 이면 재시도하지 않는다**
 * - 나머지 4xx 는 재시도하지 않는다
 * - 5xx 와 네트워크 오류는 지수 백오프로 최대 2회
 *
 * **429 분기는 백엔드 MR !195 이전까지 죽어 있었다.** AI 의 429 를 백엔드가
 * `503` 으로 재포장했기 때문이다. 그 재포장이 걷히면서 이 분기가 살아나는데,
 * 예산이 마른 429 까지 재시도하면 크레딧이 없는 상태로 세 번을 두드린다
 * (GitLab #64).
 *
 * `reason` 이 없거나 모르는 값이면 **재시도한다.** 명세가 "재시도가 안전한 쪽이
 * 기본값" 이라고 정했고(apiSpec §10.4), 백엔드는 `reason` 이 없으면 `detail` 자체를
 * 싣지 않으므로 그 갈래가 실제로 온다.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof SchemaError) {
    return false;
  }
  if (failureCount >= MAX_RETRY_COUNT) {
    return false;
  }
  if (error instanceof HttpError) {
    if (error.status === 429) {
      return readReason(error.detail) !== DAILY_TOKEN_BUDGET_REASON;
    }
    if (error.status >= 400 && error.status < 500) {
      return false;
    }
  }
  return true;
}

function getRetryDelay(attemptIndex: number, error: unknown): number {
  const backoffMs = Math.min(1000 * 2 ** attemptIndex, 30_000);
  // 429 는 서버가 알려준 대기 시간이 지수 백오프보다 우선한다.
  if (error instanceof HttpError && error.retryAfterMs !== null) {
    return error.retryAfterMs;
  }
  return backoffMs;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        retryDelay: getRetryDelay,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // 기본값에 기대지 않는다 (컨벤션 §8).
        // 쿼리 에러는 컴포넌트가 직접 그리고, 에러 경계로 올리지 않는다.
        throwOnError: false,
      },
      mutations: {
        // 주문 요청을 자동 재시도하면 중복 주문이 된다 (컨벤션 §5).
        retry: false,
        throwOnError: false,
      },
    },
  });
}
