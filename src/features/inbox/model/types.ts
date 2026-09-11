import { z } from 'zod';

import { IsoDateTimeSchema, StockCodeSchema } from '@/shared/types/primitives';

/**
 * 알림함 (FINCH-49, `ia.md` §1 "알림함").
 *
 * **계약 기준이다** — `docs/api/apiSpec.md` §6.4(v0.8.9, 이슈 #57). 이전 판은 계약이
 * 없어 프론트가 지어낸 스키마로 돌고 있었고, 그 사실을 이 자리에 적어 두었다.
 * 회신으로 경로·필드·상태 코드가 전부 닫혔으므로 추정 서술을 걷어냈다.
 *
 * 항목 종류 셋. **세 값 밖의 `kind` 는 서버가 내보내지 않는다**(§6.4) —
 * 종류를 늘릴 때는 apiSpec 의 표를 먼저 고친다.
 * - `record` — 적어야 할 것. 체결 후 매수 이유 기록 요청. **지금 유일하게 나온다**
 * - `wiki` — 확인해야 할 것. 위키의 AI 추측 확인. AI 추측 생성기가 없어 아직 안 온다(이슈 #52)
 * - `news` — 읽을 것. 종목 하나의 소식. 종목별 소식 원천이 정해지지 않아 아직 안 온다
 */
export const InboxItemKindSchema = z.enum(['record', 'wiki', 'news']);
export type InboxItemKind = z.infer<typeof InboxItemKindSchema>;

/**
 * 알림함 한 줄 (apiSpec §6.4 필드 표).
 *
 * **`itemId` 는 해석하지 않는 불투명 문자열이다.** `record-000660-101` 처럼 보여도
 * 쪼개 읽지 않는다 — 읽음 표시에 그대로 돌려보내는 값이다. 종목이 필요하면
 * `stockCode` 를 쓴다.
 *
 * **`title`·`summary` 는 서버가 완성해서 준다.** 화면이 다시 만들지 않는다
 * (§1.3 과 같은 원칙). 종목명을 붙이거나 문장을 조립하지 않는다.
 *
 * `stockCode`·`stockName` 은 `string | null` 이고 **`record` 만 값이 보장된다.**
 * `tradeId` 도 `record` 만 값이 있다 — 그 종목의 마지막 매수 체결(§7.1 `orderId`)을
 * 가리키고, 매수 이유를 기록할 때 **문자열로 바꿔** `linkedTradeId` 에 넣는다(§10.1).
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
  tradeId: z.number().int().nullable(),
});
export type InboxItem = z.infer<typeof InboxItemSchema>;

/**
 * `GET /inbox` 응답 (apiSpec §6.4).
 *
 * **`unreadCount` 를 뱃지에 그대로 쓴다.** 화면이 `items` 를 세지 않는다.
 * 정렬은 `createdAt` 내림차순으로 서버가 이미 해서 주고 **페이징이 없다** —
 * 항목이 보유 종목 수를 넘지 않는다. 빈 목록(`{ unreadCount: 0, items: [] }`)은
 * 에러가 아니라 정상 응답이다.
 */
export const InboxListResponseSchema = z.object({
  unreadCount: z.number().int().nonnegative(),
  items: z.array(InboxItemSchema),
});
export type InboxListResponse = z.infer<typeof InboxListResponseSchema>;
