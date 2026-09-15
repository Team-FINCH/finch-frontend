import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useChatHistoryQuery } from '@/features/chat/api/useChatHistoryQuery';
import { useChatMutation } from '@/features/chat/api/useChatMutation';
import { ChatBubble } from '@/features/chat/components/ChatBubble';
import { ChatComposer } from '@/features/chat/components/ChatComposer';
import { ChatEmptyState } from '@/features/chat/components/ChatEmptyState';
import { ChatTypingIndicator } from '@/features/chat/components/ChatTypingIndicator';
import { chatEmptyCopy } from '@/features/chat/lib/chatEmptyCopy';
import { parseChatContext } from '@/features/chat/lib/parseChatContext';
import {
  createMessageId,
  findRetryTargetId,
  toRestoredMessage,
  type ChatMessage,
} from '@/features/chat/model/chatMessages';
import { isHttpError } from '@/shared/api';
import { useRegisterBottomFixedSpace } from '@/shared/hooks/useBottomFixedSpace';
import { showToast } from '@/shared/hooks/useToastStore';
import { isRetryableAiErrorCode } from '@/shared/lib/aiErrorRetry';
import {
  clearStoredConversationId,
  getStoredConversationId,
  storeConversationId,
} from '@/shared/lib/chatConversationId';
import { PageMain } from '@/shared/ui/PageMain';
import { SubPageHeader } from '@/shared/ui/SubPageHeader';

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
 *
 * ## 상단 (FINCH-245)
 *
 * 프로토타입 `isChat` 의 `.nav` 는 뒤로가기 + 제목 `FINCH AI` 고, 메시지가 있으면
 * 오른쪽에 `초기화` 가 붙는다. 전에는 제목을 `AI 채팅` `h1` 으로 두고 뒤로가기가
 * 없어서, 탭 바에 없는 화면인데 나갈 길이 없었다. `shared/ui/SubPageHeader` 로
 * 바꿨고 뒤로가기 동작은 그 컴포넌트 기본값(히스토리 하나 되돌리기, 스택이 비면
 * 홈)이다 — 프로토타입 `closeChat` 이 스택을 하나 pop 하는 것과 같다.
 *
 * 제목이 `Finch AI` 가 아니라 `FINCH AI` 인 이유 — 프로토타입 `.navt` 와 빈 상태
 * 헤드라인이 둘 다 대문자고, 로그인 히어로(`features/auth`)도 대문자를 쓴다.
 * design.md §7.15 의 초기 카피만 `Finch AI` 였는데 2026-09-11 에 대문자로 맞췄다
 * (사용자 확인, FINCH-248).
 *
 * ## 종목 맥락의 종목명 (FINCH-248)
 *
 * 빈 상태의 맥락 문구와 추천 질문은 **종목명**을 쓰는데 쿼리의 `ticker` 는 6자리
 * 코드다. 이름은 **진입하는 쪽이 `stockName` 으로 함께 싣는다** — 이 화면에서
 * `GET /stocks/{stockCode}` 를 불러 구할 수 없어서다. 그 호출 자체가 최근 본 종목
 * 기록이라(contracts C51) 사용자가 보지도 않은 조회가 기록에 남고 최근 본 종목
 * 목록까지 무효화된다.
 *
 * 전에는 `useCachedStockName` 이 이미 받아 둔 상세 캐시에서 이름만 꺼냈다. **그 훅은
 * 지웠다.** 이제 모든 진입이 이름을 싣고, 남는 경우는 `/chat?screen=stock_detail&
 * ticker=…` 를 주소로 바로 여는 것 하나뿐인데 그때는 새로 뜬 앱이라 캐시가 비어 있어
 * 훅이 어차피 `null` 을 돌려준다. 성공할 수 없는 캐시 조회를 남겨 두면, 나중에
 * 이름 없이 보내는 진입이 생겼을 때 **캐시가 더울 때만 이름이 나오고 식으면 안 나오는**
 * 화면이 된다 — 그때는 늘 `이 종목` 으로 떨어지는 편이 고장을 빨리 드러낸다.
 *
 * ## 대화 복원 (FINCH-278)
 *
 * `messages`·`conversationId` 는 여전히 `useState` 다 — 화면 메모리에만 있고
 * 화면을 나가면 사라진다. 대신 `conversationId` **하나만** `localStorage` 에도
 * 남겨(`shared/lib/chatConversationId`), 다시 들어올 때 그 id 로
 * `GET /ai/chat/conversations/{id}/messages`(AI 명세 §4.1)를 불러 배열을 채운다
 * (`useChatHistoryQuery`). 대화 전체를 스토리지에 그대로 두지 않는 이유는 —
 * id 만 있으면 서버가 언제든 같은 배열을 다시 만들어 주고, 두 군데(로컬·서버)에
 * 같은 내용을 들고 있으면 둘이 어긋났을 때 어느 쪽이 맞는지 다투게 된다.
 *
 * 복원은 `appliedHistoryData` 참조 비교로 한 번만 반영한다 — 세션 안에서 이미
 * 대화가 쌓인 뒤에 이력 조회가 다시 실행되면(쿼리 재요청 등) 그 결과로 화면을
 * 덮어쓰지 않기 위해서다.
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

  /**
   * 대화 이력 복원 (FINCH-278, task-I). `localStorage` 읽기는 동기라
   * `useState` 초기값으로 한 번만 계산한다 — 매 렌더 다시 읽을 이유가 없다.
   * `useChatHistoryQuery` 는 이 값이 `null` 이면 아예 호출하지 않는다.
   */
  const [storedConversationId] = useState(() => getStoredConversationId());
  const historyQuery = useChatHistoryQuery(storedConversationId);

  /**
   * 이력을 **렌더 중에** 반영한다. `useEffect` 로 하면 `historyQuery.data` 가
   * 도착한 렌더에서 `setConversationId`·`setMessages` 를 동기로 부르는 모양이
   * 되어 `react-hooks/set-state-in-effect` 가 막는다(`ThesisRecordSheet.tsx` 의
   * `wasOpen` 과 같은, "리액트가 권하는 prop 변화 대응" 패턴 — react.dev "You
   * Might Not Need an Effect").
   *
   * `appliedHistoryData` 가 "지금까지 반영한 데이터"를 들고 있다가 `historyQuery.data`
   * 참조가 그것과 달라진 순간(=새 데이터가 도착한 순간) 딱 한 번만 반영한다 —
   * 매 렌더 반영하면 그사이 쌓인 이번 세션의 대화를 덮어쓴다.
   */
  const [appliedHistoryData, setAppliedHistoryData] =
    useState<typeof historyQuery.data>(undefined);

  if (
    historyQuery.data !== undefined &&
    historyQuery.data !== appliedHistoryData
  ) {
    setAppliedHistoryData(historyQuery.data);
    if (historyQuery.data.messages.length > 0) {
      setConversationId(historyQuery.data.conversationId);
      setMessages(historyQuery.data.messages.map(toRestoredMessage));
    }
    // 조회 실패는 여기서 다루지 않는다 — `messages` 초기값이 이미 빈 배열이라
    // "불러오기 실패는 빈 상태로 떨어뜨린다"가 아무 것도 안 하는 것으로 충족된다.
  }

  /**
   * `localStorage` 를 지우는 것은 부수효과라 렌더 중에 부르지 않는다
   * (`features/auth/lib/oauthState.ts` 의 읽기·지우기 분리와 같은 규칙). 위
   * 렌더 중 분기와 같은 조건을 다시 보되, `setState` 가 없어 `react-hooks/
   * set-state-in-effect` 에 걸리지 않는다.
   */
  useEffect(() => {
    if (historyQuery.data?.messages.length === 0) {
      // 저장된 id 가 가리키는 대화에 메시지가 없다. 매번 빈 조회를 반복하지
      // 않게 지운다 — 이 id 로 화면이 얻을 수 있는 것이 앞으로도 없다(정하고
      // 근거를 남긴다, task-I 완료 판정).
      clearStoredConversationId();
    }
  }, [historyQuery.data]);

  // 종목 맥락으로 들어왔으면 빈 상태 문구에 종목명이 들어간다. 쿼리에 이름이 없으면
  // (주소로 바로 열었을 때) `이 종목` 으로 떨어진다 — 위 머리 주석 참고.
  const emptyCopy = chatEmptyCopy(
    chatContext.ticker === null ? null : (chatContext.stockName ?? '이 종목'),
  );

  // 실패 말풍선이 여럿이어도 `다시 시도` 는 하나다 (FINCH-249).
  const retryTargetId = findRetryTargetId(messages);

  function resetConversation() {
    setMessages([]);
    setConversationId(null);
    // 저장된 id 도 함께 지운다. 지우지 않으면 초기화 뒤 새 메시지를 보내기 전에
    // 화면을 나갔다 돌아왔을 때 복원 경로가 방금 초기화한 대화를 도로 그린다.
    clearStoredConversationId();
    // 말풍선이 사라지는 것만으로는 초기화가 된 것인지 화면이 비어 버린 것인지
    // 구분되지 않는다. 서버를 부르지 않는 로컬 초기화라 성공 콜백이 따로 없다.
    showToast('대화를 초기화했어요.');
  }

  /**
   * **보내는 자리는 셋인데 가드는 여기 하나다** (FINCH-248). 입력창
   * (`ChatComposer`) · 빈 상태의 추천 질문(`ChatEmptyState`) · 실패 말풍선의
   * `다시 시도`(`ChatBubble`) 가 전부 이 함수를 부른다.
   *
   * 전에는 입력창만 막혀 있었다(`disabled={chatMutation.isPending}`). `다시 시도`
   * 는 눌러도 말풍선이 그대로 남아 있어서 연타하면 그만큼 요청이 나갔고, 그만큼
   * AI 크레딧을 썼다.
   *
   * **버튼마다 막지 않고 여기서 막는 이유** — 호출부가 늘 때마다 같은 판정을 다시
   * 적어야 하고, 하나 빠뜨리면 그 경로에서만 조용히 다시 샌다. 추천 질문이 지금
   * 새지 않는 것도 설계가 아니라 우연이다(빈 상태는 첫 메시지를 넣는 순간
   * 사라진다). 우연에 기대는 자리를 규칙으로 바꾼다.
   *
   * 기준은 입력창과 같은 `chatMutation.isPending` 이다. `다시 시도` 버튼도 이 값을
   * 받아 함께 잠긴다 — 막기만 하고 모양이 그대로면 버튼이 고장 난 것으로 읽힌다.
   *
   * **이 가드만으로는 부족하다** (FINCH-249). 여기서 막는 것은 답을 기다리는
   * 동안의 중복이고, 지나간 실패 말풍선이 저마다 들고 있던 버튼은 막지 못한다.
   * 그쪽은 `findRetryTargetId` 가 버튼 자체를 하나로 줄여서 막는다. 둘은 서로 다른
   * 것을 막으므로 함께 있어야 한다.
   */
  function handleSend(text: string) {
    if (chatMutation.isPending) {
      return;
    }

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
          // 다음 진입에서 이 대화를 복원할 수 있게 화면 밖에도 남긴다
          // (FINCH-278). 실패해도(스토리지 접근 불가) 화면은 그대로 진행한다.
          storeConversationId(data.content.conversationId);
          setMessages((prev) => [
            ...prev,
            {
              id: createMessageId(),
              role: 'assistant',
              requestId: data.requestId,
              section: data.content.answer,
              disclaimer: data.disclaimer,
              // 방금 도착한 응답이다. 타자 효과를 그대로 건다.
              restored: false,
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

  return (
    <PageMain className="flex min-h-[calc(100dvh-3rem)] flex-col pb-24">
      <SubPageHeader
        title="FINCH AI"
        action={
          messages.length > 0 ? (
            <button
              type="button"
              onClick={resetConversation}
              className="flex h-11 items-center rounded-12 px-2.5 text-body-2 font-medium text-text-muted transition-colors duration-(--motion-fast) ease-standard active:bg-primary-soft"
            >
              초기화
            </button>
          ) : undefined
        }
      />

      {messages.length === 0 ? (
        <ChatEmptyState
          subCopy={emptyCopy.subCopy}
          suggestions={emptyCopy.suggestions}
          onAsk={handleSend}
        />
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {messages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message}
              // `다시 시도` 는 대화 끝의 실패 하나만 갖는다 (FINCH-249).
              // 판정과 그 이유는 `findRetryTargetId` 주석에 있다. 핸들러를 주지
              // 않는 것이 곧 버튼을 내지 않는 것이라, "보이는데 누르면 딴 것을
              // 보내는" 상태가 만들어지지 않는다.
              onRetry={message.id === retryTargetId ? handleSend : undefined}
              retryDisabled={chatMutation.isPending}
            />
          ))}
          {/*
            요청을 보낸 뒤 답이 오기 전까지 점 세 개 (FINCH-274). 사용자
            말풍선은 `handleSend` 가 뮤테이션을 부르기 전에 먼저 붙이므로, 이
            자리에 올 때는 이미 `messages.length > 0` 이라 빈 상태(`ChatEmptyState`)
            분기와 겹치지 않는다. 실패하면 `isPending` 이 꺼지며 이 자리가 사라지고
            같은 렌더에서 `assistant-error` 말풍선이 뒤이어 붙는다.
          */}
          {chatMutation.isPending && <ChatTypingIndicator />}
        </div>
      )}

      <div
        ref={bottomFixedRef}
        className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-border bg-surface px-6.5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      >
        <ChatComposer disabled={chatMutation.isPending} onSend={handleSend} />
      </div>
    </PageMain>
  );
}
