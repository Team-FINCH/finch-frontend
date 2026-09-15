/**
 * 답을 기다리는 동안 AI 말풍선 자리에 뜨는 점 세 개 (FINCH-274, task-F).
 *
 * **더하는 것이지 대체하는 것이 아니다.** 이 화면은 지금까지 대기 중임을 보여줄
 * 방법이 입력창을 잠그는 것(`disabled`) 하나뿐이었다 — `ChatBubble` 에는 로딩
 * 자리 자체가 없었다. 그래서 이 컴포넌트는 기존 스켈레톤을 걷어내는 것이 아니라
 * 없던 자리를 새로 만든다.
 *
 * `ChatPage` 가 `chatMutation.isPending` 하나로 렌더 여부를 정한다. 요청이
 * 실패하면 `isPending` 이 꺼지면서 이 컴포넌트가 사라지고, 곧바로 기존
 * 실패 말풍선·다시 시도 경로(`assistant-error`, 티켓 248·249)로 이어진다 —
 * 이 컴포넌트 자신은 성공·실패를 구분하지 않는다.
 *
 * 점 세 개는 타이머로 상태를 바꾸는 것이 아니라 CSS 애니메이션(`animate-bounce`)
 * 이 계속 도는 것뿐이라, `usePrefersReducedMotion` 훅 없이 Tailwind
 * `motion-reduce:animate-none` 으로 끈다 — 이 저장소의 관용
 * (`usePrefersReducedMotion` 주석, `RollingNumber`·`TabBar` 동일)을 그대로 따른다.
 * 꺼지면 점 세 개가 제자리에 멈춘 정적 표시로 떨어진다(연출만 빠지고 "답을
 * 기다린다"는 사실 자체는 그대로 보인다).
 */
export function ChatTypingIndicator() {
  return (
    <div className="flex flex-col items-start">
      <div
        className="flex items-center gap-1.5 rounded-[6px_18px_18px_18px] bg-ai-surface px-4 py-3.5"
        role="status"
      >
        <span className="sr-only">AI가 답변을 준비하고 있어요</span>
        <span aria-hidden="true" className="flex items-center gap-1.5">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="size-1.5 animate-bounce rounded-full bg-ai-text-muted motion-reduce:animate-none"
              style={{ animationDelay: `${String(index * 120)}ms` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
