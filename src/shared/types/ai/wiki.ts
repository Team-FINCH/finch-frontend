import { z } from 'zod';

import { IsoDateTimeSchema, StockCodeSchema } from '@/shared/types/primitives';

import { createAiResponseSchema } from './envelope';

/**
 * AI가 이해한 나 — 위키 (`ai/docs/api-spec.md` §9 · `ai/docs/openapi.json`
 * `WikiContent`·`WikiFactOut`·`WikiThesisOut`·`DeletedFactContent`·`ThesisIn` ·
 * `frontend/docs/ia.md` §1 "AI가 이해한 나 — 위키 화면" · `contracts.md` C79·C80).
 *
 * 프론트가 부르는 경로 셋 (C80, 경로 상수는 `shared/config/apiContract.ts`
 * `API_PATHS.ai.wiki`) —
 * - `GET /api/v1/ai/wiki` — 열람
 * - `PUT /api/v1/ai/wiki/theses/{stockCode}` — 논지 수정
 * - `DELETE /api/v1/ai/wiki/facts/{factId}` — 사실 삭제
 *
 * `POST /wiki/theses`(논지 최초 기록)는 AI 서비스가 대화 안에서 스스로 부르는
 * 경로라 프론트가 호출하지 않는다(ia.md §1). 논지 입력 폼을 만들지 않는다.
 *
 * **키 이름은 `ai/docs/openapi.json`에서 직접 읽었다**(C79 — 이 다섯 경로는 전용
 * pydantic 모델이 있어 손으로 옮겨 적을 필요가 없다는 제약이 풀렸다). 백엔드
 * 재포장이 `content` 컨테이너를 유지하고(C7) `snake_case` → `camelCase` 변환만
 * 적용하므로 `as_of`→`asOf`, `recorded_at`→`recordedAt`, `deleted_at`→`deletedAt`,
 * `linked_trade_id`→`linkedTradeId`로 옮겼다. `ticker`는 원래도 소문자라 변환으로
 * 이름이 바뀌지 않는다(C74와 같은 원칙).
 */

/** `profile[].source` (openapi `WikiSource`). `ai_inferred`는 단정형으로 렌더하지 않는다. */
export const WikiSourceSchema = z.enum([
  'user_stated',
  'derived_from_trades',
  'ai_inferred',
]);
export type WikiSource = z.infer<typeof WikiSourceSchema>;

/** `profile[].confidence` (openapi `Confidence`). 등급 뱃지를 만들지 않고 문자열만 쓴다(ia.md §1). */
export const WikiConfidenceSchema = z.enum(['low', 'medium', 'high']);
export type WikiConfidence = z.infer<typeof WikiConfidenceSchema>;

/** `theses[].status` (openapi `ThesisStatus`). `active` 외에는 "비활성"으로 흐리게 표기한다(ia.md §1). */
export const ThesisStatusSchema = z.enum(['active', 'closed']);
export type ThesisStatus = z.infer<typeof ThesisStatusSchema>;

/** `theses[].horizon` (openapi `ThesisHorizon`). */
export const ThesisHorizonSchema = z.enum(['short', 'mid', 'long']);
export type ThesisHorizon = z.infer<typeof ThesisHorizonSchema>;

/**
 * `profile[].evidence` (openapi `WikiFactOut.evidence`, `additionalProperties: true`).
 * 자유 형식 object다. `ref`로 열 수 있는 화면이 없어(ia.md §1) `type`만 읽고 나머지는
 * 표시하지 않는다. `AiFindingEvidenceSchema`(`ai/diagnosis.ts`)와 같은 이유로 느슨하게 짠다.
 */
export const WikiEvidenceSchema = z.looseObject({
  type: z.string().nullish(),
  ref: z.string().nullish(),
});
export type WikiEvidence = z.infer<typeof WikiEvidenceSchema>;

/** 사실 한 건 (openapi `WikiFactOut`). */
export const WikiFactSchema = z.object({
  id: z.string(),
  text: z.string(),
  source: WikiSourceSchema,
  confidence: WikiConfidenceSchema,
  asOf: IsoDateTimeSchema,
  evidence: WikiEvidenceSchema,
  editable: z.boolean(),
});
export type WikiFact = z.infer<typeof WikiFactSchema>;

/** 논지 한 건 (openapi `WikiThesisOut`). */
export const WikiThesisSchema = z.object({
  id: z.string(),
  ticker: StockCodeSchema,
  text: z.string(),
  source: WikiSourceSchema,
  status: ThesisStatusSchema,
  recordedAt: IsoDateTimeSchema,
  horizon: ThesisHorizonSchema.nullable(),
  linkedTradeId: z.string().nullable(),
});
export type WikiThesis = z.infer<typeof WikiThesisSchema>;

/** `GET /wiki` 본문 (openapi `WikiContent`). 사실도 논지도 처음엔 반드시 빈 배열이다(ia.md §1). */
export const WikiContentSchema = z.object({
  profile: z.array(WikiFactSchema),
  theses: z.array(WikiThesisSchema),
});
export type WikiContent = z.infer<typeof WikiContentSchema>;

/** `GET /wiki` 응답. 다른 여섯 종과 같은 재포장 형태다(C7). */
export const WikiResponseSchema = createAiResponseSchema(WikiContentSchema);
export type WikiResponse = z.infer<typeof WikiResponseSchema>;

/**
 * `PUT /wiki/theses/{stockCode}` 요청 (openapi `ThesisIn`, 최대 500자).
 *
 * TODO(계약): `ThesisIn`은 AI 서버가 받는 스키마이고 `ticker`·`linkedTradeId`도
 * 실려 있지만, 화면은 `text`(와 `horizon`)만 사용자가 고른다 — `ticker`는 경로가
 * 이미 지목하고 `linkedTradeId`는 최초 기록(AI 스스로 호출) 전용이라 화면이 채울
 * 값이 없다. 이 둘을 요청 본문에 실제로 실어 보내야 하는지는 백엔드 중계 스펙에
 * 명문화돼 있지 않다 — 지금은 `text`·`horizon`만 보내고, 회신이 오면 이 스키마와
 * `putWikiThesis.ts`를 함께 고친다. 근거: ia.md §1 "편집·삭제 동작", contracts C75.
 */
export const UpdateWikiThesisRequestSchema = z.object({
  text: z.string().min(1).max(500),
  horizon: ThesisHorizonSchema.nullish(),
});
export type UpdateWikiThesisRequest = z.infer<
  typeof UpdateWikiThesisRequestSchema
>;

/** `PUT /wiki/theses/{stockCode}` 응답. `content`는 갱신된 논지 전체다(ia.md §1 C61). */
export const UpdateWikiThesisResponseSchema =
  createAiResponseSchema(WikiThesisSchema);
export type UpdateWikiThesisResponse = z.infer<
  typeof UpdateWikiThesisResponseSchema
>;

/** `DELETE /wiki/facts/{factId}` 본문 (openapi `DeletedFactContent`). */
export const DeletedFactContentSchema = z.object({
  id: z.string(),
  deletedAt: IsoDateTimeSchema,
});
export type DeletedFactContent = z.infer<typeof DeletedFactContentSchema>;

/** `DELETE /wiki/facts/{factId}` 응답. `content`는 `{id, deletedAt}`으로 확정됐다(ia.md §1 C61). */
export const DeleteWikiFactResponseSchema = createAiResponseSchema(
  DeletedFactContentSchema,
);
export type DeleteWikiFactResponse = z.infer<
  typeof DeleteWikiFactResponseSchema
>;
