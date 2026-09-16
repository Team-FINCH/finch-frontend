import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useChatHistoryQuery } from '@/features/chat/api/useChatHistoryQuery';
import { useChatJobMutation } from '@/features/chat/api/useChatJobMutation';
import { useChatJobQuery } from '@/features/chat/api/useChatJobQuery';
import { ChatBubble } from '@/features/chat/components/ChatBubble';
import { ChatComposer } from '@/features/chat/components/ChatComposer';
import { ChatContextSuggestionChips } from '@/features/chat/components/ChatContextSuggestionChips';
import { ChatEmptyState } from '@/features/chat/components/ChatEmptyState';
import { ChatTypingIndicator } from '@/features/chat/components/ChatTypingIndicator';
import { chatEmptyCopy } from '@/features/chat/lib/chatEmptyCopy';
import {
  clearPendingChatJob,
  readPendingChatJob,
} from '@/features/chat/lib/chatPendingJob';
import { parseChatContext } from '@/features/chat/lib/parseChatContext';
import {
  isChatJobDailyBudgetFailure,
  type ChatJobFailure,
} from '@/features/chat/model/chatJob';
import {
  appendJobAnswer,
  appendPendingQuestion,
  createMessageId,
  findRetryTargetId,
  MAX_CHAT_RETRY_COUNT,
  toRestoredMessage,
  type ChatMessage,
} from '@/features/chat/model/chatMessages';
import { isHttpError } from '@/shared/api';
import { useRegisterBottomFixedSpace } from '@/shared/hooks/useBottomFixedSpace';
import { showToast } from '@/shared/hooks/useToastStore';
import {
  isRetryableAiErrorCode,
  readAiErrorCode,
} from '@/shared/lib/aiErrorRetry';
import {
  clearStoredConversationId,
  getStoredConversationId,
  storeConversationId,
} from '@/shared/lib/chatConversationId';
import { generateIdempotencyKey } from '@/shared/lib/idempotencyKey';
import { AI_RELAY_ERROR_CODES } from '@/shared/types/errorCodes';
import { type IdempotencyKey } from '@/shared/types/primitives';
import { PageMain } from '@/shared/ui/PageMain';
import { SubPageHeader } from '@/shared/ui/SubPageHeader';

/** 일일 예산 소진 전용 문구 (FINCH-283). 사실만 적고 재시도를 유도하지 않는다. */
const DAILY_TOKEN_BUDGET_MESSAGE =
  '오늘의 AI 답변 한도를 모두 사용했어요. 내일 다시 이용할 수 있어요.';

/**
 * 실패당 재시도 2회를 다 썼을 때(FINCH-283). "다시 시도" 버튼이 사라진
 * 대신 입력창을 가리킨다 — 입력창은 잠겨 있지 않다(티켓 249와 같은 결).
 * "잠시 후 다시 시도해 주세요"처럼 할 수 없는 행동을 가리키지 않는다.
 */
const RETRY_EXHAUSTED_MESSAGE =
  '답을 받지 못했어요. 입력창에 다시 물어봐 주세요.';

const DEFAULT_CHAT_ERROR_MESSAGE = '메시지를 보내지 못했어요.';

/**
 * job 상태 조회가 내리 몇 번 실패하면 기다림을 끝내는가 (FINCH-290).
 *
 * **HTTP 상태 코드로 가르지 않는다** (컨벤션 §5 — 분기는 `code` 로 한다). 그런데
 * job 조회 실패의 `code` 목록이 아직 계약에 없어서 회수로 센다. 한 번의 실패는
 * 잠깐 끊긴 것일 수 있고 그때는 다음 주기가 곧 재시도라 기다림을 끝낼 이유가
 * 없다. 다섯 번 연속(약 10초)이면 끊긴 것이 아니라 **이 job 을 조회할 수 없는
 * 것**으로 본다 — 로그아웃하고 다른 계정으로 들어왔거나, job 이 서버에서
 * 만료됐거나, 적어 둔 `jobId` 가 더는 없는 경우다. 무한 로딩으로 두지 않는 것이
 * 이 값의 목적이다.
 */
const CHAT_JOB_POLL_FAILURE_LIMIT = 5;

