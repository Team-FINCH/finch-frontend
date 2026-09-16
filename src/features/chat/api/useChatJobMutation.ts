import { useMutation } from '@tanstack/react-query';

import { type AiChatRequest } from '@/shared/types/ai/chat';
import { type IdempotencyKey } from '@/shared/types/primitives';

import { storePendingChatJob } from '../lib/chatPendingJob';

import { postChatJob } from './postChatJob';

type Variables = {
  /** 서버로 나가는 본문. 동기 경로(`POST /ai/chat`)와 같은 모양이다. */
  body: AiChatRequest;
  /**
   * 호출부(`ChatPage.handleSend`)가 **클릭 단위로** 만들어 넘긴다 — 이 훅은 키를
   * 스스로 만들지 않는다. 마운트 시점에 한 번 만들어 재사용하면 서로 다른 전송이
   * 같은 키를 써서 두 번째 질문이 첫 번째 답을 되받는다
   * (`shared/lib/idempotencyKey.ts`).
   */
  idempotencyKey: IdempotencyKey;
  /**
   * 이 전송이 몇 번째 재시도인지. **서버로 나가지 않는다** — 실패했을 때 재시도
   * 예산(`MAX_CHAT_RETRY_COUNT`)을 화면 이동 너머로 이어 세려고 스토리지에 함께
   * 적어 두는 값이다.
   */
  retryCount: number;
};

/**
 * AI 채팅 job 접수 (FINCH-290). 쿼리가 아니라 뮤테이션인 이유는
 * `useKakaoLogin` 과 같다 — 자동 재시도·리페치가 대화 순서를 어긋나게 만든다.
 * `createQueryClient` 의 뮤테이션 기본값(`retry: false`)에 기댄다. **AI 생성은
 * 접수만으로 비용이 나가므로 자동 재시도는 특히 위험하다.**
 *
 * **`jobId` 를 스토리지에 적는 것은 화면이 아니라 이 훅이 한다.** `mutate()` 에
 * 넘긴 콜백은 컴포넌트가 언마운트되면 호출되지 않지만 훅 옵션의 `onSuccess` 는
 * 호출된다(TanStack Query). 보내자마자 화면을 옮기는 것이 이 티켓이 다루는 바로
 * 그 상황이라, 그 순간에 jobId 를 흘리면 고치려던 문제가 접수 구간에 그대로 남는다.
 */
export function useChatJobMutation() {
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: Variables) =>
      postChatJob(body, idempotencyKey),
    onSuccess: (created, variables) => {
      storePendingChatJob({
        jobId: created.jobId,
        conversationId: variables.body.conversationId ?? null,
        question: variables.body.message,
        retryCount: variables.retryCount,
      });
    },
  });
}
