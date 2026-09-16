import { z } from 'zod';

/**
 * 답을 기다리는 중인 AI 채팅 job 을 화면 밖에 적어 두는 자리 (FINCH-290).
 *
 * 이 값이 있어야 **라우트 이동과 새로고침을 건너서** 진행 중 상태가 복원된다.
 * 화면 메모리(`useState`)만으로는 `ChatPage` 가 언마운트되는 순간 jobId 가 사라져,
 * 이미 돈이 나간 생성 결과를 사용자가 영영 못 받는다 — 이 티켓이 푸는 문제다.
 *
 * ## 왜 `localStorage` 인가
 *
 * **zustand 를 기각했다.** 라우트 이동은 건너지만 새로고침을 못 건넌다. 새로고침이
 * 빠지면 "브라우저를 잘못 눌렀다" 한 번에 답이 사라지는데, 그것이 바로 이 기능이
 * 없애려던 상황이라 절반만 고친 것이 된다. zustand + `persist` 미들웨어를 쓰면
 * 둘 다 되지만, 지금 이 값을 읽는 곳이 `ChatPage` 하나뿐이라 전역 스토어가 주는
 * 것이 없다. 스토어가 필요해지는 시점은 채팅 화면 밖(예: 탭 바 배지)에서도 진행
 * 상태를 보여야 할 때이고, 그때 이 파일을 스토어 뒤로 옮기면 된다.
 *
 * `conversationId` 는 **여기 새로 만들지 않고** `shared/lib/chatConversationId` 를
 * 그대로 쓴다(FINCH-278 의 결정, 챗방을 종목별로 나누지 않는다). 다만 job 이
 * 접수될 당시의 값을 함께 적어 둔다 — 대화를 초기화하고 돌아왔을 때 어느 대화에
 * 속한 job 인지 알아야 엉뚱한 대화에 답을 붙이지 않는다.
 *
 * **읽기·쓰기를 전부 `try/catch` 로 감싼다.** 사파리 프라이빗 모드 등에서
 * `localStorage` 접근 자체가 예외를 던진다 — 실패는 "기다리는 job 이 없다"와 같게
 * 다룬다(`chatConversationId.ts`·`updateNoticeSeen.ts` 와 같은 패턴).
 */
const STORAGE_KEY = 'finch.chat.pendingJob';

/**
 * 스토리지에 적힌 값도 **검증하고 읽는다.** 배포를 거치며 모양이 바뀌면 옛 값이
 * 그대로 남아 있는데, 검증 없이 읽으면 `question` 이 `undefined` 인 말풍선이
 * 화면에 뜬다. 모양이 안 맞으면 없는 것으로 보고 지운다.
 */
const PendingChatJobSchema = z.object({
  jobId: z.string().min(1),
  /** job 을 접수시킨 대화. 새 대화의 첫 질문이면 `null` 이다. */
  conversationId: z.string().nullable(),
  /** 사용자가 보낸 원문. 복원한 화면에 질문 말풍선을 되살리고 재시도에 다시 쓴다. */
  question: z.string().min(1),
  /**
   * 이 job 에 이르기까지 이미 쓴 재시도 횟수 (`MAX_CHAT_RETRY_COUNT` 와 같은 단위).
   * 저장하지 않으면 화면을 나갔다 오는 것만으로 재시도 예산이 되살아난다.
   */
  retryCount: z.number().int().min(0),
});
export type PendingChatJob = z.infer<typeof PendingChatJobSchema>;

/** 기다리는 job. 없거나 읽을 수 없거나 모양이 다르면 `null` 이다. */
export function readPendingChatJob(): PendingChatJob | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }

  if (raw === null) {
    return null;
  }

  try {
    const parsed = PendingChatJobSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    // JSON 이 아니다. 남겨 두면 매 진입마다 같은 실패를 반복하므로 지운다.
    clearPendingChatJob();
    return null;
  }
}

/** job 이 접수됐다(202). 실패해도 화면은 그대로 진행한다 — 이 화면에서는 복원된다. */
export function storePendingChatJob(job: PendingChatJob): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(job));
  } catch {
    // 기억하지 못하면 이 화면을 떠난 순간 답을 잃는다. 그래도 지금 진행 중인
    // 대화를 멈출 이유는 아니라 조용히 넘어간다.
  }
}

/** job 이 끝났거나(완료·실패) 대화를 초기화했다. */
export function clearPendingChatJob(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 지우지 못해도 실패로 다루지 않는다.
  }
}