/** 조회를 포기했을 때의 문구. 서버가 준 문장이 없으므로 화면이 만든다. */
const CHAT_JOB_UNREACHABLE_MESSAGE =
  '답변 상태를 확인하지 못했어요. 다시 물어봐 주세요.';

/**
 * 접수 요청이 실패했을 때의 `HttpError` 를 job 실패와 같은 모양으로 맞춘다
 * (FINCH-290).
 *
 * **실패가 들어오는 문이 둘이라서 필요하다** — 접수 요청의 HTTP 실패와, 200 응답
 * 본문으로 오는 job 실패다. 둘을 한 모양으로 맞춰 두면 아래 `toChatErrorMessage`
 * 하나가 두 갈래를 모두 다루고, 문구·재시도 판정이 두 곳으로 갈리지 않는다.
 */
function toChatJobFailure(error: unknown): ChatJobFailure {
  return {
    code: readAiErrorCode(error) ?? null,
    message: isHttpError(error) ? error.message : DEFAULT_CHAT_ERROR_MESSAGE,
    detail: isHttpError(error) ? error.detail : null,
  };
}

/**
 * 실패 하나를 말풍선으로 옮긴다 (FINCH-283 의 판정을 그대로 옮겨 온 것).
 *
 * **일일 예산 소진은 갈래가 다르다.** `code` 만으로는
 * `AI_UPSTREAM_RATE_LIMITED` 의 두 갈래(분당 한도 · 일일 예산)를 가를 수 없어
 * `detail.reason` 까지 보는 전용 판정을 먼저 거친다 — 여기 해당하면 재시도
 * 횟수와 무관하게 버튼이 없다.
 *
 * 네트워크 실패·응답 스키마 불일치(`code` 없음)는 재시도가 유의미하다. 알려진
 * 코드는 도메인 판정(`isRetryableAiErrorCode`)을 따르되, `AI_UPSTREAM_RATE_LIMITED`
 * 는 위에서 일일 예산 갈래를 걸러 낸 뒤라 여기 남은 것은 분당 한도뿐이다 —
 * 그쪽은 `Retry-After` 뒤에 재시도하면 풀린다(apiSpec §10.4).
 */
function toChatErrorMessage(
  failure: ChatJobFailure,
  retryText: string,
  retryCount: number,
  retryIdempotencyKey: IdempotencyKey | null,
): ChatMessage {
  if (isChatJobDailyBudgetFailure(failure)) {
    return {
      id: createMessageId(),
      role: 'assistant-error',
      message: DAILY_TOKEN_BUDGET_MESSAGE,
      retryable: false,
      retryText,
      retryCount: 0,
      retryIdempotencyKey: null,
    };
  }

  const codeRetryable =
    failure.code === null
      ? true
      : isRetryableAiErrorCode(failure.code) ||
        failure.code === AI_RELAY_ERROR_CODES.UPSTREAM_RATE_LIMITED;
  const hasRetriesLeft = retryCount < MAX_CHAT_RETRY_COUNT;
  const retryable = codeRetryable && hasRetriesLeft;

  return {
    id: createMessageId(),
    role: 'assistant-error',
    // 재시도를 다 썼으면 서버 문구 대신 입력창으로 유도하는 문구로 바꾼다 —
    // 남은 재시도가 없다는 사실이 서버 메시지보다 중요하다.
    message:
      codeRetryable && !hasRetriesLeft
        ? RETRY_EXHAUSTED_MESSAGE
        : failure.message,
    retryable,
    retryText,
    retryCount,
    // 버튼이 없으면 들고 있을 이유도 없다.
    retryIdempotencyKey: retryable ? retryIdempotencyKey : null,
  };
}

