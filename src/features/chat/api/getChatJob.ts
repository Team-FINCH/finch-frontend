import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';

import {
  ChatJobStatusSchema,
  toChatJobState,
  type ChatJobState,
} from '../model/chatJob';

/**
 * 진행 중인 AI 채팅 job 을 조회한다 (`GET /ai/chat/jobs/{jobId}`, GitLab 이슈 #84 ·
 * FINCH-290). **계약은 잠정 확정이다** — `model/chatJob.ts` 머리 주석 참고.
 *
 * **서버 모양을 밖으로 내보내지 않는다.** 검증은 `ChatJobStatusSchema` 가 하고,
 * 돌려주는 것은 화면 모양(`ChatJobState`)이다. 호출부가 `status` 문자열 넷을 직접
 * 보지 않으므로 서버가 상태를 하나 더 늘려도 고칠 자리가 여기서 끝난다.
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
