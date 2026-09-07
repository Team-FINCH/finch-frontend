import { z } from 'zod';

import { IsoDateTimeSchema, StockCodeSchema } from '@/shared/types/primitives';

/**
 * 알림함 (FINCH-49, `ia.md` §1 "알림함").
 *
 * **이 파일 전체가 프론트 추정 스키마다. 백엔드 계약이 없다** — GitLab 이슈 #26
 * 1번으로 목록 조회(항목 종류·제목·요약·연결 대상·미읽음 여부·미읽음 개수)와
 * 읽음·처리 표시를 물어 두고 회신 대기 중이다. 회신이 오면 이 파일을 계약 기준으로
 * 다시 짠다 — 지금은 프로토타입(`isMail` 블록)과 PRD 정의를 근거로 그렸다.
 *
 * 항목 종류 셋 (PRD 정의 그대로):
 * - `record` — 적어야 할 것. 체결 후 매수 이유 기록 요청
 * - `wiki` — 확인해야 할 것. 위키의 AI 추측("~하신 것으로 보이는데 맞나요?") 확인
 * - `briefing` — 읽을 것. 데일리 브리핑
 */
export const InboxItemKindSchema = z.enum(['record', 'wiki', 'briefing']);
export type InboxItemKind = z.infer<typeof InboxItemKindSchema>;

/**
 * 알림함 한 줄 (추정). `stockCode`·`stockName` 은 `record`·`wiki` 항목에서만
 * 값이 있고 `briefing` 항목은 `null` 이다 — 브리핑은 종목 하나가 아니라
 * 여러 종목을 묶은 요약이라서다.
 */
export const InboxItemSchema = z.object({
  itemId: z.string(),
  kind: InboxItemKindSchema,
  title: z.string(),
  summary: z.string(),
  unread: z.boolean(),
  createdAt: IsoDateTimeSchema,
  stockCode: StockCodeSchema.nullable(),
  stockName: z.string().nullable(),
});
export type InboxItem = z.infer<typeof InboxItemSchema>;

/** `GET /inbox` 응답 (추정). `unreadCount` 는 홈 뱃지 숫자로 그대로 쓴다. */
export const InboxListResponseSchema = z.object({
  unreadCount: z.number().int().nonnegative(),
  items: z.array(InboxItemSchema),
});
export type InboxListResponse = z.infer<typeof InboxListResponseSchema>;

/**
 * `POST /inbox/{itemId}/record` 요청 (추정). `record` 항목의 "왜 담으셨나요?" 시트
 * (프로토타입 `sheetRecord`)가 쓴다.
 *
 * **위키(`ai/wiki/theses`)와는 다른 경로다.** 위키 쪽 투자 논지는 대화에서만
 * 기록된다는 것이 확정 사실이라(`ia.md` §1 "AI가 이해한 나" 절, "논지 입력 폼을
 * 만들지 않는다") 이 시트가 그 경로로 이어지지 않는다. 매수 이유 기록이 실제로는
 * 어디로 가야 하는지(위키 논지로 합류하는지, 별도 저장인지)도 이슈 #26 회신 대기다.
 */
export const RecordInboxItemRequestSchema = z.object({
  reason: z.string().min(1).max(500),
});
export type RecordInboxItemRequest = z.infer<
  typeof RecordInboxItemRequestSchema
>;
