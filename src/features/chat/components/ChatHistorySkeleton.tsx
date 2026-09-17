import { Skeleton } from '@/shared/ui/Skeleton';

/**
 * 저장된 대화 이력을 불러오는 동안의 자리표시자 (FINCH-323).
 *
 * **저장된 대화가 있을 때만 뜬다.** `ChatPage` 가 `historySettled` 로 뜨는 시점을
 * 정한다 — 저장된 대화가 없으면(`storedConversationId === null`) 조회 자체가
 * 없어 이 컴포넌트를 거치지 않고 곧장 빈 상태로 떨어진다.
 *
 * 말풍선처럼 보이도록 사용자 자리는 오른쪽, 답변 자리는 왼쪽에 둔다(`ChatBubble`
 * 의 `flex justify-end`·`items-start` 와 같은 정렬). 셋만 두고 화면을 꽉 채우지
 * 않는다 — 이력이 한두 줄뿐인 대화에도 뜨는 자리표시자라 과하게 채우면 실제
 * 내용보다 커 보인다. 모양은 `Skeleton`(`shared/ui/Skeleton`)이 이미 정한 반경을
 * 그대로 쓰고 여기서 덮어쓰지 않는다.
 */
export function ChatHistorySkeleton() {
  return (
    <div className="mt-4 flex flex-col gap-4" aria-hidden="true">
      <div className="flex justify-end">
        <Skeleton className="h-9 w-2/5" />
      </div>
      <div className="flex justify-start">
        <Skeleton className="h-16 w-3/5" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-9 w-1/3" />
      </div>
    </div>
  );
}
