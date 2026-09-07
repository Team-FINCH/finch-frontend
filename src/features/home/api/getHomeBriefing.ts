import { request } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  AiBriefingResponseSchema,
  type AiBriefingResponse,
} from '@/shared/types/ai/briefing';

/**
 * 데일리 브리핑 조회 (AI 명세 §8, `GET /ai/briefing`). AI 슬롯 6종 중 유일한 GET 이다(C3).
 * `date` 를 생략하면 당일이다 — 홈·브리핑 전체 화면 둘 다 당일만 본다.
 */
export function getHomeBriefing(
  signal?: AbortSignal,
): Promise<AiBriefingResponse> {
  return request(API_PATHS.ai.briefing, {
    schema: AiBriefingResponseSchema,
    signal,
  });
}
