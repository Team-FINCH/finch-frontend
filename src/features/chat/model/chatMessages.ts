import { type AiChatHistoryMessage } from '@/shared/types/ai/chat';
import { type AiCitation, type AiSection } from '@/shared/types/ai/envelope';

/**
 * 채팅 화면의 말풍선 하나. 서버 응답(`AiChatContent`)을 그대로 두지 않고
 * 화면이 쓸 모양으로 정규화한 것이다 — 사용자 말풍선·정상 응답·실패를 한 배열에서
 * 다루려면 판별 유니언이 필요하다.
 *
 * **`requestId`·`disclaimer` 는 이번 턴 응답에만 있다.** 피드백 슬롯은 `requestId`
 * 가 있는 응답에만 붙는다(contracts C14·C70) — `AI_UPSTREAM_UNAVAILABLE`·
 * `AI_UPSTREAM_TIMEOUT` 은 백엔드 자체 에러라 `requestId` 가 없고, **복원된
 * 말풍선도 없다**(FINCH-278). 대화 이력 조회(AI 명세 §4.1)도 다른 여섯 종과
 * 같은 봉투로 와서 `requestId`·`disclaimer` 가 봉투 최상위에 실리긴 하지만
 * (FINCH-280), 그 값은 **조회 호출 하나에 대한 것이지 메시지 하나하나에
 * 대한 것이 아니다** — 어느 과거 메시지가 그 값의 주인인지 알 수 없어 개별
 * 말풍선에 붙이지 않는다. `disclaimer` 를 하드코딩해 채우지 않는 이유는
 * `StockAiTab.tsx` 의 같은 주석과 같다 — 규제 문구가 바뀌면 서버만 고치게 하기
 * 위해서라, 서버가 그 메시지에 실제로 준 적 없는 문구를 복원 자리에서 지어내지
 * 않는다. 둘 다 `null` 이면 `ChatBubble` 이 그 자리를 생략한다.
 */
export type ChatMessage =
  | { id: string; role: 'user'; text: string }
  | {
      id: string;
      role: 'assistant';
      requestId: string | null;
      section: AiSection;
      citations: AiCitation[];
      disclaimer: string | null;
      /**
       * 복원된 말풍선인가. `true` 면 `ChatBubble` 이 타자 효과 없이 전문을
       * 바로 그린다 (FINCH-278, task-I — MR `!274` 가 남긴 "복원이 없다"
       * 전제가 이 티켓으로 깨졌다). `requestId`·`disclaimer` 가 `null` 인 것과
       * 항상 같이 다닌다 — 셋 다 "이번 턴에 새로 받은 응답이 아니다"라는 같은
       * 사실에서 나온 값이라 신호를 따로 셋 두지 않았다.
       */
      restored: boolean;
    }
  | {
      id: string;
      role: 'assistant-error';
      message: string;
      /**
       * 재시도 버튼을 낼지. `code` 가 없거나(네트워크 실패) 재시도 가능한 코드일 때만
       * `true` 다. **`retryCount` 가 `MAX_CHAT_RETRY_COUNT` 에 닿으면 코드가 재시도
       * 가능해도 `false` 로 떨어진다** (FINCH-283) — 소진 판정은 호출부
       * (`ChatPage.handleSend`)가 하고, 여기 실린 값은 그 결과다.
       */
      retryable: boolean;
      /** 재시도가 다시 보낼 원래 사용자 메시지. */
      retryText: string;
      /**
       * 이 실패에 이르기까지 이미 쓴 재시도 횟수 (FINCH-283). 세는 단위는
       * **이 실패 말풍선 하나**다 — 처음 실패하면 `0`, `다시 시도`를 눌러 또
       * 실패하면 `1`, 그다음도 실패하면 `2`(소진)다. `MAX_CHAT_RETRY_COUNT` 이상이면
       * `retryable` 이 이미 `false` 라 버튼이 없다. 일일 한도 소진(daily_token_budget)
       * 은 애초에 버튼이 없어 이 값이 의미가 없다 — 항상 `0` 으로 둔다.
       */
      retryCount: number;
    };

/**
 * 실패 말풍선 하나가 가질 수 있는 재시도 최대 횟수 (FINCH-283).
 * 대화 전체가 아니라 **실패 말풍선 단위**로 센다 — `retryCount` 주석 참고.
 * 다 쓰면 버튼을 없애고 입력창으로 유도한다(`ChatPage.handleSend`).
 */
export const MAX_CHAT_RETRY_COUNT = 2;

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

/**
 * 대화 이력 한 줄을 말풍선으로 바꾼다 (FINCH-278). **`assistant-error` 갈래로
 * 오는 일이 없다** — AI 명세 §4.1 "성공한 질문과 최종 답변만 저장한다. 생성
 * 실패·가드레일 차단은 이력에 안 남는다"가 그 근거다. 그래서 `findRetryTargetId`
 * 가 복원된 대화 끝에서 재시도 버튼을 잘못 켜는 일도 없다 — 실패가 애초에 이
 * 함수를 거치지 않는다.
 *
 * `content` 는 평문이라 `section` 은 `segments` 없이 `text` 하나만 채운
 * 최소 모양이다(`ChatBubble` 이 `segments` 를 순회하지 않고 `text` 만 그리는
 * 기본 렌더링 경로를 그대로 쓴다). `requestId`·`disclaimer` 는 `null`, `restored`
 * 는 `true` 다 — 타자 효과를 끄고 피드백 슬롯·문구를 생략하는 신호다.
 */
export function toRestoredMessage(entry: AiChatHistoryMessage): ChatMessage {
  if (entry.role === 'user') {
    return { id: createMessageId(), role: 'user', text: entry.content };
  }
  return {
    id: createMessageId(),
    role: 'assistant',
    requestId: null,
    section: {
      title: null,
      text: entry.content,
      segments: [],
      cached: false,
      cachedAt: null,
    },
    citations: [],
    disclaimer: null,
    restored: true,
  };
}
