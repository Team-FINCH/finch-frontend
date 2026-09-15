import { z } from 'zod';

import { IsoDateTimeSchema, StockCodeSchema } from '@/shared/types/primitives';

import { AiSectionSchema, createAiResponseSchema } from './envelope';

/**
 * AI 대화 (`ai/docs/api-spec.md` §4 AI 대화, `POST /ai/chat`).
 *
 * 여섯 기능 중 유일한 도구 호출 에이전트다. 투자 용어 질의도 이 엔드포인트가 담당한다.
 */

/**
 * `context.screen` 의 확인된 값 (AI 명세 §4 Request). 대명사 지시 대상을 푸는 화면 맥락이다.
 *
 * **`briefing` 은 GitLab 이슈 #26 4번 회신으로 확정됐다** (MR !143 머지). AI 쪽 `Screen`
 * 열거값 순서는 `home · portfolio · stock_detail · order · chat · briefing · news_detail` 이고
 * 여기 배열도 그 순서를 따른다 — 두 목록을 나란히 놓고 비교할 수 있어야 해서다.
 *
 * **`news_detail` 은 일부러 빼 두었다.** 우리에게 뉴스 상세 화면이 없다 — 뉴스는 AI 응답의
 * 인용 목록으로만 나오고 누르면 외부 링크가 새 탭에서 열린다(`AiCitationList.tsx`).
 * 이슈 #26 코멘트로 팀에 그렇게 답했고 AI 쪽은 값을 그대로 두기로 했다. 넣으면 어느 화면도
 * 만들어 내지 못하는 값이 열거값에 남는다.
 */
export const AI_CHAT_SCREENS = [
  'home',
  'portfolio',
  'stock_detail',
  'order',
  'chat',
  'briefing',
] as const;
export type AiChatScreen = (typeof AI_CHAT_SCREENS)[number];

/**
 * `POST /ai/chat` 요청 (AI 명세 §4 Request).
 *
 * `conversationId` 를 생략하면 새 대화가 시작되고 응답이 발급한 값을 이후에 그대로 쓴다.
 * `message` 는 공백만으로는 안 되고 2,000자를 넘으면 `INVALID_REQUEST` 다.
 *
 * **요청 본문 키 표기도 camelCase 다** (GitLab 이슈 #12 3번 회신, 2026-09-02).
 * AI 서버로 넘길 때의 snake_case 변환은 백엔드 중계 레이어가 맡으므로,
 * 프론트는 요청·응답 양방향에 camelCase 하나만 쓴다.
 */
export const AiChatRequestSchema = z.object({
  conversationId: z.string().nullish(),
  message: z.string().trim().min(1).max(2000),
  context: z
    .object({
      screen: z.string(),
      /** 종목 맥락. 필드 이름은 AI 원본 그대로 `ticker` 다 (GitLab 이슈 #11 1번 회신) */
      ticker: StockCodeSchema.nullish(),
    })
    .nullish(),
});
export type AiChatRequest = z.infer<typeof AiChatRequestSchema>;

/**
 * AI 대화 본문 (AI 명세 §4 Response — content).
 *
 * `answer` 는 Section 다섯 키를 그대로 쓴다. 다만 **`answer.title` 은 항상 `null`** 이라
 * 말풍선 제목은 프론트가 정한다(C53). `toolsUsed` 는 이번 답변에서 실제로 호출된 Tool 이름이고
 * 호출 순서는 보장되지 않는다. 도구가 필요 없는 질문이면 빈 배열이다.
 */
export const AiChatContentSchema = z.object({
  conversationId: z.string(),
  answer: AiSectionSchema,
  toolsUsed: z.array(z.string()),
});
export type AiChatContent = z.infer<typeof AiChatContentSchema>;

/** POST /ai/chat 응답. 본문에 보존 필드가 함께 실린다 (apiSpec §10.3). */
export const AiChatResponseSchema = createAiResponseSchema(AiChatContentSchema);
export type AiChatResponse = z.infer<typeof AiChatResponseSchema>;

/**
 * 대화 이력 한 줄 (AI 명세 §4.1). `content` 는 평문이다 — 조회 응답이라
 * `AiSection` 처럼 `segments` 로 쪼개지 않는다. 백엔드 중계가 재귀로 snake →
 * camel 을 바꾸므로 `createdAt` 이다(`CaseConverter.java`, apiSpec §10.3).
 */
export const AiChatHistoryMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  createdAt: IsoDateTimeSchema,
});
export type AiChatHistoryMessage = z.infer<typeof AiChatHistoryMessageSchema>;

/**
 * `GET /ai/chat/conversations/{conversationId}/messages` 응답 (AI 명세 §4.1).
 *
 * **봉투가 없다.** 다른 여섯 종과 달리 `content`·`requestId`·`dataAsOf`·
 * `citations`·`disclaimer` 로 감싸지 않고 본문을 그대로 준다 — AI 명세 §4.1의
 * 예시는 "Response — content" 절 밖에 있다(§4 의 `POST /chat` 예시와 비교하면
 * 그 절 표시가 있고 없고가 갈린다). 저장된 값을 그대로 돌려주는 조회라
 * `dataAsOf`·`citations`·`disclaimer` 를 새로 지어낼 근거가 없다.
 *
 * **존재하지 않거나 남의 `conversationId` 는 빈 `messages` 를 돌려준다.**
 * 에러가 아니다 — 소유권 격리는 AI 쪽에서 끝난다(§4.1).
 */
export const AiChatHistorySchema = z.object({
  conversationId: z.string(),
  messages: z.array(AiChatHistoryMessageSchema),
});
export type AiChatHistory = z.infer<typeof AiChatHistorySchema>;
