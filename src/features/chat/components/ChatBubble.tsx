import { useTypewriter } from '@/features/chat/hooks/useTypewriter';
import { type ChatMessage } from '@/features/chat/model/chatMessages';
import { AiFeedbackRow } from '@/shared/ui/AiFeedbackRow';

/**
 * 말풍선 하나.
 *
 * **`segments` 를 순회해 색칠하지 않는다.** `section.text` 만 출력해도 정상 동작하는
 * 기본 렌더링 경로다(`shared/types/ai/envelope.ts` `AiSectionSchema` 주석). 등락
 * 적색·청색은 등락 표시(가격·수익률) 밖에서 쓰지 않으므로 포트폴리오 비중 같은
 * 일반 수치까지 색칠하면 안 된다.
 *
 * 꼬리 모서리 6px 는 프로토타입 실측값이다(`styles/index.css` `--radius-xs` 주석 —
 * "AI 챗 버블도 왼쪽 위 꼬리 모서리에 6px 을 쓴다"). 사용자 말풍선은 좌우를 뒤집어
 * 오른쪽 꼬리로 맞춘다.
 *
 * 피드백은 `shared/ui/AiFeedbackRow` 하나를 쓴다 — design.md §9 "슬롯 3곳(종목 상세
 * AI 탭 · 채팅 · 수익률 분석)이 같은 시트를 쓴다". 채팅은 답변 말풍선마다 `requestId`
 * 가 다르므로 말풍선마다 슬롯이 하나씩 붙는다(`requestId` 하나 = 슬롯 하나). 한 번
 * 평가하면 잠기는 것도 3곳 동일이다 — contracts C66 의 "재전송은 열어 둘 수 있되" 는
 * 허용이지 의무가 아니고, 프로토타입 `fbOf` 도 채팅 말풍선을 `idle → sent` 한 방향으로만
 * 옮긴다. 배치는 말풍선 **밖** 아래다. 프로토타입은 말풍선 안(검정 면)에 두지만 shared
 * 판의 색이 검정 면용이 아니라 안에 넣으면 대비가 깨진다 — 대조표 3차 판정 뒤 별건.
 *
 * ## 타자 효과 (FINCH-274, task-F)
 *
 * `assistant` 말풍선은 `useTypewriter` 로 `section.text` 를 앞에서부터 드러낸다.
 * **응답을 이미 다 받은 뒤의 화면 연출이다 — 스트리밍이 아니다.**
 *
 * **"이번 턴에 방금 받은 것"만 타자한다는 판정을 메시지 모델이 아니라 마운트
 * 시점으로 삼는다.** `ChatPage` 의 `messages` 는 세션 메모리에만 있고 리하이드레이션
 * 경로가 없다 — 화면을 나가면(컴포넌트 언마운트) 배열째 사라지고, 새로 들어오면
 * 늘 빈 배열로 시작한다. 그래서 이 배열에 실리는 `assistant` 메시지는 **항상**
 * 그 세션에서 방금 받은 응답이고, "말풍선이 처음 마운트되는 순간"과 "이번 턴에
 * 도착한 순간"이 항상 같다. 메시지 모델에 `justArrived` 같은 플래그를 둘 수도
 * 있었지만, 지금 그 값을 다르게 만들 경로가 하나도 없어 늘 참인 필드는 코드만
 * 늘리고 검증할 분기를 만들지 못한다. **나중에 대화 복원(새로고침 유지·서버
 * 히스토리 등)이 생기면 그때 복원된 메시지에 "이미 다 찍힘" 신호를 실어야 한다** —
 * 이 마운트-기준 판정은 그 전제(리하이드레이션 없음)가 깨지면 함께 재검토한다.
 *
 * `isDone` 이 되기 전에는 `disclaimer` 줄과 `AiFeedbackRow` 를 내지 않는다
 * (task-F 완료 판정 "근거·피드백 행은 타자가 끝난 뒤"). **"근거 목록"(citations)
 * 자체는 이 말풍선에 렌더링 자리가 없다** — `AiCitationList` 는 종목 상세·포트폴리오
 * 탭에만 쓰이고 채팅에는 애초에 붙어 있지 않았다. 그래서 여기서 타자 뒤로 미루는
 * 것은 실제로 존재하는 두 요소(`disclaimer`, `AiFeedbackRow`)뿐이다 — 근거 목록을
 * 새로 붙이는 것은 이 티켓 범위(타이핑 표시·타자 효과) 밖이라 하지 않았다.
 */
type ChatBubbleProps = {
  message: ChatMessage;
  /**
   * `assistant-error` 이고 `retryable` 일 때만 쓰인다.
   *
   * **없으면 버튼을 내지 않는다.** 실패 말풍선이 저마다 `다시 시도` 를 들고 있으면
   * 이미 다시 보낸 질문 위에 버튼이 남아 누를 때마다 같은 질문이 쌓인다. 그래서
   * 버튼을 어느 말풍선에 둘지는 대화 전체를 보는 `ChatPage` 가 정하고
   * (`findRetryTargetId`), 여기서는 받은 대로 그린다 (FINCH-249).
   */
  onRetry?: (text: string) => void;
  /**
   * 답변을 기다리는 중인가 (`chatMutation.isPending`). **`다시 시도` 를 잠그는
   * 값이다** — 입력창(`ChatComposer` 의 `disabled`)과 같은 기준을 쓴다.
   *
   * 실제로 요청을 막는 것은 이 prop 이 아니라 `ChatPage` 의 `handleSend` 재진입
   * 가드다. 여기서는 **왜 눌러도 아무 일이 없는지를 보여 준다** — 막기만 하고
   * 모양이 그대로면 버튼이 고장 난 것으로 읽힌다.
   */
  retryDisabled?: boolean;
};

export function ChatBubble({
  message,
  onRetry,
  retryDisabled = false,
}: ChatBubbleProps) {
  // 훅은 분기·조기 반환보다 앞에 둔다 (React 훅 규칙). `assistant` 가 아닌
  // 말풍선에는 빈 문자열을 주고 꺼 둔다 — 그 갈래에서는 결과를 쓰지 않는다.
  const { visibleText, isDone } = useTypewriter(
    message.role === 'assistant' ? message.section.text : '',
    message.role === 'assistant',
  );

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[80%] rounded-[18px_6px_18px_18px] bg-primary-soft px-4 py-3 text-body-2 text-pretty text-text-primary">
          {message.text}
        </p>
      </div>
    );
  }

  if (message.role === 'assistant-error') {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="max-w-[80%] rounded-[6px_18px_18px_18px] border border-border-strong bg-surface px-4 py-3 text-body-2 text-pretty text-text-secondary">
          {message.message}
        </p>
        {message.retryable && onRetry !== undefined && (
          <button
            type="button"
            onClick={() => onRetry(message.retryText)}
            disabled={retryDisabled}
            className="h-9 min-w-18 rounded-sm border border-border-strong px-3.5 text-caption text-text-primary disabled:border-transparent disabled:bg-disabled-surface disabled:text-disabled-text"
          >
            다시 시도
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start">
      <div className="max-w-[80%] rounded-[6px_18px_18px_18px] bg-ai-surface px-4 py-3">
        <p className="text-body-2 text-pretty text-ai-text-primary">
          {visibleText}
        </p>
        {isDone && (
          <p className="mt-2 text-caption text-ai-text-muted">
            {message.disclaimer}
          </p>
        )}
      </div>
      {isDone && (
        <AiFeedbackRow
          requestId={message.requestId}
          className="mt-2 self-stretch"
        />
      )}
    </div>
  );
}