/**
 * AI 채팅 — 내 포트폴리오에 대해 묻고 답 받기. 화면 맥락(`screen`·`ticker`)을 실어
 * 보내는 진입도 이 라우트로 연다 (`ia.md` §2 "채팅은 `/chat` 전용 화면만이 아니다").
 *
 * 티켓: FINCH-139. 근거: `ia.md` §1 "AI" 표.
 *
 * ## 답변 생성은 비동기 작업이다 (FINCH-290, GitLab 이슈 #84)
 *
 * **긴 동기 요청을 열어 두지 않는다.** 전에는 `POST /ai/chat` 한 번이 답이 올
 * 때까지 열려 있어서 화면을 옮기면 그 요청과 함께 답도 사라졌다 — **AI 생성
 * 비용은 이미 나간 뒤**라 사용자만 손해였다. 지금은 `POST /ai/chat/jobs` 로
 * 접수시키고(202 + `jobId`) `GET /ai/chat/jobs/{jobId}` 를 폴링해 받는다.
 * 계약은 **잠정 확정**이고 고칠 범위는 `features/chat/model/chatJob.ts` 머리
 * 주석에 적어 뒀다(`contracts.md` T4 · P40).
 *
 * **완료 통지는 폴링이다. SSE 를 쓰지 않는다** — 폐기된 결정이고(커밋 `34ed34a`)
 * 되살리려면 백엔드 스트리밍 프록시가 먼저다(`contracts.md` C4).
 *
 * 잠그는 것은 **이 대화의 전송 버튼 하나**다. 전역 내비게이션과 뒤로가기는
 * 건드리지 않는다 — 생성 중에 홈·포트폴리오·종목 상세로 자유롭게 갈 수 있어야 한다.
 *
 * ## 상태가 어디에 남나
 *
 * - `conversationId` — `localStorage`(`shared/lib/chatConversationId`). 대화를
 *   종목별로 나누지 않는 것이 의도라 키가 하나다(FINCH-278)
 * - 기다리는 `jobId` — `localStorage`(`features/chat/lib/chatPendingJob`). 질문
 *   원문과 재시도 횟수를 함께 적는다. 왜 zustand 가 아닌지는 그 파일 주석에 있다
 * - `messages` — `useState` 뿐이다. 화면을 나가면 사라지고 다시 들어올 때 이력
 *   조회로 복원한다. 대화 전체를 스토리지에 두지 않는 이유는 278 과 같다 — 로컬과
 *   서버 두 군데에 같은 내용을 들고 있으면 어긋났을 때 어느 쪽이 맞는지 다투게 된다
 *
 * ## 답변이 두 번 그려지지 않게 하는 것
 *
 * 같은 답을 들고 올 수 있는 경로가 둘이다 — 대화 이력 조회와 job 결과 조회.
 * 순서를 정해 막는다. **이력이 먼저 반영되고(`historySettled`), 그 위에 job
 * 결과를 얹는다.** 얹을 때 이미 있는 턴인지 보는 판정은 `appendJobAnswer` 에
 * 있다. 그렇게 두면 이력이 늦게 도착해 방금 붙인 답을 통째로 덮어쓰는 일도 없다.
 *
 * ## 그 밖에 그대로인 것
 *
 * `context` 는 **매 메시지마다** 싣는다 (FINCH-286). 서버가 이어가는 것은
 * 대화 이력이고 `context` 는 **지금 어느 화면에 있나** 라 서로 다르다. 답변
 * 말풍선마다 `requestId` 가 다르고 말풍선마다 피드백 버튼이 붙는다(contracts
 * C14·C70). 제목이 `FINCH AI` 인 것과 뒤로가기 동작은 FINCH-245·248 그대로다.
 */
