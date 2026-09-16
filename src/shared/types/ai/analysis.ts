import { z } from 'zod';

import {
  IsoDateSchema,
  IsoDateTimeSchema,
  StockCodeSchema,
} from '@/shared/types/primitives';

import { AiSegmentSchema, createAiResponseSchema } from './envelope';

/**
 * 종목 AI 분석 (`ai/docs/api-spec.md` §3 종목 AI 분석,
 * `POST /ai/stocks/{stockCode}/analysis`).
 *
 * ## 무엇을 옮겨 적었나
 *
 * `ai/docs/openapi.json` `components.schemas` 의 `AnalysisContent` ·
 * `AnalysisSections` · `AnalysisSection` · `Segment` · `ThesisEvidence` ·
 * `ThesisRecord` · `UpcomingEvent` 를 그대로 옮긴 것이다. 표기만 백엔드 재포장에
 * 맞춰 `camelCase` 로 바꿨다(contracts C7 · C15).
 *
 * **전에는 본문 스키마가 없었다.** `AnalysisSection` 이 `{"additionalProperties":
 * true}` 인 빈 object 로 떨어져 키를 하나도 알려주지 않았고(GitLab 이슈 #15,
 * 계약 원장 P8) 그래서 보존 필드 넷만 검증하고 `content` 안쪽을 통과시켰다.
 * **이슈 #15 는 닫혔고 원인(`OptionalKeysModel` 의 wrap 직렬화기)도 걷혔다** —
 * AI 커밋 `62f320e`(2026-08-28, `fix(api): 분석 응답 OpenAPI 계약 명시`)가
 * 아홉 필드를 스키마에 실었고 뒤이어 `09ea41e` 가 `supporting`·`challenging`,
 * `29c1f13` 이 `events` 를 더했다. 그래서 이 파일을 채웠다.
 *
 * 보존 필드 넷(`requestId`·`dataAsOf`·`citations`·`disclaimer`)은 본문이 붙은
 * 뒤에도 그대로 확정이다(apiSpec §10.3 · contracts C7). `createAiResponseSchema`
 * 가 그 넷을 붙이므로 여기서는 `content` 만 정의한다.
 *
 * ## 두 자리에서 openapi 를 그대로 따르지 않았다
 *
 * **(1) 섹션 키를 `camelCase` 로 적었다.** `AnalysisSections` 는
 * `additionalProperties: false` 인 pydantic 모델이라 재포장 레이어가 다른 본문
 * 필드와 구별할 근거가 없다 — `content` 안쪽 키에는 스키마를 모르는 제네릭
 * `snake_case` → `camelCase` 변환만 걸린다(C7, 이슈 #22 회신). 그래서 세 키가
 * `my_impact` → `myImpact`, `thesis_check` → `thesisCheck`,
 * `next_events` → `nextEvents` 로 온다고 본다. **요청 쪽 `sections` 는 키가 아니라
 * 열거 값이라 변환 대상이 아니다**(`AnalysisRequest`) — 보낼 때는
 * `AI_ANALYSIS_REQUEST_SECTIONS` 의 `snake_case` 를 쓴다.
 *
 * **(2) `additionalProperties: false` 를 그대로 굳히지 않았다.** `z.strictObject`
 * 로 짜면 서버가 여덟 번째 섹션을 더하는 순간 AI 탭 전체가 파싱 실패로 사라진다.
 * 모르는 키는 `z.object` 기본 동작대로 버린다 — 화면이 읽지 않으면 없는 것과 같다.
 *
 * ## `null` 규약의 예외가 여기다
 *
 * AI 응답은 보통 선언된 키가 값 없이도 `null` 로 온다(C54). **`AnalysisSection`
 * 안쪽만 예외다** — 이 경로가 `response_model_exclude_unset=True` 라 설정되지 않은
 * 필드는 키째로 빠진다(이슈 #15 회신, C54 단서). 그래서 여기만 `.nullable()` 이
 * 아니라 `.nullish()` 로 짠다. 필수는 `text`·`segments` 둘뿐이다.
 */

/**
 * 논지 근거 한 건 (openapi `ThesisEvidence`). 네 필드 전부 필수다.
 *
 * `citationId` 로 `citations[]` 의 같은 `id` 를 가리킨다.
 * **`thesis_check` 의 `supporting`·`challenging` 은 지금 항상 빈 배열이다**(C56) —
 * 빈 배열을 실패로 다루지 않는다.
 */
