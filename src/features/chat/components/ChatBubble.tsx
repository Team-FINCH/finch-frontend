import { ChatFeedbackButtons } from '@/features/chat/components/ChatFeedbackButtons';
import { type ChatMessage } from '@/features/chat/model/chatMessages';

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
 */
type ChatBubbleProps = {
  message: ChatMessage;
  /** `assistant-error` 이고 `retryable` 일 때만 쓰인다. */
  onRetry?: (text: string) => void;
};

export function ChatBubble({ message, onRetry }: ChatBubbleProps) {
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
            className="h-9 min-w-18 rounded-sm border border-border-strong px-3.5 text-caption text-text-primary"
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
          {message.section.text}
        </p>
        <p className="mt-2 text-caption text-ai-text-muted">
          {message.disclaimer}
        </p>
      </div>
      <ChatFeedbackButtons requestId={message.requestId} />
    </div>
  );
}
