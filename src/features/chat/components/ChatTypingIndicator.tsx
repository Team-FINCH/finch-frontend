import { useEffect, useState } from 'react';

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
 * 점 세 개는 타이머로 상태를 바꾸는 것이 아니라 CSS 애니메이션이 계속 도는 것뿐이라,
 * `usePrefersReducedMotion` 훅 없이 Tailwind `motion-reduce:animate-none` 으로 끈다
 * — 이 저장소의 관용(`usePrefersReducedMotion` 주석, `RollingNumber`·`TabBar` 동일)을
 * 그대로 따른다. 꺼지면 점 세 개가 제자리에 멈춘 정적 표시로 떨어진다(연출만 빠지고
 * "답을 기다린다"는 사실 자체는 그대로 보인다).
 *
 * 기본 `animate-bounce` 는 액션이 너무 작다는 지적(FINCH-277)을 받아 자체
 * 키프레임 `chat-typing-bounce` 로 바꿨다 — 이동 폭·불투명도 근거는
 * `styles/index.css` 주석에 있다.
 *
 * **주기 900ms·지연 180ms(FINCH-283).** 277 이 잡은 600ms·150ms 는 배포
 * 화면에서 "방정맞다"는 지적을 받았다 — 6px 이동에 600ms 는 눈에는 띄지만 여유가
 * 없어 조급해 보였다. 900ms 로 늦추고, 점 사이 지연은 여전히 주기의 1/5(180ms)로
 * 세 점의 정점이 고르게 갈리게 했다(주기가 바뀌면 지연도 같이 바뀌어야 물결이
 * 유지된다 — 277 코멘트가 이미 남긴 교훈).
 *
 * ## 10초 뒤 보조 문구 (FINCH-283)
 *
 * 점 세 개만으로는 멈춘 것인지 일하는 중인지 구분이 안 된다. 10초가 지나면
 * `SLOW_RESPONSE_HINT` 문구가 점 아래에 나타난다. **시간을 약속하지 않는다** —
 * "조금만 기다려 주세요"처럼 곧 끝난다는 인상을 주면 실제로 30초 가까이 걸릴 때
 * 더 나쁘다.
 *
 * **`sr-only` 문구를 따로 두지 않는다.** 이 자리는 `role="status"` 라 스크린
 * 리더가 텍스트가 바뀌는 순간을 읽는다 — 처음엔 `sr-only` 로 숨겨 뒀다가 10초
 * 뒤 같은 노드의 텍스트를 보이는 문구로 바꿔치기하면, 그 변경 자체가 한 번만
 * 읽힌다. 두 문구를 각자 다른 노드에 두면(하나는 항상 `sr-only`, 하나는 10초
 * 뒤에만 보임) 스크린 리더가 둘을 겹쳐 읽어 중복된다.
 *
 * ## 등장 연출 (FINCH-332)
 *
 * 마운트되는 순간 완성된 크기로 바로 뜨는 것이 "번쩍" 으로 보인다는 지적을 받았다
 * (배포 화면, 2026-09-19). `chat-typing-in` 키프레임(`styles/index.css`)으로
 * 페이드 + 6px 떠오르기를 붙였다 — 값은 `wiki-guess-in` 모양·`--motion-sheet`
 * (260ms)·`--ease-standard` 를 그대로 가져온 것이라 새 관용이 아니다.
 * 점 세 개(`chat-typing-bounce`)와 마찬가지로 `motion-reduce:animate-none` 으로
 * 끈다 — 꺼지면 등장 없이 바로 자리에 나타날 뿐, "대기 중" 이라는 사실은
 * 그대로 보인다.
 */
const SLOW_RESPONSE_HINT_DELAY_MS = 10_000;
const READY_MESSAGE = 'AI가 답변을 준비하고 있어요';
const SLOW_RESPONSE_HINT = '답을 만들고 있어요';

export function ChatTypingIndicator() {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setIsSlow(true);
    }, SLOW_RESPONSE_HINT_DELAY_MS);
    return () => window.clearTimeout(timerId);
  }, []);

  return (
    <div className="flex flex-col items-start">
      <div
        className="flex animate-[chat-typing-in_var(--motion-sheet)_var(--ease-standard)] flex-col gap-1.5 rounded-[6px_18px_18px_18px] bg-ai-surface px-4 py-3.5 motion-reduce:animate-none"
        role="status"
      >
        <span aria-hidden="true" className="flex items-center gap-1.5">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="size-1.5 animate-[chat-typing-bounce_900ms_ease-in-out_infinite] rounded-full bg-ai-text-muted motion-reduce:animate-none"
              style={{ animationDelay: `${String(index * 180)}ms` }}
            />
          ))}
        </span>
        {/*
          isSlow 가 false 인 동안은 sr-only 라 화면에는 안 보이면서도 첫 마운트
          안내(READY_MESSAGE)를 스크린 리더에 실어 둔다. 10초가 지나면 같은
          노드의 텍스트와 클래스가 함께 바뀌어 보이는 문구가 된다 — 위 헤더
          코멘트가 설명하는 "노드 하나" 설계.
        */}
        <span
          className={isSlow ? 'text-caption text-ai-text-muted' : 'sr-only'}
        >
          {isSlow ? SLOW_RESPONSE_HINT : READY_MESSAGE}
        </span>
      </div>
    </div>
  );
}
