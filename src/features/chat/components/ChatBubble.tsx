import { useTypewriter } from '@/features/chat/hooks/useTypewriter';
import { type ChatMessage } from '@/features/chat/model/chatMessages';
import { AiCitationList } from '@/shared/ui/AiCitationList';
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
 * ## 타자 효과 (FINCH-274, task-F · FINCH-278, task-I)
 *
 * `assistant` 말풍선은 `useTypewriter` 로 `section.text` 를 앞에서부터 드러낸다.
 * **응답을 이미 다 받은 뒤의 화면 연출이다 — 스트리밍이 아니다.**
 *
 * **"이번 턴에 방금 받은 것"만 타자한다는 판정은 메시지 모델의 `restored` 신호로
 * 한다.** `useTypewriter` 의 두 번째 인자(`enabled`)가 `message.role === 'assistant'
 * && !message.restored` 다 — `restored` 가 참이면 타자를 아예 걸지 않고 전문이
 * 바로 보인다.
 *
 * **전에는 이 판정이 "말풍선이 처음 마운트되는 시점"이었다.** 그 근거는 "복원
 * 경로가 없으니 마운트 = 이번 턴 도착"(task-F, MR `!274`)이었는데, **이 티켓
 * (FINCH-278)이 대화 복원을 들여오면서 그 전제가 깨졌다.** `!274` 본문이
 * 미리 적어 둔 대로 "복원된 메시지에 '이미 다 찍힘' 신호를 실어 모델 쪽으로
 * 옮겨야 한다"를 지금 한 것이다 — `features/chat/model/chatMessages.ts` 의
 * `toRestoredMessage` 가 그 신호(`restored: true`)를 만든다.
 *
 * `isDone` 이 되기 전에는 근거 목록·`disclaimer`·`AiFeedbackRow` 를 내지 않는다.
 * 뉴스 원인을 설명하면서 출처를 숨기면 관측 수치와 확인된 사건을 구별할 수 없으므로,
 * 이번 턴 응답 envelope 의 `citations` 를 공용 `AiCitationList` 로 그대로 보여 준다.
 * 복원된 이력에는 envelope 가 없어 `citations`와 `disclaimer`가 비어 있으므로 해당
 * 영역만 생략한다.
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
    message.role === 'assistant' && !message.restored,
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
        <p className="text-body-2 text-pretty whitespace-pre-line text-ai-text-primary">
          {visibleText}
        </p>
        {isDone && (
          <>
            <AiCitationList
              citations={message.citations}
              title="참고 뉴스 및 자료"
              showPublisher
              className="mt-4 border-t border-ai-text-muted/20 pt-3 [&_a]:text-ai-text-primary [&_h3]:text-ai-text-muted [&_span]:text-ai-text-muted"
            />
            {message.disclaimer !== null && (
              <p className="mt-3 text-caption text-ai-text-muted">
                {message.disclaimer}
              </p>
            )}
          </>
        )}
      </div>
      {isDone && message.requestId !== null && (
        <AiFeedbackRow
          requestId={message.requestId}
          className="mt-2 self-stretch"
        />
      )}
    </div>
  );
}
