import { z } from 'zod';

import {
  IsoDateSchema,
  IsoDateTimeSchema,
  StockCodeSchema,
  UnitIntervalSchema,
} from '@/shared/types/primitives';

import { AiSegmentSchema, createAiResponseSchema } from './envelope';

/**
 * 데일리 브리핑 (`ai/docs/api-spec.md` §8 데일리 브리핑, `GET /ai/briefing`).
 *
 * **AI 중계 7종 가운데 이것만 GET 이다**(C3). 배치 생성 결과를 조회할 뿐 생성 트리거가 아니다.
 * `date` 를 생략하면 당일이다.
 */

/**
 * 브리핑 상태 (AI 명세 §8).
 *
 * - `ready` — 정상 표시
 * - `empty` — 보유 종목이 없거나 내보낼 항목이 없다. `items` 가 빈 배열이고 **오류가 아니다.**
 *   빈 상태 문구를 보여준다 — 프로토타입의 `aiShort` 상태가 "아직 모을 소식이 없어요"를 표시한다(2026-09-07 확인)
 * - `generating` — **현재 구현은 이 값을 내보내지 않는다**(C56). 요청 시점에 생성하기 때문이다.
 *   그래서 **스켈레톤 + 30초 뒤 재조회 경로를 만들지 않는다.** 값은 스키마에 남겨 둔다 —
 *   배치가 붙으면 다시 나오고, 그때 파싱이 깨지지 않아야 한다
 */
export const AiBriefingStatusSchema = z.enum(['ready', 'generating', 'empty']);
export type AiBriefingStatus = z.infer<typeof AiBriefingStatusSchema>;

/** `items[].category` 의 확인된 값 (AI 명세 §8). */
export const AI_BRIEFING_CATEGORIES = [
  'holding_move',
  'earnings',
  'filing',
  'macro_event',
  'portfolio_shift',
] as const;
export type AiBriefingCategory = (typeof AI_BRIEFING_CATEGORIES)[number];

/**
 * `items[].eventType` 의 확인된 값 (AI 명세 §8, GitLab 이슈 `#68` 회신).
 * 원본 EventType 이며 `category` 와는 다른 분류다 — `category` 는 브리핑 항목이
 * 뽑힌 이유(보유 등락·실적·공시·거시·포트폴리오 변화)이고 `eventType` 은 그 항목이
 * 실제 이벤트라면 어떤 종류인지다. 보유 등락·업종 변화처럼 이벤트가 아닌 항목은
 * `eventType` 이 `null` 이다.
 *
 * **스키마에서는 이 배열로 값을 좁히지 않는다.** 화면에서 한글 라벨을 고를 때만
 * 참조한다(`AiBriefingItemSchema.eventType` 주석 참고).
 */
export const AI_BRIEFING_EVENT_TYPES = [
  'earnings',
  'filing',
  'dividend',
  'macro',
  'product',
] as const;
export type AiBriefingEventType = (typeof AI_BRIEFING_EVENT_TYPES)[number];

/**
 * 브리핑 항목 (AI 명세 §8). 최대 4건이다.
 *
 * `relevanceScore` 는 LLM 이 아니라 규칙 엔진이 매긴다.
 */
