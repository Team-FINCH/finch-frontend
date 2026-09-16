import { z } from 'zod';

import { isRetryableAiErrorCode } from '@/shared/lib/aiErrorRetry';
import {
  AiChatContentSchema,
  type AiChatResponse,
} from '@/shared/types/ai/chat';
import { createAiResponseSchema } from '@/shared/types/ai/envelope';
import { ErrorDetailSchema, type ErrorDetail } from '@/shared/types/error';
import { AI_RELAY_ERROR_CODES } from '@/shared/types/errorCodes';
import { IsoDateTimeSchema } from '@/shared/types/primitives';

/**
 * AI 채팅 비동기 작업 — **계약 어댑터** (FINCH-290 → 298, GitLab 이슈 #84 · #90).
 *
 * **응답 모양은 확정됐다** (2026-09-16, AI 파트 구현 머지 · `ai/docs/api-spec.md` §4.2 ·
 * `ai/app/api/routes/chat.py` `_job_envelope`). 290 이 이슈 #84 의 제안으로 만든
 * 잠정 계약은 한 곳에서 틀렸다 — **AI 공통 봉투가 그대로 유지된다.** 290 은
 * `202 {jobId}` · `200 {jobId, status, result}` 를 가정했는데 실제로는 그 셋이
 * 전부 봉투의 `content` 안에 들어 있고, 완료된 답의 `citations`·`dataAsOf` 는
 * **봉투 최상위**에 실린다.
 *
 * 그래서 봉투를 푸는 일은 여기서 새로 만들지 않고 다른 AI 중계 13종과 같은
 * `createAiResponseSchema`(`shared/types/ai/envelope.ts`)로 한다. 여기만 다르게
 * 풀면 다음 사람이 봉투 규칙을 두 벌 외워야 한다.
 *
 * **여전히 이 파일이 서버 모양과 화면 모양의 경계다.** 서버가 주는 것(아래 Zod
 * 스키마)과 화면이 읽는 것(`ChatJobState`)을 갈라 두어, 계약이 또 움직여도 고칠
 * 곳이 이 파일과 `mocks/handlers/ai.ts` 둘로 끝나고 `ChatPage` 의 상태 관리·
 * 말풍선 렌더는 그대로 산다 — 이번 수정이 실제로 그 둘로 끝났다(`contracts.md` T4).
 *
 * **아직 붙여 볼 수 없다.** 백엔드 중계에 이 두 경로가 없다(`AiRoute.java` 에
 * `/chat` 과 `/chat/conversations/…` 둘뿐). 중계가 열리는 순간 바로 동작하도록
 * 미리 맞춰 두는 것이 이 수정의 목적이고, 그때까지 계약의 유일한 구현은 목이다.
 *
 * 완료 통지는 **폴링으로 받는다. SSE 를 쓰지 않는다** — 커밋 `34ed34a`(2026-08-20)로
 * 폐기된 결정이고 되살리려면 백엔드 스트리밍 프록시가 먼저다
 * (`frontConvention.md` §5 · `contracts.md` C4).
 */

/**
 * 서버가 주는 상태 문자열 넷 (AI 명세 §4.2, 구현 확인).
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
 * 것이 규약이라(apiSpec §1.3) 실제로는 오지 않을 갈래지만, 문구 없는 빈 말풍선을
 * 내놓는 것보다 낫다.
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
 * `POST /ai/chat/jobs` 응답 (202) 의 `content` (AI 명세 §4.2 · `create_chat_job`).
 *
 * 셋 다 실려 오지만 **화면에 필요한 것은 `jobId` 하나다.** `status` 는 접수
 * 직후라 언제나 `queued` 고 첫 폴링이 다시 알려주며, `conversationId` 는 job 이
 * 끝났을 때 `result.conversationId` 로 다시 온다 — 같은 값을 두 곳에서 읽으면
 * 둘이 어긋났을 때 어느 쪽이 맞는지 화면이 정해야 한다. 여기서 버린다.
 */
const ChatJobCreatedContentSchema = z.object({
  jobId: z.string().min(1),
  status: z.enum(CHAT_JOB_STATUSES),
  conversationId: z.string(),
});

export const ChatJobCreatedSchema = createAiResponseSchema(
  ChatJobCreatedContentSchema,
);
export type ChatJobCreatedResponse = z.infer<typeof ChatJobCreatedSchema>;

/** 접수 결과 중 화면이 들고 가는 것. 스토리지에 적히는 값이기도 하다. */
export type ChatJobCreated = { jobId: string };

/** 접수 응답에서 `jobId` 만 꺼낸다. 봉투가 호출부로 새어 나가지 않게 하는 자리다. */
export function toChatJobCreated(raw: ChatJobCreatedResponse): ChatJobCreated {
  return { jobId: raw.content.jobId };
}

