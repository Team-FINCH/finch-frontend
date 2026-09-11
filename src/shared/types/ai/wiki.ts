import { z } from 'zod';

import { IsoDateTimeSchema, StockCodeSchema } from '@/shared/types/primitives';

import { createAiResponseSchema } from './envelope';

/**
 * AI가 이해한 나 — 위키 (`ai/docs/api-spec.md` §9 · `ai/docs/openapi.json`
 * `WikiContent`·`WikiFactOut`·`WikiThesisOut`·`DeletedFactContent`·`ThesisIn` ·
 * `frontend/docs/ia.md` §1 "AI가 이해한 나 — 위키 화면" · `contracts.md` C79·C80).
 *
 * 프론트가 부르는 경로 넷 (C80, 경로 상수는 `shared/config/apiContract.ts`
 * `API_PATHS.ai.wiki`) —
 * - `GET /api/v1/ai/wiki` — 열람
 * - `POST /api/v1/ai/wiki/theses` — 논지 신규 기록
 * - `PUT /api/v1/ai/wiki/theses/{stockCode}` — 논지 수정
 * - `DELETE /api/v1/ai/wiki/facts/{factId}` — 사실 삭제
 *
 * **`POST /wiki/theses`는 2026-09-11에 늘었다**(이슈 #56 · apiSpec v0.8.8 · C97).
 * 이전 판은 "AI 서비스가 대화 안에서 스스로 부르는 경로라 프론트가 호출하지 않는다,
 * 논지 입력 폼을 만들지 않는다"로 적었고 그때는 그것이 맞았다 — 중계 대상이 아니어서
 * 프론트에 신규 기록 경로가 아예 없었다. **`PUT`은 upsert가 아니므로**(활성 논지가
 * 없으면 서버가 거부한다) 화면은 그 종목에 논지가 있는지로 `POST`·`PUT`을 갈라 부른다.
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
  /**
   * 종목 표시명 (openapi `WikiThesisOut.name`, MR !137 신설 — 미확정 P33 해소).
   *
   * **이름을 못 찾으면 `ticker` 와 같은 값이 온다.** AI 서버가 원장에서 표시명을
   * 찾는데, 원장이 없거나 그 종목이 원장에 없으면 티커를 그 자리에 넣는다
   * (`ai/app/api/routes/wiki.py` `_thesis_names`). 그래서 화면은 `name === ticker`
   * 인 경우에 코드를 두 번 찍지 않아야 한다.
   */
  name: z.string(),
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
 * **`ticker`를 본문에 채워 보낸다 — contracts C60이 확정한 값이다.** "서버는
 * 경로의 `ticker`를 기준으로 처리하고 본문의 `ticker` 값은 무시한다. 다만 호환을
 * 위해 프론트는 본문에도 `ticker`를 채워 보낸다"(이슈 #13 회신, 2026-08-28).
 * 예전에는 이 자리에 "화면이 채울 값이 없어 보내지 않는다"는 TODO가 있었는데,
 * FINCH-28-ai-entry 작업 중 contracts.md를 다시 읽고 그 TODO가 C60을 놓친
 * 것이었음을 확인해 지웠다 — `ticker`는 호출부(`putWikiThesis.ts`)가 경로의
 * `stockCode`를 그대로 채운다.
 *
 * `linkedTradeId`(C75 — 요청 본문도 camelCase)는 여전히 선택 필드다. 논지를
 * 특정 매수 거래에 잇는 값이라 **이미 그 논지에 연결된 거래 id를 알 때만**
 * 채운다(위키 편집 화면은 수정 대상 논지의 기존 `WikiThesis.linkedTradeId`를
 * 그대로 넘긴다) — 새로 지어내지 않는다. 근거: ia.md §1 "편집·삭제 동작".
 */
export const UpdateWikiThesisRequestSchema = z.object({
  ticker: StockCodeSchema,
  text: z.string().min(1).max(500),
  horizon: ThesisHorizonSchema.nullish(),
  linkedTradeId: z.string().nullish(),
});
export type UpdateWikiThesisRequest = z.infer<
  typeof UpdateWikiThesisRequestSchema
>;

