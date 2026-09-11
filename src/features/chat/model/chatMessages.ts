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

/**
 * `다시 시도` 를 달 말풍선의 id. 없으면 `null` 이고, 그때는 화면 어디에도 버튼이
 * 없다 (FINCH-249).
 *
 * **버튼은 대화의 끝에 있는 실패 하나만 갖는다.** 248 이 넣은 `handleSend` 의
 * `isPending` 가드는 답을 기다리는 동안의 중복만 막는다. AI 가 실패할 때는 324ms
 * 만에 돌아와서(GitLab #75) 가드가 참인 구간이 0.3초뿐이고, 그보다 느리게 연타하면
 * 그냥 통과한다. 실제로 같은 질문이 여섯 번 쌓였다. **진짜 원인은 실패 말풍선이
 * 쌓이면서 각자 버튼을 하나씩 들고 있는 것**이라 여기서 그것을 없앤다.
 *
 * 판정은 **뒤에서부터 사용자 말풍선을 건너뛰고 처음 만나는 말풍선**이 재시도 가능한
 * 실패인가로 한다. 사용자 말풍선을 건너뛰는 이유는 두 가지다.
 *
 * - 누른 직후 버튼이 **사라지지 않고 잠긴다.** `다시 시도` 를 누르면 질문 말풍선이
 *   먼저 붙는데, "마지막 메시지가 실패일 때만" 으로 보면 그 순간 버튼이 통째로
 *   없어졌다가 새 실패 말풍선에 다시 나타난다. 기다리는 동안 버튼이 제자리에서
 *   흐려지는 편이 무엇을 기다리는지 읽힌다 — `retryDisabled` 가 이때 쓰인다.
 * - 그 질문의 답이 **성공으로 돌아오면 버튼은 저절로 사라진다.** 마지막이 답변
 *   말풍선이 되어 이 함수가 `null` 을 준다. 대화가 지나간 실패를 다시 보낼 이유가
 *   없다.
 *
 * 중간 실패를 다시 보내고 싶은 사용자는 입력창에 다시 적으면 된다. 버튼은 방금 실패한
 * 것을 한 번 더 보내는 지름길이지 실패 이력의 재생 장치가 아니다 — 이미 다시 보낸 질문
 * 위에 버튼이 남아 있으면 그것이 무엇을 보내는 버튼인지 알 수 없다.
 */
export function findRetryTargetId(messages: ChatMessage[]): string | null {
  const tail = messages.findLast((message) => message.role !== 'user');
  if (tail === undefined || tail.role !== 'assistant-error') {
    return null;
  }
  return tail.retryable ? tail.id : null;
}