export const AiThesisEvidenceSchema = z.object({
  citationId: z.string(),
  title: z.string(),
  source: z.string(),
  rationale: z.string(),
});
export type AiThesisEvidence = z.infer<typeof AiThesisEvidenceSchema>;

/**
 * 점검 대상이 된 투자 논지 (openapi `ThesisRecord`). 세 필드 전부 필수다.
 *
 * 사용자가 채팅에서 남긴 기록이라 위키(`shared/types/ai/wiki.ts`)의 논지와 같은 값이다.
 * `source` 는 `user_stated` 처럼 수집 경로를 담는다.
 */
export const AiThesisRecordSchema = z.object({
  text: z.string(),
  recordedAt: IsoDateTimeSchema,
  source: z.string(),
});
export type AiThesisRecord = z.infer<typeof AiThesisRecordSchema>;

/**
 * `next_events` 의 확인된 `type` 값 (openapi `EventType`).
 *
 * 스키마에서 열거형으로 굳히지 않고 `string` 으로 받는 이유는 `AI_SEGMENT_UNITS`
 * 주석과 같다 — 모르는 종류 하나 때문에 AI 탭 전체가 사라지는 것이 더 나쁘다.
 */
export const AI_ANALYSIS_EVENT_TYPES = [
  'earnings',
  'filing',
  'dividend',
  'macro',
  'product',
] as const;
export type AiAnalysisEventType = (typeof AI_ANALYSIS_EVENT_TYPES)[number];

/**
 * 다가오는 일정 한 건 (openapi `UpcomingEvent`). 여섯 필드 전부 필수다.
 *
 * `confirmed` 가 `false` 면 확정 공시가 아니라 추정 일정이다.
 * `daysUntil` 은 서버가 계산해 보내므로 **화면이 `eventDate` 로 다시 세지 않는다.**
 *
 * **`next_events.events` 는 지금 항상 빈 배열이다**(C56).
 */
export const AiUpcomingEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  eventDate: IsoDateSchema,
  confirmed: z.boolean(),
  daysUntil: z.number().int(),
});
export type AiUpcomingEvent = z.infer<typeof AiUpcomingEventSchema>;

/**
 * 분석 섹션 하나 (openapi `AnalysisSection`, contracts C59).
 *
 * **아홉 필드 가운데 필수는 `text`·`segments` 둘이다.** 나머지 일곱은 위 주석의
 * `exclude_unset` 때문에 키째로 빠질 수 있어 `.nullish()` 다.
 *
 * `text` 와 `segments` 의 관계는 C55 가 정했다 — **`segments` 를 이어 붙이면
 * `text` 와 정확히 일치한다.** `text` 만 출력해도 되는 기본 경로이고 수치 강조가
 * 필요할 때만 `segments` 를 순회한다. 둘 다 필수인 이유가 이것이다. 화면은 둘 중
 * 하나만 그린다 — 둘 다 그리면 같은 문장이 두 번 나온다.
 *
 * `cached` 는 항상 `false`, `cachedAt` 은 항상 `null` 이다(C56).
 * **캐시 배지 UI 를 만들 이유가 없다.**
 *
 * 공통 `AiSectionSchema`(envelope)를 넓히지 않고 따로 둔 이유는 둘이다 —
 * 저쪽은 필수·선택 구성이 다르고(`title`·`cached`·`cachedAt` 이 필수),
 * `supporting`·`challenging`·`thesis`·`events` 는 이 경로에만 있다.
 */
export const AiAnalysisSectionSchema = z.object({
  /** **화면이 짓지 않고 이 값을 그대로 쓴다.** 없으면 제목을 그리지 않는다 (ia.md §4) */
  title: z.string().nullish(),
  text: z.string(),
  segments: z.array(AiSegmentSchema),
  cached: z.boolean().nullish(),
  cachedAt: IsoDateTimeSchema.nullish(),
  /** `thesis_check` 전용. 논지를 지지하는 근거 */
  supporting: z.array(AiThesisEvidenceSchema).nullish(),
  /** `thesis_check` 전용. 논지에 반하는 근거 */
  challenging: z.array(AiThesisEvidenceSchema).nullish(),
  /** `thesis_check` 전용. 점검 대상이 된 기록 */
  thesis: AiThesisRecordSchema.nullish(),
  /** `next_events` 전용. 다가오는 일정 */
  events: z.array(AiUpcomingEventSchema).nullish(),
});
export type AiAnalysisSection = z.infer<typeof AiAnalysisSectionSchema>;