export const AiBriefingItemSchema = z.object({
  rank: z.number().int().positive(),
  category: z.string(),
  relevanceScore: UnitIntervalSchema,
  title: z.string(),
  text: z.string(),
  segments: z.array(AiSegmentSchema),
  relatedTickers: z.array(StockCodeSchema),
  /** 화면 내 이동 경로 (`/stocks/000660?tab=ai`). 라우터 경로와 대조해서 쓴다 */
  deeplink: z.string(),
  /**
   * 근거 ID 목록 (AI 명세 §8, GitLab 이슈 `#86`). `AiCitationSchema` 객체 배열이
   * **아니다** — 봉투 최상위 `citations`(`AiResponseMeta.citations`)에 실린
   * 객체를 가리키는 ID 문자열 배열이다. 예: 항목 안쪽은 `["cit_1"]`, 최상위엔
   * `{ id: "cit_1", ... }` 이 있다. 출처 객체가 필요하면 이 ID 를 최상위
   * `citations` 에서 찾아 매핑한다.
   *
   * 이전 주석은 "citations 는 항상 빈 배열이다(C56)" 라고 적었는데 더는
   * 사실이 아니다 — 운영에서 값이 채워진 배열이 내려오면서 객체 배열을
   * 기대하던 옛 스키마가 `invalid_type` 으로 브리핑 전체를 깨뜨렸다. 원소
   * 하나가 어긋나 배열 전체가 파싱 실패로 사라지는 자리는 검색
   * (FINCH-255)·관심종목(FINCH-265)과 같다.
   */
  citations: z.array(z.string()),
  /**
   * 이벤트 종류(AI 명세 §8, GitLab `#68`). 이벤트가 아닌 보유 등락·업종 변화는
   * `null` 이다.
   *
   * **계약은 `nullable`(항상 포함)이라고 적었지만 `nullish` 로 넓게 받는다.**
   * 같은 문단이 "이 키가 없는 기존 캐시는 재생성한다"고도 적었다 — 재생성 전
   * 캐시에는 키 자체가 빠질 수 있다. `items` 는 배열이라 원소 하나만 이 검증에
   * 걸려도 브리핑 전체가 파싱에 실패한다 — 검색(FINCH-255)과 관심 종목
   * (FINCH-265)에서 이미 겪은 자리다.
   *
   * **`z.enum(AI_BRIEFING_EVENT_TYPES)` 로 좁히지 않는다.** 모르는 값이 오면
   * 그 원소가 통째로 버려져 배열이 줄어드는 대신 브리핑 자체가 파싱 실패로
   * 사라진다. 알려진 값은 `AI_BRIEFING_EVENT_TYPES` 로만 두고, 화면에서
   * 모르는 값은 그냥 무시한다.
   */
  eventType: z.string().nullish(),
  /**
   * 연결된 원문 Document 의 표시용 출처(언론사명, AI 명세 §8). 문서가 없거나
   * 삭제됐거나 publisher 가 없으면 `null` 이다. `eventType` 과 같은 이유로
   * `nullish` 로 받는다.
   */
  publisher: z.string().nullish(),
});
export type AiBriefingItem = z.infer<typeof AiBriefingItemSchema>;

/**
 * 데일리 브리핑 본문 (AI 명세 §8 Response — content).
 *
 * 네 키는 항상 실려 나온다. 조회 시 `date` 를 주지 않았고 기준 거래일도 못 잡았으면
 * `date` 가 `null` 일 수 있다.
 *
 * **봉투와 이름이 겹치지 않는다** — 봉투에도 응답 생성 시각 `generated_at` 이 있었지만
 * 재포장 시 걷어내고(GitLab 이슈 #10 5번 회신, 2026-09-02), `content` 는 컨테이너째 남으므로
 * (이슈 #22 회신) 이 배치 생성 시각은 `content.generatedAt` 자리에 그대로 있다.
 */
export const AiBriefingContentSchema = z.object({
  date: IsoDateSchema.nullable(),
  status: AiBriefingStatusSchema,
  generatedAt: IsoDateTimeSchema,
  items: z.array(AiBriefingItemSchema),
});
export type AiBriefingContent = z.infer<typeof AiBriefingContentSchema>;

/** `GET /ai/briefing` 쿼리 (AI 명세 §8). 생략하면 당일이다. */
export const AiBriefingQuerySchema = z.object({
  date: IsoDateSchema.nullish(),
});
export type AiBriefingQuery = z.infer<typeof AiBriefingQuerySchema>;

/** GET /ai/briefing 응답. 본문에 보존 필드가 함께 실린다 (apiSpec §10.3). */
export const AiBriefingResponseSchema = createAiResponseSchema(
  AiBriefingContentSchema,
);
export type AiBriefingResponse = z.infer<typeof AiBriefingResponseSchema>;
