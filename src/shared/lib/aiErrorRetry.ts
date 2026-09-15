import { isHttpError } from '@/shared/api';
import {
  AI_RELAY_ERROR_CODES,
  AI_SERVICE_ERROR_CODES,
} from '@/shared/types/errorCodes';

/**
 * 재시도가 의미 있는 AI 에러 코드.
 *
 * 근거는 `ia.md` §4 "에러 자리의 피드백" 1번이고, 그것이 인용하는 원본은
 * `docs/api/apiSpec.md` §10.4 다.
 *
 * - `RETRIEVAL_FAILED`(502) · `LLM_TIMEOUT`(504) — AI 서버가 발행. 일시적이다
 * - `AI_UPSTREAM_UNAVAILABLE`(502) · `AI_UPSTREAM_TIMEOUT`(504) — 백엔드가 AI 서버에
 *   닿지 못한 것. 역시 일시적이다
 *
 * 반대쪽(재시도 무의미)은 `INSUFFICIENT_DATA`(409)와 `GUARDRAIL_BLOCKED`(422)다.
 * 조건이 바뀌기 전에는 몇 번을 눌러도 같은 답이 온다. 화면에 재시도 버튼을 만들지 않는다.
 *
 * **`AI_UPSTREAM_RATE_LIMITED`(429)는 일부러 넣지 않았다.** 더하지 마라.
 * 이 코드의 재시도 가능 여부는 `code` 가 아니라 `detail.reason` 이 가른다 —
 * `request_rate_limit` 은 기다리면 풀리지만 `daily_token_budget` 은 자정(KST)까지
 * 풀리지 않는다(apiSpec §10.4 v0.8.6). 이 자리는 `code` 만 받으므로 두 갈래를 나눌 수
 * 없고, 넣으면 예산이 마른 사용자에게 눌러도 같은 429 가 오는 버튼을 내놓게 된다.
 * `request_rate_limit` 쪽은 `queryClient` 의 자동 재시도가 `Retry-After` 를 존중해
 * 이미 처리한다 — 그것이 다 소진된 뒤에 손으로 한 번 더 두드리는 것은 한도를 더
 * 밀어붙이는 일이다. 버튼이 필요해지면 `reason` 을 이 자리까지 넘기는 것이 먼저다.
 *
 * **화이트리스트로 두고 모르는 코드는 재시도 불가로 본다.** 반대로 두면 처음 보는
 * 코드에서 재시도 버튼이 생겨 사용자가 같은 요청을 반복한다. 엔드포인트별 전체
 * 코드 목록이 아직 없어서(contracts P6) 모르는 코드가 정상적으로 온다.
 */
export const RETRYABLE_AI_ERROR_CODES = [
  AI_SERVICE_ERROR_CODES.RETRIEVAL_FAILED,
  AI_SERVICE_ERROR_CODES.LLM_TIMEOUT,
  AI_RELAY_ERROR_CODES.UPSTREAM_UNAVAILABLE,
  AI_RELAY_ERROR_CODES.UPSTREAM_TIMEOUT,
] as const;

export type RetryableAiErrorCode = (typeof RETRYABLE_AI_ERROR_CODES)[number];

/** 재시도 버튼을 내보낼 코드인지 판정한다. 목록 밖은 전부 `false` 다. */
export function isRetryableAiErrorCode(
  code: string | null | undefined,
): code is RetryableAiErrorCode {
  if (code === null || code === undefined) {
    return false;
  }
  return (RETRYABLE_AI_ERROR_CODES as readonly string[]).includes(code);
}

/**
 * AI 슬롯 화면 다섯(`OrderAiPreview`·`CauseTab`·`DiagnosisTab`·`WikiTab`·
 * `StockAiTab`)이 각자 반복하던 전처리 — `error` 가 `HttpError` 인지 보고
 * `code` 를 꺼내는 자리다 (FINCH-125). `HttpError` 가 아니면(네트워크
 * 끊김 등) `undefined` 다. 화면이 `isHttpError` 를 직접 부르지 않아도 되게 한다.
 */
export function readAiErrorCode(error: unknown): string | undefined {
  return isHttpError(error) ? (error.code ?? undefined) : undefined;
}

/**
 * 같은 전처리의 `message` 쪽이다. `HttpError` 가 아니면 `defaultMessage` 를
 * 대신 쓴다.
 *
 * **`defaultMessage` 는 인자로 받는다.** 서버 `message` 자체가 없을 때 보여줄
 * 문구가 화면마다 다르고, 같은 화면 안에서도 분기마다 다를 수 있다 —
 * `OrderAiPreview` 는 `INSUFFICIENT_DATA` 분기와 일반 실패 분기의 기본 문구가
 * 서로 다르다. 문구를 이 함수 안에 고정하면 그 차이를 표현할 수 없다.
 */
export function readAiErrorMessage(
  error: unknown,
  defaultMessage: string,
): string {
  return isHttpError(error) ? error.message : defaultMessage;
}

/**
 * `INSUFFICIENT_DATA` 인지 판정한다. AI 서비스가 정상적으로 거절한 것이라
 * (contracts C12) 에러 화면이 아니라 화면마다 다른 대체 UI 로 접는다 — 판정만
 * 여기서 하고 무엇을 그릴지는 화면이 정한다.
 */
export function isInsufficientDataErrorCode(
  code: string | null | undefined,
): boolean {
  return code === AI_SERVICE_ERROR_CODES.INSUFFICIENT_DATA;
}