/** 화면이 실제로 고르는 값 — `ticker`는 호출부가 경로에서 채운다. */
export type UpdateWikiThesisInput = Omit<UpdateWikiThesisRequest, 'ticker'>;

/**
 * `POST /wiki/theses` 요청 (openapi `ThesisIn`). **`PUT`과 같은 모델이다** — 서버가
 * 두 경로에 같은 `ThesisIn`을 쓴다(`ai/app/api/routes/wiki.py`). 그래서 스키마를
 * 새로 짜지 않고 이름만 따로 둔다. 이름을 나누는 이유는 호출부가 어느 계약을 쓰는지
 * 읽히게 하려는 것이고, 서버가 둘을 갈라 놓으면 여기서부터 갈린다.
 *
 * **`ticker`의 무게가 `PUT`과 다르다.** `PUT`은 경로의 `{stockCode}`로 처리하고 본문의
 * `ticker`를 무시하지만(C60), 이쪽은 **경로에 종목이 없어 본문의 `ticker`가 종목을
 * 정하는 유일한 값**이다. 빠지면 `400 INVALID_REQUEST`다.
 */
export const CreateWikiThesisRequestSchema = UpdateWikiThesisRequestSchema;
export type CreateWikiThesisRequest = z.infer<
  typeof CreateWikiThesisRequestSchema
>;

/** 화면이 실제로 고르는 값 — `ticker`는 호출부(`postWikiThesis.ts`)가 채운다. */
export type CreateWikiThesisInput = Omit<CreateWikiThesisRequest, 'ticker'>;

/** `PUT /wiki/theses/{stockCode}` 응답. `content`는 갱신된 논지 전체다(ia.md §1 C61). */
export const UpdateWikiThesisResponseSchema =
  createAiResponseSchema(WikiThesisSchema);
export type UpdateWikiThesisResponse = z.infer<
  typeof UpdateWikiThesisResponseSchema
>;

/**
 * `POST /wiki/theses` 응답. `PUT`과 같은 논지 한 건이다(apiSpec §10.1).
 *
 * **응답은 성공 여부를 읽는 데만 쓴다** — 화면은 이 값을 상태로 옮기지 않고
 * `GET /wiki`를 재조회한다(ia.md §1). `POST`는 같은 종목의 기존 활성 논지를
 * `closed`로 닫고 새로 남기므로(교체) 목록 전체가 달라질 수 있어, 재조회 쪽이
 * 이 응답 한 건으로 목록을 기우는 것보다 싸고 정확하다.
 */
export const CreateWikiThesisResponseSchema =
  createAiResponseSchema(WikiThesisSchema);
export type CreateWikiThesisResponse = z.infer<
  typeof CreateWikiThesisResponseSchema
>;

/**
 * 사실을 지운 이유 (openapi `DeleteReason`, MR !140 신설).
 *
 * `user_deleted` 는 확정된 사실을 사용자가 지운 것이고, `guess_rejected` 는 AI
 * 추측에 **"아니에요"** 라고 답한 것이다. 서버는 아직 기록만 한다 — 추측 생성기가
 * 없어서 이 값을 되먹일 곳이 없다(이슈 #41).
 */
export const WikiDeleteReasonSchema = z.enum([
  'user_deleted',
  'guess_rejected',
]);
export type WikiDeleteReason = z.infer<typeof WikiDeleteReasonSchema>;

/** `DELETE /wiki/facts/{factId}` 본문 (openapi `DeletedFactContent`). */
export const DeletedFactContentSchema = z.object({
  id: z.string(),
  deletedAt: IsoDateTimeSchema,
  /** 삭제 사유 (MR !140 에서 필수 필드가 됐다). */
  reason: WikiDeleteReasonSchema,
});
export type DeletedFactContent = z.infer<typeof DeletedFactContentSchema>;

/** `DELETE /wiki/facts/{factId}` 응답. `content`는 `{id, deletedAt}`으로 확정됐다(ia.md §1 C61). */
export const DeleteWikiFactResponseSchema = createAiResponseSchema(
  DeletedFactContentSchema,
);
export type DeleteWikiFactResponse = z.infer<
  typeof DeleteWikiFactResponseSchema
>;
