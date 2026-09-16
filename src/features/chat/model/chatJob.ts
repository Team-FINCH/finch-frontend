import { z } from 'zod';

import {
  AiChatResponseSchema,
  type AiChatResponse,
} from '@/shared/types/ai/chat';
import { ErrorDetailSchema, type ErrorDetail } from '@/shared/types/error';
import { AI_RELAY_ERROR_CODES } from '@/shared/types/errorCodes';

/**
 * AI 채팅 비동기 작업 — **계약 어댑터** (FINCH-290, GitLab 이슈 #84).
 *
 * **계약은 잠정 확정이다.** 이슈 #84 가 제안한 모양이고 백엔드가 확정하지 않았다
 * (`frontend/docs/contracts.md` T4 · P40, 2026-09-16 사용자 결정). 그래서 서버가
 * 주는 모양(아래 Zod 스키마)과 화면이 읽는 모양(`ChatJobState`)을 이 파일 하나에서
 * 갈라 둔다. **백엔드가 다르게 확정하면 고칠 곳은 이 파일과 `mocks/handlers/ai.ts`
 * 둘뿐이고 `ChatPage` 의 상태 관리·말풍선 렌더는 그대로 산다.** 이 티켓의 설계
 * 요점이라 스키마를 `shared/types/ai/` 가 아니라 여기 둔다 — 확정된 계약을 모아 둔
 * 자리에 잠정 계약을 섞으면 무엇이 확정인지 다음 사람이 구분하지 못한다.
 *
 * 완료 통지는 **폴링으로 받는다. SSE 를 쓰지 않는다** — 커밋 `34ed34a`(2026-08-20)로
 * 폐기된 결정이고 되살리려면 백엔드 스트리밍 프록시가 먼저다
 * (`frontConvention.md` §5 · `contracts.md` C4).
 */

/**
 * 서버가 주는 상태 문자열 넷 (이슈 #84 제안).
 * 화면은 이 값을 직접 보지 않는다 — 아래 `ChatJobState` 로 셋으로 줄여 넘긴다.
 */
export const CHAT_JOB_STATUSES = [
  'queued',
  'running',
  'completed',
  'failed',
] as const;

/**
 * `error` 없이 `failed` 만 왔을 때의 문구. 서버가 사용자 노출 문구를 완성해 주는
 * 것이 규약이지만(apiSpec §1.3) 계약이 잠정이라 그 갈래를 열어 둔다.
 */
export const CHAT_JOB_DEFAULT_FAILURE_MESSAGE = '답을 받지 못했어요.';

/**
 * `429 AI_UPSTREAM_RATE_LIMITED` 의 두 갈래를 가르는 `detail.reason`
 * (apiSpec §10.4 v0.8.6). **세 번째 사본이다** — `shared/api/queryClient.ts` 와
 * `shared/lib/aiErrorRetry.ts` 가 각자 하나씩 들고 있고, 그 파일들이 적어 둔
 * "계층이 달라 합치지 않는다"가 여기에도 그대로 걸린다. 저 둘은 `HttpError` 를
 * 읽는데 이쪽이 읽는 것은 **200 응답의 본문**이다.
 */
const DAILY_TOKEN_BUDGET_REASON = 'daily_token_budget';

/**
 * `POST /ai/chat/jobs` 응답 (202). **`jobId` 하나만 읽는다.** 서버가
 * `status: 'queued'` 를 함께 실어도 무시한다 — 접수 직후 상태는 첫 폴링이 다시
 * 알려주므로 같은 값을 두 곳에서 읽을 이유가 없다.
 */
export const ChatJobCreatedSchema = z.object({
  jobId: z.string().min(1),
});
export type ChatJobCreated = z.infer<typeof ChatJobCreatedSchema>;

/**
 * 실패한 job 의 본문. **HTTP 실패가 아니라 200 응답의 본문이다** — 그래서
 * `HttpError` 가 아니고 `shared/lib/aiErrorRetry.ts` 의 `readAiErrorCode` 계열이
 * 그대로 먹지 않는다. 키 구성은 apiSpec §1.3 의 실패 본문을 그대로 쓴다고 본 것이다(잠정).
 */
const ChatJobErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string(),
  detail: ErrorDetailSchema.nullish(),
});

/**
 * `GET /ai/chat/jobs/{jobId}` 응답 (이슈 #84 제안).
 *
 * `result` 는 **동기 경로(`POST /ai/chat`)가 주던 응답을 그대로** 담는다고 본다 —
 * 그래야 말풍선 렌더가 한 줄도 바뀌지 않고 피드백 슬롯(`requestId`)도 살아남는다.
 *
 * `result`·`error` 를 `nullish` 로 둔 것은 상태마다 한쪽만 실리기 때문이다.
 * **판별 유니언으로 짜지 않는다** — 계약인 것은 `status` 값이지 키의 유무가
 * 아니라서, 유니언으로 묶으면 `completed` 인데 `result` 가 아직 안 실린 과도기
 * 응답에서 스키마가 통째로 터진다.
 */
export const ChatJobStatusSchema = z.object({
  jobId: z.string().min(1),
  status: z.enum(CHAT_JOB_STATUSES),
  result: AiChatResponseSchema.nullish(),
  error: ChatJobErrorSchema.nullish(),
});
export type ChatJobStatusResponse = z.infer<typeof ChatJobStatusSchema>;

/** 실패한 job 이 남긴 것. 화면이 문구와 재시도 가능 여부를 여기서 뽑는다. */
export type ChatJobFailure = {
  code: string | null;
  message: string;
  detail: ErrorDetail | null;
};

/**
 * 화면이 읽는 job 상태. **서버의 네 값을 셋으로 줄인다** — `queued` 와 `running` 은
 * 화면에서 하는 일이 같다(점 세 개를 띄운다). 둘을 그대로 들고 오면 "둘을 같게
 * 다룬다"는 판단을 화면이 매번 다시 하게 되고, 서버가 상태를 하나 더 늘렸을 때
 * 고칠 곳이 화면까지 번진다.
 */
export type ChatJobState =
  | { kind: 'pending' }
  | { kind: 'completed'; answer: AiChatResponse }
  | { kind: 'failed'; failure: ChatJobFailure };

/** 서버가 준 값(검증을 통과한 것)을 화면 모양으로 바꾼다. 어댑터의 몸통이다. */
export function toChatJobState(raw: ChatJobStatusResponse): ChatJobState {
  if (raw.status === 'completed') {
    /**
     * `completed` 인데 `result` 가 없으면 **대기로 본다.** 실패로 떨어뜨리면
     * 받을 수 있었던 답을 우리가 먼저 버리는 쪽으로 틀린다 — 다음 폴링이 본문을
     * 싣고 오면 그대로 이어진다.
     */
    return raw.result === null || raw.result === undefined
      ? { kind: 'pending' }
      : { kind: 'completed', answer: raw.result };
  }

  if (raw.status === 'failed') {
    return {
      kind: 'failed',
      failure: {
        code: raw.error?.code ?? null,
        message: raw.error?.message ?? CHAT_JOB_DEFAULT_FAILURE_MESSAGE,
        detail: raw.error?.detail ?? null,
      },
    };
  }

  return { kind: 'pending' };
}

/**
 * 일일 AI 예산이 마른 실패인가 (FINCH-283 과 같은 판정).
 * **`code` 와 `reason` 을 함께 본다** — `reason` 만 보면 다른 엔드포인트가 우연히
 * 같은 키를 쓰는 `detail` 을 잘못 판정한다(`aiErrorRetry.ts` 의 같은 함수 주석).
 */
export function isChatJobDailyBudgetFailure(failure: ChatJobFailure): boolean {
  if (failure.code !== AI_RELAY_ERROR_CODES.UPSTREAM_RATE_LIMITED) {
    return false;
  }
  const reason = failure.detail?.reason;
  return reason === DAILY_TOKEN_BUDGET_REASON;
}
