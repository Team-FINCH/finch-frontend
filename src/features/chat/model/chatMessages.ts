import { type AiSection } from '@/shared/types/ai/envelope';

/**
 * 채팅 화면의 말풍선 하나. 서버 응답(`AiChatContent`)을 그대로 두지 않고
 * 화면이 쓸 모양으로 정규화한 것이다 — 사용자 말풍선·정상 응답·실패를 한 배열에서
 * 다루려면 판별 유니언이 필요하다.
 *
 * **`requestId` 는 응답 말풍선에만 있다.** 피드백 슬롯은 `requestId` 가 있는
 * 응답에만 붙는다(contracts C14·C70) — `AI_UPSTREAM_UNAVAILABLE`·`AI_UPSTREAM_TIMEOUT`
 * 은 백엔드 자체 에러라 `requestId` 가 없다.
 */
export type ChatMessage =
  | { id: string; role: 'user'; text: string }
  | {
      id: string;
      role: 'assistant';
      requestId: string;
      section: AiSection;
      disclaimer: string;
    }
  | {
      id: string;
      role: 'assistant-error';
      message: string;
      /** 재시도 버튼을 낼지. `code` 가 없거나(네트워크 실패) 재시도 가능한 코드일 때만 `true`. */
      retryable: boolean;
      /** 재시도가 다시 보낼 원래 사용자 메시지. */
      retryText: string;
    };

let nextMessageId = 0;

/** 화면 안에서만 쓰는 말풍선 id. 서버 `requestId` 와 다른 값이다 — 사용자 말풍선엔 없다. */
export function createMessageId(): string {
  nextMessageId += 1;
  return `msg_${nextMessageId}`;
}
