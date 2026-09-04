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
