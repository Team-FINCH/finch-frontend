/**
 * 채팅 대화 id 를 화면 밖에 저장하는 자리 (FINCH-278, task-I).
 *
 * `ChatPage` 의 `conversationId` 는 지금까지 `useState` 로만 있어서 화면을
 * 나가면(컴포넌트 언마운트) 사라졌다. `localStorage` 로 빼서 다시 들어왔을 때
 * 이 값으로 이력을 복원한다(`features/chat/api/useChatHistoryQuery`).
 *
 * **`features/chat` 가 아니라 `shared/lib` 에 둔다.** 지우는 자리인
 * `features/auth/api/useLogout.ts` 가 이 값을 함께 써야 하는데, feature 끼리는
 * 서로 import 할 수 없다(`frontConvention.md` §2, `eslint.config.js`
 * `crossFeatureZones`) — `chat` 과 `auth` 둘 다 shared 는 참조할 수 있어 여기로
 * 올렸다.
 *
 * **만료를 두지 않는다** (2026-09-15 사용자 결정). 시연 기간이 짧고, 오래된
 * 대화를 복원하는 것이 사용자에게 손해가 아니다. 지우는 자리는 로그아웃
 * (`useLogout.ts`) 하나와, 복원했더니 이력이 비어 있던 대화 id 를 정리하는
 * 자리(`ChatPage`) 둘뿐이다.
 *
 * **읽기·쓰기가 실패해도 화면이 죽지 않게 전부 try/catch 로 감싼다.** 사파리
 * 프라이빗 모드 등에서 `localStorage` 접근 자체가 예외를 던진다 — 실패하면
 * "저장된 대화가 없다"와 같게 다룬다. `onboardingDone.ts`·`updateNoticeSeen.ts`
 * 와 같은 패턴이다.
 */
const STORAGE_KEY = 'finch.chat.conversationId';

/** 저장된 대화 id. 없거나 읽을 수 없으면 `null` — "저장된 대화가 없다"와 같게 다룬다. */
export function getStoredConversationId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** 새 응답이 발급한 `conversationId` 를 저장한다. 실패해도 화면은 그대로 진행한다. */
export function storeConversationId(conversationId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, conversationId);
  } catch {
    // 기억하지 못해도 화면은 그대로 진행한다. 다음 진입이 빈 상태로 시작할 뿐이다.
  }
}

/** 로그아웃 때, 그리고 복원해 보니 이력이 비어 있던 대화 id 를 지울 때 쓴다. */
export function clearStoredConversationId(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 지우지 못해도 실패로 다루지 않는다.
  }
}
