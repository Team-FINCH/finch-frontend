import { type z } from 'zod';

import { request, toAiResult, type AiResult } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  AiOrderPreviewRequestSchema,
  AiOrderPreviewResponseSchema,
  type AiOrderPreviewContent,
} from '@/shared/types/ai/orderPreview';

/**
 * 요청의 **입력** 타입.
 *
 * 브랜드는 출력 타입에만 붙어서 `ticker` 가 `string & $brand<'StockCode'>` 다. 라우트
 * 파라미터는 평범한 `string` 이라 그대로 넣을 수 없고, 캐스팅으로 브랜드를 위조하면
 * 검증을 건너뛴 값이 그대로 나간다. `postOrder` 와 같은 방식으로 입력을 받아 아래에서
 * 스키마를 통과시킨다.
 */
export type AiOrderPreviewRequestInput = z.input<
  typeof AiOrderPreviewRequestSchema
>;

/**
 * 주문 전 점검 (apiSpec §10.1, `POST /ai/orders/preview`, AI 슬롯 4번).
 *
 * **읽기다.** 주문을 넣지 않는다 — 체결을 가정한 포트폴리오에 진단 엔진을 다시 돌린
 * 차분만 돌려준다(AI 명세 §7). 그래서 `POST` 지만 호출부는 뮤테이션이 아니라 쿼리로
 * 다룬다(`useAiOrderPreview`). `postStockAnalysis` 와 같은 이유다.
 *
 * **예수금이 모자라도 에러가 아니다.** `feasible: false` + `shortfall` 이 200 응답의
 * 본문으로 온다(AI 명세 §7). 에러 분기로 처리하면 화면이 그려지지 않는다.
 *
 * **SSE 가 아니다.** 스트리밍은 커밋 `34ed34a` 로 폐기됐다(contracts C4).
 */
export function postAiOrderPreview(
  input: AiOrderPreviewRequestInput,
  signal?: AbortSignal,
): Promise<AiResult<AiOrderPreviewContent>> {
  const body = AiOrderPreviewRequestSchema.parse(input);

  return request(API_PATHS.ai.orderPreview, {
    method: 'POST',
    body,
    schema: AiOrderPreviewResponseSchema,
    signal,
  }).then(toAiResult);
}