export function ChatPage() {
  const [searchParams] = useSearchParams();
  const chatContext = parseChatContext(searchParams);

  // 입력창 바가 토스트 자리를 정한다 — 이 화면은 `ActionBar` 를 쓰지 않고 같은
  // 모양의 바를 직접 그려서, 등록도 여기서 한다 (FINCH-232).
  const bottomFixedRef = useRegisterBottomFixedSpace();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  /**
   * 대화 이력 복원 (FINCH-278). `localStorage` 읽기는 동기라 `useState`
   * 초기값으로 한 번만 계산한다. `useChatHistoryQuery` 는 이 값이 `null` 이면
   * 아예 호출하지 않는다.
   */
  const [storedConversationId] = useState(() => getStoredConversationId());
  const historyQuery = useChatHistoryQuery(storedConversationId);

  /**
   * 답을 기다리는 중인 job (FINCH-290). 같은 이유로 마운트 때 한 번만 읽는다.
   * 이 값이 `null` 이 아닌 동안 전송 버튼이 잠기고 점 세 개가 뜬다.
   */
  const [pendingJob, setPendingJob] = useState(() => readPendingChatJob());
  const jobQuery = useChatJobQuery(pendingJob?.jobId ?? null);

  const chatJobMutation = useChatJobMutation();

  /**
   * 이력을 **렌더 중에** 반영한다. `useEffect` 로 하면 `historyQuery.data` 가
   * 도착한 렌더에서 `setState` 를 동기로 부르는 모양이 되어
   * `react-hooks/set-state-in-effect` 가 막는다(react.dev "You Might Not Need an
   * Effect"). `appliedHistoryData` 가 "지금까지 반영한 데이터"를 들고 있다가 참조가
   * 달라진 순간(=새 데이터가 도착한 순간) 딱 한 번만 반영한다 — 매 렌더 반영하면
   * 그사이 쌓인 이번 세션의 대화를 덮어쓴다.
   */
  const [appliedHistoryData, setAppliedHistoryData] =
    useState<typeof historyQuery.data>(undefined);

  if (
    historyQuery.data !== undefined &&
    historyQuery.data !== appliedHistoryData
  ) {
    setAppliedHistoryData(historyQuery.data);
    if (historyQuery.data.content.messages.length > 0) {
      setConversationId(historyQuery.data.content.conversationId);
      setMessages(historyQuery.data.content.messages.map(toRestoredMessage));
    }
    // 조회 실패는 여기서 다루지 않는다 — `messages` 초기값이 이미 빈 배열이라
    // "불러오기 실패는 빈 상태로 떨어뜨린다"가 아무 것도 안 하는 것으로 충족된다.
  }

  /**
   * 이력 조회가 끝났나. **job 결과를 얹기 전에 반드시 참이어야 한다**
   * (FINCH-290). 이력이 나중에 도착하면 `setMessages` 로 배열을 통째로 갈아
   * 끼우므로, 그 전에 job 의 답변을 붙여 두면 그 답변만 조용히 사라진다. 저장된
   * 대화가 없으면(`storedConversationId === null`) 조회 자체가 없으니 처음부터 참이다.
   */
  const historySettled =
    storedConversationId === null ||
    historyQuery.isSuccess ||
    historyQuery.isError;

  /**
   * job 상태를 **렌더 중에** 반영한다. 이력과 같은 이유·같은 방식이다.
   *
   * 폴링은 2초마다 같은 `{ kind: 'pending' }` 을 돌려주는데 TanStack Query 의
   * 구조적 공유가 값이 같으면 참조를 유지해 주므로, 이 분기는 **상태가 실제로
   * 바뀐 순간에만** 들어온다.
   */
  const [appliedJobState, setAppliedJobState] =
    useState<typeof jobQuery.data>(undefined);

  if (
    historySettled &&
    pendingJob !== null &&
    jobQuery.data !== undefined &&
    jobQuery.data !== appliedJobState
  ) {
    const jobState = jobQuery.data;
    setAppliedJobState(jobState);

    if (jobState.kind === 'pending') {
      // 화면을 옮겼다 돌아온 경우 질문 말풍선이 없다. 이력에도 없다 — 아직 끝나지
      // 않은 턴이라서다(AI 명세 §4.1). 적어 둔 원문으로 되살린다.
      setMessages((prev) => appendPendingQuestion(prev, pendingJob.question));
    }

    if (jobState.kind === 'completed') {
      const { answer } = jobState;
      setConversationId(answer.content.conversationId);
      setMessages((prev) =>
        appendJobAnswer(prev, pendingJob.question, {
          id: createMessageId(),
          role: 'assistant',
          requestId: answer.requestId,
          section: answer.content.answer,
          citations: answer.citations,
          disclaimer: answer.disclaimer,
          // 방금 도착한 응답이다. 타자 효과를 그대로 건다.
          restored: false,
        }),
      );
      setPendingJob(null);
    }

    if (jobState.kind === 'failed') {
      setMessages((prev) => [
        ...appendPendingQuestion(prev, pendingJob.question),
        toChatErrorMessage(
          jobState.failure,
          pendingJob.question,
          pendingJob.retryCount,
          // 생성은 이미 끝났고 결과가 실패다. 재시도는 같은 클릭의 재전송이 아니라
          // 새 생성 요청이라 새 키를 만든다 — `ChatMessage.retryIdempotencyKey` 참고.
          null,
        ),
      ]);
      setPendingJob(null);
    }
  }

  /**
   * 조회 자체가 내리 실패했다 (FINCH-290). 무한 로딩으로 두지 않고 재시도
   * 가능한 실패로 떨어뜨린다 (`CHAT_JOB_POLL_FAILURE_LIMIT` 주석 참고).
   * `setPendingJob(null)` 로 쿼리가 꺼지므로 이 분기는 한 번만 들어온다.
   */
  if (
    historySettled &&
    pendingJob !== null &&
    jobQuery.failureCount >= CHAT_JOB_POLL_FAILURE_LIMIT
  ) {
    setMessages((prev) => [
      ...appendPendingQuestion(prev, pendingJob.question),
      toChatErrorMessage(
        { code: null, message: CHAT_JOB_UNREACHABLE_MESSAGE, detail: null },
        pendingJob.question,
        pendingJob.retryCount,
        null,
      ),
    ]);
    setPendingJob(null);
  }

  /**
   * `localStorage` 쓰기는 부수효과라 렌더 중에 부르지 않는다
   * (`features/auth/lib/oauthState.ts` 의 읽기·쓰기 분리와 같은 규칙). 위 분기들은
   * `pendingJob` 상태만 건드리고 스토리지는 이 효과가 따라간다.
   *
   * **접수 성공 때 스토리지에 적는 것은 이 효과가 아니라 `useChatJobMutation` 이다**
   * — 보내자마자 화면을 옮기면 이 컴포넌트가 언마운트돼 여기까지 오지 않는다.
   * 그 훅 주석에 이유가 있다.
   */
  useEffect(() => {
    if (pendingJob === null) {
      clearPendingChatJob();
    }
  }, [pendingJob]);

  /**
   * 다음 진입에서 이 대화를 복원할 수 있게 화면 밖에도 남긴다 (FINCH-278).
   * 실패해도(스토리지 접근 불가) 화면은 그대로 진행한다.
   *
   * `null` 일 때 지우지 않는 이유 — 초기화는 `resetConversation` 이 명시적으로
   * 지우고, 그 밖에 `null` 인 구간은 "아직 첫 답이 오지 않았다" 일 뿐이라 지울
   * 것이 없다.
   */
  useEffect(() => {
    if (conversationId !== null) {
      storeConversationId(conversationId);
    }
  }, [conversationId]);

  /**
   * 저장된 id 가 가리키는 대화에 메시지가 없다. 매번 빈 조회를 반복하지 않게
   * 지운다 — 이 id 로 화면이 얻을 수 있는 것이 앞으로도 없다.
   */
  useEffect(() => {
    if (historyQuery.data?.content.messages.length === 0) {
      clearStoredConversationId();
    }
  }, [historyQuery.data]);

  // 종목 맥락으로 들어왔으면 빈 상태 문구에 종목명이 들어간다. 쿼리에 이름이 없으면
  // (주소로 바로 열었을 때) `이 종목` 으로 떨어진다.
  const emptyCopy = chatEmptyCopy(
    chatContext.ticker === null ? null : (chatContext.stockName ?? '이 종목'),
  );

  // 실패 말풍선이 여럿이어도 `다시 시도` 는 하나다 (FINCH-249).
  const retryTargetId = findRetryTargetId(messages);

  /**
   * 답을 기다리는 중인가 (FINCH-290). **접수 요청이 나가 있는 동안**
   * (`isPending`)과 **접수된 job 이 도는 동안**(`pendingJob`) 둘 다다. 이 값이
   * 잠그는 것은 전송 경로뿐이고 화면 이동은 건드리지 않는다.
   */
  const isAwaitingAnswer = chatJobMutation.isPending || pendingJob !== null;

  /**
   * 종목 진입 추천 칩 (FINCH-286). 이 방문에서 메시지를 한 번이라도 보내면
   * 계속 숨긴다 — `messages.length` 만 보면 안 된다. 답이 하나 오면 `messages`
   * 가 다시 비지 않아 그 뒤로도 계속 보여야 할 이유가 없어진다.
   */
  const [chipsSentThisVisit, setChipsSentThisVisit] = useState(false);
  const showContextChips =
    chatContext.screen === 'stock_detail' &&
    messages.length > 0 &&
    !chipsSentThisVisit;

  /**
   * 빈 상태로 떨어뜨릴지. **기다리는 job 이 있으면 빈 상태가 아니다**
   * (FINCH-290) — 복원 직후 질문 말풍선이 붙기 전 한 프레임 동안 빈 상태가
   * 번쩍이는 것을 막는다.
   */
  const showEmptyState = messages.length === 0 && !isAwaitingAnswer;

  function resetConversation() {
    setMessages([]);
    setConversationId(null);
    // 저장된 id 도 함께 지운다. 지우지 않으면 초기화 뒤 새 메시지를 보내기 전에
    // 화면을 나갔다 돌아왔을 때 복원 경로가 방금 초기화한 대화를 도로 그린다.
    clearStoredConversationId();
    // 기다리던 job 도 함께 버린다 (FINCH-290). 초기화는 이 대화를 비우겠다는
    // 분명한 뜻이라, 비운 대화 위에 그 대화의 답이 뒤늦게 얹히면 안 된다.
    setPendingJob(null);
    // 말풍선이 사라지는 것만으로는 초기화가 된 것인지 화면이 비어 버린 것인지
    // 구분되지 않는다. 서버를 부르지 않는 로컬 초기화라 성공 콜백이 따로 없다.
    showToast('대화를 초기화했어요.');
  }

  /**
   * **보내는 자리는 셋인데 가드는 여기 하나다** (FINCH-248). 입력창
   * (`ChatComposer`) · 빈 상태의 추천 질문(`ChatEmptyState`) · 실패 말풍선의
   * `다시 시도`(`ChatBubble`) 가 전부 이 함수를 부른다. 버튼마다 막으면 호출부가
   * 늘 때마다 같은 판정을 다시 적게 되고, 하나 빠뜨리면 그 경로에서만 조용히 샌다.
   *
   * 기준은 `isAwaitingAnswer` 다. **전에는 `chatMutation.isPending` 이었는데,
   * 이제 요청이 202 로 곧 끝나므로 그것만 보면 job 이 도는 내내 전송이 열려 있다**
   * (FINCH-290).
   *
   * **이 가드만으로는 부족하다** (FINCH-249). 여기서 막는 것은 답을 기다리는
   * 동안의 중복이고, 지나간 실패 말풍선이 저마다 들고 있던 버튼은
   * `findRetryTargetId` 가 버튼 자체를 하나로 줄여서 막는다. 둘은 서로 다른 것을
   * 막으므로 함께 있어야 한다.
   *
   * @param retryCount 이 전송이 몇 번째 재시도인지 (FINCH-283). 입력창·빈 상태
   * 추천 질문처럼 **새 질문**이면 `0`이다.
   * @param retryIdempotencyKey 다시 써야 할 멱등성 키 (FINCH-290). `null` 이면
   * 새로 만든다. **키의 수명은 사용자의 한 번의 클릭이다** — 마운트 시점에 한 번
   * 만들어 재사용하면 서로 다른 전송이 같은 키를 쓰게 되어 뜻이 없어진다
   * (`shared/lib/idempotencyKey.ts`).
   */
  function handleSend(
    text: string,
    retryCount = 0,
    retryIdempotencyKey: IdempotencyKey | null = null,
  ) {
    if (isAwaitingAnswer) {
      return;
    }

    setChipsSentThisVisit(true);

    const idempotencyKey = retryIdempotencyKey ?? generateIdempotencyKey();

    setMessages((prev) => [
      ...prev,
      { id: createMessageId(), role: 'user', text },
    ]);

    chatJobMutation.mutate(
      {
        body: {
          conversationId,
          message: text,
          // 매 메시지마다 싣는다 (FINCH-286). 근거는 파일 머리 주석 참고.
          context: { screen: chatContext.screen, ticker: chatContext.ticker },
        },
        idempotencyKey,
        retryCount,
      },
      {
        onSuccess: (created) => {
          // 스토리지에는 훅이 이미 적었다. 여기서는 화면 상태만 맞춘다.
          setPendingJob({
            jobId: created.jobId,
            conversationId,
            question: text,
            retryCount,
          });
        },
        onError: (error) => {
          /**
           * **접수 자체가 실패했다.** job 이 만들어졌는지 못 만들어졌는지 모르는
           * 구간이라, 재시도가 같은 키를 다시 쓰도록 키를 함께 실어 보낸다 —
           * 이미 만들어진 job 이 있다면 같은 `jobId` 를 되받고 AI 생성 비용이
           * 두 번 나가지 않는다.
           */
          setMessages((prev) => [
            ...prev,
            toChatErrorMessage(
              toChatJobFailure(error),
              text,
              retryCount,
              idempotencyKey,
            ),
          ]);
        },
      },
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden [--page-bottom-space:6rem]">
      {/* 앱 셸 — 본문만 이 안에서 굴러간다 (FINCH-297, `shared/ui/PageMain` 주석). */}
      {/* 6rem 은 이 화면이 `pb-24` 로 들고 있던 값 그대로다 — 입력 바가 `fixed` 라
        마지막 말풍선이 그 밑에 깔린다. `min-h-[calc(100dvh-3rem)]` 은 함께 걷었다:
        껍데기가 높이를 주기 전에 본문이 화면을 채우게 하려던 임시값이라, 이제는
        그 값 때문에 내용이 짧아도 스크롤이 생긴다. */}
      <PageMain className="flex flex-col">
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

        {showEmptyState ? (
          <ChatEmptyState
            subCopy={emptyCopy.subCopy}
            suggestions={emptyCopy.suggestions}
            onAsk={handleSend}
          />
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {messages.map((message) => {
              // 다음 재시도가 몇 번째인지는 이 말풍선의 retryCount + 1 이다
              // (FINCH-283). `assistant-error` 가 아니면(=retryTargetId 가
              // 이 id 일 수 없다) 쓰이지 않는 값이라 0 으로 둔다.
              const nextRetryCount =
                message.role === 'assistant-error' ? message.retryCount + 1 : 0;
              // 접수 실패에서 온 말풍선만 키를 들고 있다 (FINCH-290).
              const retryIdempotencyKey =
                message.role === 'assistant-error'
                  ? message.retryIdempotencyKey
                  : null;
              return (
                <ChatBubble
                  key={message.id}
                  message={message}
                  // `다시 시도` 는 대화 끝의 실패 하나만 갖는다 (FINCH-249).
                  // 판정과 그 이유는 `findRetryTargetId` 주석에 있다. 핸들러를 주지
                  // 않는 것이 곧 버튼을 내지 않는 것이라, "보이는데 누르면 딴 것을
                  // 보내는" 상태가 만들어지지 않는다.
                  onRetry={
                    message.id === retryTargetId
                      ? (retryText) =>
                          handleSend(
                            retryText,
                            nextRetryCount,
                            retryIdempotencyKey,
                          )
                      : undefined
                  }
                  retryDisabled={isAwaitingAnswer}
                />
              );
            })}
            {/*
            답을 기다리는 동안 점 세 개 (FINCH-274). 접수 요청이 나가 있는
            동안과 job 이 도는 동안 둘 다 뜬다 — 사용자에게는 같은 "기다리는 중"
            이라 둘을 나눠 보여 줄 이유가 없다. **화면을 옮겼다 돌아왔을 때 이
            자리가 그대로 되살아나는 것**이 티켓 290 의 복원 요건이다.
          */}
            {isAwaitingAnswer && <ChatTypingIndicator />}
          </div>
        )}

        <div
          ref={bottomFixedRef}
          className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-border bg-surface px-6.5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        >
          {/*
          칩 줄도 이 바 안에 둔다 — `useRegisterBottomFixedSpace` 가 이 div 를
          `ResizeObserver` 로 재기 때문에, 칩이 나타나거나 사라져 바 높이가
          바뀌면 토스트 자리도 같은 렌더에서 함께 갱신된다(FINCH-286).
        */}
          {showContextChips && (
            <ChatContextSuggestionChips
              suggestions={emptyCopy.suggestions.slice(0, 2)}
              disabled={isAwaitingAnswer}
              onPick={handleSend}
            />
          )}
          <ChatComposer disabled={isAwaitingAnswer} onSend={handleSend} />
        </div>
      </PageMain>
    </div>
  );
}
