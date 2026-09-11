import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useChatMutation } from '@/features/chat/api/useChatMutation';
import { ChatBubble } from '@/features/chat/components/ChatBubble';
import { ChatComposer } from '@/features/chat/components/ChatComposer';
import { parseChatContext } from '@/features/chat/lib/parseChatContext';
import {
  createMessageId,
  type ChatMessage,
} from '@/features/chat/model/chatMessages';
import { isHttpError } from '@/shared/api';
import { useRegisterBottomFixedSpace } from '@/shared/hooks/useBottomFixedSpace';
import { showToast } from '@/shared/hooks/useToastStore';
import { isRetryableAiErrorCode } from '@/shared/lib/aiErrorRetry';
import { PageMain } from '@/shared/ui/PageMain';

/**
 * AI 채팅 — 내 포트폴리오에 대해 묻고 답 받기. 화면 맥락(`screen`·`ticker`)을 실어
 * 보내는 진입도 이 라우트로 연다 (`ia.md` §2 "채팅은 `/chat` 전용 화면만이 아니다").
 *
 * 티켓: FINCH-139. (`ia.md` 2026-09-05판은 "미발행 (0-14 와이어프레임에 포함)"
 * 으로 적혀 있다 — 이 값은 이후 발행된 Jira 티켓이다.)
 *
 * 근거: `ia.md` §1 "AI" 표.
 * API: `POST /api/v1/ai/chat`. **단발 요청/응답이다 — SSE 는 폐기됐다**(커밋 `34ed34a`).
 *
 * **답변 말풍선마다 `requestId` 가 다르고 말풍선마다 피드백 버튼이 붙는다**
 * (design.md §7.15·§9, 이슈 #26 5번). `context.screen` 은 첫 메시지에만 실어
 * 보낸다 — 대화가 시작된 뒤(`conversationId` 발급 후)에는 서버가 맥락을 이어가므로
 * 매 메시지마다 다시 보내지 않는다.
 */
export function ChatPage() {
  const [searchParams] = useSearchParams();
  const chatContext = parseChatContext(searchParams);

  // 입력창 바가 토스트 자리를 정한다 — 이 화면은 `ActionBar` 를 쓰지 않고 같은
  // 모양의 바를 직접 그려서, 등록도 여기서 한다 (FINCH-232).
  // 입력창은 글이 길어지면 높이가 자라고 `ResizeObserver` 가 그때마다 다시 잰다.
  const bottomFixedRef = useRegisterBottomFixedSpace();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const chatMutation = useChatMutation();

  function resetConversation() {
    setMessages([]);
    setConversationId(null);
    // 말풍선이 사라지는 것만으로는 초기화가 된 것인지 화면이 비어 버린 것인지
    // 구분되지 않는다. 서버를 부르지 않는 로컬 초기화라 성공 콜백이 따로 없다.
    showToast('대화를 초기화했어요.');
  }

  function handleSend(text: string) {
    setMessages((prev) => [
      ...prev,
      { id: createMessageId(), role: 'user', text },
    ]);

    chatMutation.mutate(
      {
        conversationId,
        message: text,
        context:
          conversationId === null
            ? { screen: chatContext.screen, ticker: chatContext.ticker }
            : undefined,
      },
      {
        onSuccess: (data) => {
          setConversationId(data.content.conversationId);
          setMessages((prev) => [
            ...prev,
            {
              id: createMessageId(),
              role: 'assistant',
              requestId: data.requestId,
              section: data.content.answer,
              disclaimer: data.disclaimer,
            },
          ]);
        },
        onError: (error) => {
          const code = isHttpError(error) ? error.code : null;
          // 네트워크 실패·응답 스키마 불일치(code 없음)는 재시도가 유의미하다.
          // 알려진 코드는 도메인 판정(`isRetryableAiErrorCode`)을 따른다.
          const retryable = code === null ? true : isRetryableAiErrorCode(code);
          setMessages((prev) => [
            ...prev,
            {
              id: createMessageId(),
              role: 'assistant-error',
              message: isHttpError(error)
                ? error.message
                : '메시지를 보내지 못했어요.',
              retryable,
              retryText: text,
            },
          ]);
        },
      },
    );
  }

  const emptyCopy =
    chatContext.screen === 'stock_detail' && chatContext.ticker !== null
      ? '이 종목을 보다가 들어오셨네요. 궁금한 것부터 물어보세요.'
      : '내 투자 맥락을 아는 Finch AI와 이야기해보세요.';

  return (
    <PageMain className="flex min-h-[calc(100dvh-3rem)] flex-col pt-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-title-3 text-text-primary">AI 채팅</h1>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={resetConversation}
            className="text-caption text-text-secondary underline"
          >
            새 대화 시작
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-1 flex-col gap-4">
        {messages.length === 0 ? (
          <p className="mt-10 text-center text-body-2 text-pretty text-text-secondary">
            {emptyCopy}
          </p>
        ) : (
          messages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message}
              onRetry={handleSend}
            />
          ))
        )}
      </div>

      <div
        ref={bottomFixedRef}
        className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-border bg-surface px-6.5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      >
        <ChatComposer disabled={chatMutation.isPending} onSend={handleSend} />
      </div>
    </PageMain>
  );
}