/**
 * 실패한 job 의 본문. **HTTP 실패가 아니라 200 응답의 `content.error` 다** — 그래서
 * `HttpError` 가 아니고 `shared/lib/aiErrorRetry.ts` 의 `readAiErrorCode` 계열이
 * 그대로 먹지 않는다.
 *
 * **`retryable` 이 확정으로 들어왔다** (이슈 #90 · `app/chat_jobs.py` `RETRYABLE`).
 * 만든 쪽이 "다시 눌러 볼 가치가 있는가"를 한 줄로 알려준다 — 프론트가 코드별
 * 분기표를 또 드는 것보다 낫다는 것이 이슈가 적은 의도다. 서버가 주지 않으면
 * (옛 서버·필드 누락) `null` 이고 판정은 코드 분기표로 되돌아간다
 * (`isChatJobFailureRetryable`).
 *
 * **`detail` 은 AI 가 지금 싣지 않는다.** `run_job` 이 만드는 실패 본문은
 * `code`·`message`·`retryable` 셋뿐이고 `AppError.detail` 을 버린다. 자리를
 * 남겨 두는 것은 중계가 채워 줄 여지 때문이고, 없으면 `null` 이라 판정이
 * 조용히 틀리지 않는다.
 */
const ChatJobErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string(),
  retryable: z.boolean().nullish(),
  detail: ErrorDetailSchema.nullish(),
});

/**
 * `GET /ai/chat/jobs/{jobId}` 응답의 `content` (AI 명세 §4.2 · `get_chat_job`).
 *
 * `result` 는 **완료일 때만** 찬다. 그 모양은 동기 경로(`POST /ai/chat`)의
 * `content` 와 같은 `AiChatContent` 이고, 그 답의 `citations`·`dataAsOf` 는
 * 여기가 아니라 **봉투 최상위**에 실린다 — 어댑터가 둘을 다시 합쳐 화면에
 * `AiChatResponse` 하나로 넘긴다.
 *
 * `result`·`error` 를 `nullish` 로 둔 것은 상태마다 한쪽만 실리기 때문이다.
 * **판별 유니언으로 짜지 않는다** — 계약인 것은 `status` 값이지 키의 유무가
 * 아니라서, 유니언으로 묶으면 `completed` 인데 `result` 가 아직 안 실린 과도기
 * 응답에서 스키마가 통째로 터진다.
 *
 * `createdAt`·`completedAt` 은 화면이 읽지 않지만 자리를 둔다. 계약에 있는 것을
 * 스키마에서 지우면 다음 사람이 "없는 값"으로 읽는다.
 */
const ChatJobStatusContentSchema = z.object({
  jobId: z.string().min(1),
  status: z.enum(CHAT_JOB_STATUSES),
  conversationId: z.string(),
  createdAt: IsoDateTimeSchema.nullish(),
  completedAt: IsoDateTimeSchema.nullish(),
  result: AiChatContentSchema.nullish(),
  error: ChatJobErrorSchema.nullish(),
});

export const ChatJobStatusSchema = createAiResponseSchema(
  ChatJobStatusContentSchema,
);
export type ChatJobStatusResponse = z.infer<typeof ChatJobStatusSchema>;

/** 실패한 job 이 남긴 것. 화면이 문구와 재시도 가능 여부를 여기서 뽑는다. */
export type ChatJobFailure = {
  code: string | null;
  message: string;
  detail: ErrorDetail | null;
  /**
   * 서버가 알려준 재시도 가능 여부. **job 실패 본문에만 있다** — 접수 요청이
   * HTTP 로 실패한 경우(`ChatPage` 의 `toChatJobFailure`)에는 서버가 이 값을
   * 주지 않는다. 그래서 필수가 아니라 선택 필드다. 판정은 이 값을 직접 읽지 말고
   * `isChatJobFailureRetryable` 로 한다 — 없을 때의 대체 경로가 거기 있다.
   */
  retryable?: boolean | null;
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
  const { content, requestId, dataAsOf, citations, disclaimer } = raw;

  if (content.status === 'completed') {
    /**
     * `completed` 인데 `result` 가 없으면 **대기로 본다.** 실패로 떨어뜨리면
     * 받을 수 있었던 답을 우리가 먼저 버리는 쪽으로 틀린다 — 다음 폴링이 본문을
     * 싣고 오면 그대로 이어진다.
     */
    if (content.result === null || content.result === undefined) {
      return { kind: 'pending' };
    }
    /**
     * **봉투를 여기서 다시 합친다.** AI 는 답의 `citations`·`dataAsOf` 를 job
     * 봉투 최상위에 싣고 본문만 `content.result` 에 둔다(`_job_envelope`). 화면은
     * 동기 경로가 주던 것과 같은 `AiChatResponse` 하나만 알면 되므로 그 모양으로
     * 되돌린다 — 말풍선 렌더가 한 줄도 바뀌지 않는 이유가 이 네 줄이다.
     *
     * **`requestId` 는 job 조회 봉투의 것이다.** 답을 만들 때 쓰인 원래
     * `requestId` 가 아니다 — `_job_envelope` 이 조회마다 새 값을 발급하고 저장된
     * 답의 `request_id` 는 쓰지 않는다. 피드백(`POST /ai/feedback`)이 이 값으로
     * 원본 응답을 찾으므로 그대로면 채팅 피드백이 원본을 못 찾는다
     * (`contracts.md` P43 으로 등재, AI 파트 회신 대기). 화면이 읽는 자리는
     * 여기 하나라 회신이 오면 이 줄만 바뀐다.
     */
    return {
      kind: 'completed',
      answer: {
        content: content.result,
        requestId,
        dataAsOf,
        citations,
        disclaimer,
      },
    };
  }

  if (content.status === 'failed') {
    return {
      kind: 'failed',
      failure: {
        code: content.error?.code ?? null,
        message: content.error?.message ?? CHAT_JOB_DEFAULT_FAILURE_MESSAGE,
        detail: content.error?.detail ?? null,
        retryable: content.error?.retryable ?? null,
      },
    };
  }

  return { kind: 'pending' };
}

