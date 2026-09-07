import { type AiResponseMeta } from '@/shared/types/ai/envelope';

/**
 * AI 재포장 응답의 정규화 어댑터 (`frontConvention.md` §5 "정규화 어댑터").
 *
 * 백엔드가 재포장한 뒤에도 응답은 `{content: {...}, requestId, dataAsOf, citations,
 * disclaimer}` 모양이다(contracts C7). Zod 스키마(`createAiResponseSchema`)는 이
 * 모양 그대로 검증하지만, **화면 컴포넌트가 매번 `response.content`를 벗기게 두면
 * 봉투 모양이 컴포넌트까지 새어 나간다** — "화면 컴포넌트는 값이 어느 엔드포인트에서
 * 왔는지 몰라야 한다"(§5)를 어긴다.
 *
 * 이 함수가 그 자리 한 곳이다. `content`의 필드를 최상위로 펼치고, 보존 필드 넷은
 * `aiMeta`로 묶어 따로 둔다 — 화면 본문과 피드백·근거·기준 시각처럼 성격이 다른
 * 값을 한 객체에 뭉개지 않기 위해서다. AI 응답을 쓰는 모든 쿼리 훅은 이 함수 하나를
 * 거쳐야 한다. **feature마다 다시 만들지 않는다**(§5 "어댑터는 shared/api에만 둔다").
 */
export type AiResult<TContent> = TContent & { aiMeta: AiResponseMeta };

export function toAiResult<TContent extends object>(
  response: { content: TContent } & AiResponseMeta,
): AiResult<TContent> {
  const { content, requestId, dataAsOf, citations, disclaimer } = response;
  return {
    ...content,
    aiMeta: { requestId, dataAsOf, citations, disclaimer },
  };
}