/**
 * 요청 본문 `sections` 에 담는 값 (openapi `AnalysisRequest.sections`).
 *
 * **`snake_case` 다.** 재포장의 `camelCase` 변환은 키 표기에만 걸리고 이쪽은
 * 열거 값이라 그대로 간다. 목록 밖 값을 보내면 서버가 400 으로 거부한다(C57).
 * 생략하면 일곱 섹션 전부를 만든다.
 */
export const AI_ANALYSIS_REQUEST_SECTIONS = [
  'current',
  'changes',
  'attention',
  'risks',
  'my_impact',
  'thesis_check',
  'next_events',
] as const;
export type AiAnalysisRequestSection =
  (typeof AI_ANALYSIS_REQUEST_SECTIONS)[number];

/**
 * `POST /ai/stocks/{stockCode}/analysis` 요청 (openapi `AnalysisRequest`).
 *
 * 둘 다 선택이고 기본값은 `sections` 전체 · `personalize: true` 다.
 * 비보유 종목에 개인화를 요청해도 에러가 아니라 해당 섹션이 `null` 이다(C58).
 */
export const AiAnalysisRequestSchema = z.object({
  sections: z.array(z.enum(AI_ANALYSIS_REQUEST_SECTIONS)).nullish(),
  personalize: z.boolean().nullish(),
});
export type AiAnalysisRequest = z.infer<typeof AiAnalysisRequestSchema>;

/**
 * 섹션 일곱 (openapi `AnalysisSections`, contracts C57).
 *
 * **응답은 객체라 순서가 없다. 표시 순서는 화면이 정한다**(ia.md §4) —
 * 그 순서가 `AI_ANALYSIS_SECTION_KEYS` 다.
 *
 * 전부 `.nullish()` 인 이유가 셋이다 — 요청에서 뺀 섹션은 키가 빠지고
 * (`exclude_unset`), `personalize: false` 면 개인화 섹션 둘은 키가 남고 값이
 * `null` 이고(C58), 미보유·논지 없음도 `null` 이다(ia.md §4 표).
 */
export const AiAnalysisSectionsSchema = z.object({
  current: AiAnalysisSectionSchema.nullish(),
  changes: AiAnalysisSectionSchema.nullish(),
  attention: AiAnalysisSectionSchema.nullish(),
  risks: AiAnalysisSectionSchema.nullish(),
  myImpact: AiAnalysisSectionSchema.nullish(),
  thesisCheck: AiAnalysisSectionSchema.nullish(),
  nextEvents: AiAnalysisSectionSchema.nullish(),
});
export type AiAnalysisSections = z.infer<typeof AiAnalysisSectionsSchema>;

/**
 * 화면이 정한 표시 순서 (ia.md §4 3번 슬롯 표).
 *
 * design.md §8.3 `AIDetail` 의 구조
 * (`결론 → 근거 → 위험/확인할 점 → 내 계좌 영향 → 일정/기준 → 출처 → Feedback`)와
 * 원래 이 순서가 일대일로 맞았다.
 *
 * **`myImpact`·`thesisCheck` 는 뺐다**(GitLab 이슈 #92). AI 가 종목 분석을
 * 보유·논지에 무관한 종목 단위 정보로 바꾸면서 그 둘이 응답에서 아예 빠진다 —
 * 매 요청마다 LLM 을 태우고 Guardrail 에 자주 걸려 화면이 늦고 비어 보였다.
 * 나머지 다섯은 아침 배치가 미리 만들어 즉시 나온다.
 */
export const AI_ANALYSIS_SECTION_KEYS = [
  'current',
  'changes',
  'attention',
  'risks',
  'nextEvents',
] as const;
export type AiAnalysisSectionKey = (typeof AI_ANALYSIS_SECTION_KEYS)[number];

/**
 * 종목 AI 분석 본문 (openapi `AnalysisContent`). 세 필드 전부 필수다.
 *
 * 종목코드 필드 이름은 AI 원본 그대로 `ticker` 다(C74). 재포장이 스키마를 모르는
 * 제네릭 키 변환이라 `ticker` → `stockCode` 매핑 표는 두지 않는다.
 */
export const AiAnalysisContentSchema = z.object({
  ticker: StockCodeSchema,
  name: z.string(),
  sections: AiAnalysisSectionsSchema,
});
export type AiAnalysisContent = z.infer<typeof AiAnalysisContentSchema>;

/** POST /ai/stocks/{stockCode}/analysis 응답. 본문에 보존 필드가 함께 실린다 (apiSpec §10.3). */
export const AiAnalysisResponseSchema = createAiResponseSchema(
  AiAnalysisContentSchema,
);
export type AiAnalysisResponse = z.infer<typeof AiAnalysisResponseSchema>;
