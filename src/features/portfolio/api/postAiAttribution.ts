import { request, toAiResult, type AiResult } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  AiAttributionResponseSchema,
  type AiAttributionContent,
  type AiAttributionPeriod,
} from '@/shared/types/ai/attribution';

/**
 * `POST /ai/portfolio/attribution` (AI 슬롯 2번, ia.md §4).
 *
 * `period` 는 서버가 `1d`·`1w`·`1m`·`3m`·`ytd` 다섯을 처리한다 (`Period` enum ·
 * `_period_start()`). 생략하면 서버 기본값 `1d` 지만 **명시해서 보낸다** — 화면에
 * 기간 선택이 생겨 무엇을 고른 결과인지가 요청에 남아야 한다.
 *
 * `benchmark` 는 받기만 하고 쓰이지 않아 보내지 않는다(C56) — 벤치마크는 항상 보유
 * 종목 유니버스를 시가총액으로 합성한 시장 전체라 무엇을 보내든 결과가 같다.
 * 벤치마크 선택 UI 를 만들지 않는다.
 *
 * 보유 종목이 0개면 `409 INSUFFICIENT_DATA` 다(정상 거절, contracts C12).
 * 고른 기간에 거래일이 하나도 없을 때도 같은 코드로 온다.
 */
export function postAiAttribution(
  period: AiAttributionPeriod,
  signal?: AbortSignal,
): Promise<AiResult<AiAttributionContent>> {
  return request(API_PATHS.ai.attribution, {
    method: 'POST',
    body: { period },
    schema: AiAttributionResponseSchema,
    signal,
  }).then(toAiResult);
}
