import { request } from '@/shared/api';
import { API_PATHS, IDEMPOTENCY_KEY_HEADER } from '@/shared/config/apiContract';
import { type AiChatRequest } from '@/shared/types/ai/chat';
import { type IdempotencyKey } from '@/shared/types/primitives';

import {
  ChatJobCreatedSchema,
  toChatJobCreated,
  type ChatJobCreated,
} from '../model/chatJob';

/**
 * AI 채팅 생성 요청을 접수시킨다 (`POST /ai/chat/jobs` → `202`, GitLab 이슈 #84 · #90 ·
 * FINCH-290 → 298).
 *
 * **응답은 AI 공통 봉투다.** `jobId` 는 본문 최상위가 아니라 `content` 안에 있다 —
 * 봉투를 벗기고 `jobId` 만 꺼내는 것은 `toChatJobCreated` 가 한다. 이 함수가
 * 돌려주는 것은 화면 모양이고 호출부는 봉투를 모른다(`getChatJob` 과 같은 본).
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
 * **AI 쪽 2차 방어는 확정됐다** (이슈 #90 · `_create_job`). 같은 `X-Idempotency-Key`
 * 로 다시 오면 409 가 아니라 **같은 `jobId` 를 202 로** 다시 준다. 백엔드가 이 경로를
 * `finch.idempotency.paths` 에 태울지는 **아직 모르지만**(`contracts.md` P41) 태우지
 * 않아도 중복 접수가 job 을 둘 만들지는 않는다 — 헤더를 싣는 것은 어느 쪽이든 맞다.
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
  }).then(toChatJobCreated);
}
