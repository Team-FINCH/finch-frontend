import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  AiAnalysisResponseSchema,
  type AiAnalysisResponse,
} from '@/shared/types/ai/analysis';

/**
 * 종목 AI 분석 (apiSpec §10.1, `POST /ai/stocks/{stockCode}/analysis`).
 *
 * **SSE 가 아니다.** 스트리밍은 2026-08-20 커밋 `34ed34a` 로 폐기됐고
 * `shared/types/ai/envelope.ts` 가 "전송은 전부 단발 요청/응답이다. SSE 는
 * 폐기됐다(contracts C4)" 로 못박았다. `EventSource` 도 `ReadableStream` 파서도
 * 만들지 않는다 — 평범한 단발 요청이다.
 *
 * `POST` 지만 서버 상태를 바꾸지 않는 읽기라서 호출부는 뮤테이션이 아니라 쿼리로
 * 다룬다 (`useStockAnalysis`). 메서드가 동사를 정하지 않는다.
 *
 * 요청 본문에 `sections` 를 열거하지 않는다. 섹션 키 이름 일곱은 계약이 아니라
 * 소스에서 읽은 값이라(contracts P8, 이슈 #15) 여기 적으면 계약처럼 굳는다.
 */
export function postStockAnalysis(
  stockCode: string,
  signal?: AbortSignal,
): Promise<AiAnalysisResponse> {
  return request(API_PATHS.ai.analysis(stockCode), {
    method: 'POST',
    body: {},
    schema: AiAnalysisResponseSchema,
    signal,
  });
}
