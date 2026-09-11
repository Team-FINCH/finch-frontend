import type { StockCode } from '@/shared/types/primitives';

/**
 * "왜 담으셨나요?" 시트가 저장에 쓰는 것 (apiSpec §6.4 · §10.1, contracts C97·C99).
 *
 * **알림함 전용 저장 경로가 없다.** 매수 이유는 `POST /ai/wiki/theses` 하나로 가고,
 * 그 훅(`useCreateWikiThesis`)은 티켓 238 이 `features/portfolio/api` 에 만들어 뒀다.
 * **`features/inbox` 가 그것을 직접 import 할 수 없다** — feature 끼리의 import 는
 * `import-x/no-restricted-paths` 가 막는다(컨벤션 §2). 그래서 컨벤션이 정한 길대로
 * `pages/InboxPage.tsx` 가 훅을 부르고 이 모양으로 내려준다.
 *
 * 뮤테이션 객체 전체가 아니라 시트가 실제로 쓰는 넷만 받는다 — `mutate`·`isPending`·
 * `isError`·`error` 에 시트를 닫을 때 쓰는 `reset` 이다. TanStack Query 의
 * `UseMutationResult` 를 그대로 받으면 알림함이 그 타입에 묶여, 저장 경로가 또
 * 바뀔 때 시트까지 함께 고쳐야 한다.
 */
export type InboxRecordSubmit = {
  mutate: (
    variables: {
      stockCode: StockCode;
      text: string;
      /**
       * 이 항목을 만든 매수 체결. 알림함은 `tradeId` 를 숫자로 주는데 AI 쪽 필드는
       * 문자열이라 **호출부가 `String()` 으로 바꿔 넣는다**(apiSpec §10.1).
       */
      linkedTradeId: string;
    },
    options?: { onSuccess?: () => void },
  ) => void;
  isPending: boolean;
  isError: boolean;
  /** 서버가 거절한 이유를 그대로 띄우기 위한 값. `isHttpError` 로 걸러 쓴다. */
  error: unknown;
  reset: () => void;
};
