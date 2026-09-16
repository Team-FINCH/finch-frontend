import { request } from '@/shared/api';
import { API_PATHS, IDEMPOTENCY_KEY_HEADER } from '@/shared/config/apiContract';
import { type AiChatRequest } from '@/shared/types/ai/chat';
import { type IdempotencyKey } from '@/shared/types/primitives';

import { ChatJobCreatedSchema, type ChatJobCreated } from '../model/chatJob';

/**
 * AI 채팅 생성 요청을 접수시킨다 (`POST /ai/chat/jobs` → `202` + `jobId`,
 * GitLab 이슈 #84 · FINCH-290). **계약은 잠정 확정이다** — 근거와 고칠 범위는
 * `model/chatJob.ts` 머리 주석에 있다.
 *
 * 요청 본문은 동기 경로(`POST /ai/chat`)와 같은 `AiChatRequest` 를 그대로 쓴다.
 * 질문·`conversationId`·`context` 는 비동기가 되어도 달라질 것이 없고, 같은 타입을
 * 쓰면 계약이 뒤집혔을 때 되돌릴 범위가 이 파일 한 장으로 줄어든다.
 *
 * **`Idempotency-Key` 를 싣는다** (apiSpec §1.4 · contracts C30). 답이 오기 전에
 * 끊긴 요청을 다시 보낼 때 job 이 둘 생기면 **AI 생성 비용이 두 번 나간다** — 주문·
 * 출금이 이 헤더를 쓰는 이유와 같은 성격이다. 키는 호출부가 **클릭 단위로** 만들어
 * 넘긴다. 이 함수는 키를 스스로 만들지 않는다(`postWithdrawal.ts` 와 같은 본).
 *
 * **백엔드가 이 경로를 `finch.idempotency.paths` 에 태울지는 아직 모른다** —
 * `contracts.md` P41 로 등재하고 질문을 발송 대기에 올렸다. 태우지 않기로 하면
 * 헤더는 무시되고 중복 방지는 job 생성 쪽 구현이 맡는다. 어느 쪽이든 **프론트가
 * 헤더를 싣는 것 자체는 손해가 아니라서** 회신을 기다리지 않고 실어 보낸다.
 */
export function postChatJob(
  body: AiChatRequest,
  idempotencyKey: IdempotencyKey,
  signal?: AbortSignal,
): Promise<ChatJobCreated> {
  return request(API_PATHS.ai.chatJobs, {
    method: 'POST',
    body,
    headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
    schema: ChatJobCreatedSchema,
    signal,
  });
}
