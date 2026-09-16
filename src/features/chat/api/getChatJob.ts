import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';

import {
  ChatJobStatusSchema,
  toChatJobState,
  type ChatJobState,
} from '../model/chatJob';

/**
 * 진행 중인 AI 채팅 job 을 조회한다 (`GET /ai/chat/jobs/{jobId}`, GitLab 이슈 #84 ·
 * #90 · FINCH-290 → 298). **응답 모양은 확정됐다** — `model/chatJob.ts` 머리 주석 참고.
 *
 * **서버 모양을 밖으로 내보내지 않는다.** 검증은 `ChatJobStatusSchema` 가 하고,
 * 돌려주는 것은 화면 모양(`ChatJobState`)이다. 호출부가 `status` 문자열 넷도, AI
 * 공통 봉투도 직접 보지 않으므로 서버가 상태를 하나 더 늘려도 고칠 자리가 여기서 끝난다.
 *
 * **없는 `jobId`·만료된 job·남의 job 은 전부 `404 RESOURCE_NOT_FOUND` 로 온다**
 * (AI 명세 §4.2 · `get_chat_job`). 보존 24시간이라 `localStorage` 에 적어 둔
 * `jobId` 로 한참 뒤에 돌아오면 이 404 를 받는데, 그때 무한 로딩이 되지 않게
 * 하는 것은 `ChatPage` 의 `CHAT_JOB_POLL_FAILURE_LIMIT`(연속 5회 실패 →
 * 재시도 가능한 실패) 이다 — 290 이 이미 그 갈래를 덮었다.
 */
export function getChatJob(
  jobId: string,
  signal?: AbortSignal,
): Promise<ChatJobState> {
  return request(API_PATHS.ai.chatJob(jobId), {
    schema: ChatJobStatusSchema,
    signal,
  }).then(toChatJobState);
}