/**
 * 이 실패에 "다시 시도" 버튼을 붙일 것인가.
 *
 * **서버가 말해 주면 그것을 따른다** (`error.retryable`, 이슈 #90). 만든 쪽이
 * 무엇이 일시적인지 가장 잘 알고, 그 표가 바뀌어도 프론트를 고치지 않아도 된다.
 *
 * **값이 없으면 코드 분기표로 되돌아간다.** 없는 경우는 둘이다 — 접수 요청의
 * HTTP 실패(서버가 이 필드를 줄 자리가 아니다)와, 옛 서버·필드 누락이다. 그때
 * "재시도 불가"로 못 박으면 다시 눌렀으면 받았을 답을 우리가 먼저 버리는 쪽으로
 * 틀린다. 분기표(`isRetryableAiErrorCode`)는 그대로 살아 있으므로 290 까지의
 * 판정을 그대로 쓴다.
 *
 * `code` 도 없으면(네트워크 끊김·스키마 불일치) 재시도 가능으로 본다 — 서버가
 * 거절한 것이 아니라 닿지 못한 것이라서다.
 *
 * **호출부는 `isChatJobDailyBudgetFailure` 를 먼저 본다.** 일일 예산 소진은
 * 자정(KST)까지 풀리지 않아 재시도 횟수와 무관하게 버튼이 없어야 하는데,
 * 그 갈래는 `code` 가 아니라 `detail.reason` 으로만 갈린다.
 *
 * `ChatPage` 의 `toChatErrorMessage` 가 이 함수를 부른다(FINCH-297 머지 뒤
 * 298 후속으로 교체). **판정 결과는 그전과 같다** — AI 가 `retryable: true` 로
 * 주는 코드(`LLM_TIMEOUT`·`RETRIEVAL_FAILED`)가 분기표에도 들어 있어서다. 값이
 * 갈리는 것은 AI 가 표를 바꾼 뒤부터다.
 */
export function isChatJobFailureRetryable(failure: ChatJobFailure): boolean {
  if (failure.retryable !== null && failure.retryable !== undefined) {
    return failure.retryable;
  }
  if (failure.code === null) {
    return true;
  }
  return (
    isRetryableAiErrorCode(failure.code) ||
    failure.code === AI_RELAY_ERROR_CODES.UPSTREAM_RATE_LIMITED
  );
}

/**
 * 일일 AI 예산이 마른 실패인가 (FINCH-283 과 같은 판정).
 * **`code` 와 `reason` 을 함께 본다** — `reason` 만 보면 다른 엔드포인트가 우연히
 * 같은 키를 쓰는 `detail` 을 잘못 판정한다(`aiErrorRetry.ts` 의 같은 함수 주석).
 *
 * 이 갈래는 실제로는 **접수(`POST /ai/chat/jobs`)에서 온다.** AI 는 한도 검사를
 * job 을 만들기 전에 하고(`UsageLimit` 의존성), 생성 중에 예산이 마르는 경우는
 * `run_job` 의 실패 본문에 담기지 않는다. 그래도 job 실패 본문에서도 판정하는
 * 이유는 두 문이 같은 모양(`ChatJobFailure`)으로 합류하기 때문이다 — 문마다
 * 다른 판정을 두면 같은 코드가 화면에서 다르게 보인다.
 */
export function isChatJobDailyBudgetFailure(failure: ChatJobFailure): boolean {
  if (failure.code !== AI_RELAY_ERROR_CODES.UPSTREAM_RATE_LIMITED) {
    return false;
  }
  const reason = failure.detail?.reason;
  return reason === DAILY_TOKEN_BUDGET_REASON;
}
