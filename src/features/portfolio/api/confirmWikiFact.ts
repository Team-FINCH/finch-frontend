import { request, toAiResult, type AiResult } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import { createAiResponseSchema } from '@/shared/types/ai/envelope';
import { WikiFactSchema, type WikiFact } from '@/shared/types/ai/wiki';

/**
 * `POST /ai/wiki/facts/{factId}/confirm` — AI 추측을 사실로 **승격**한다
 * (카드의 `맞아요`).
 *
 * **계약이 없다. 경로도 응답 모양도 프론트 추정값이고 지금은 MSW 만 답한다**
 * (FINCH-246 · GitLab 이슈 #26 2번 · #41 회신 대기). 알림함을 만들 때와 같은
 * 방식이다 — 목으로 흉내 내 화면을 끝까지 만들어 두고, 경로가 열리면 이 파일과
 * `mocks/handlers/wiki.ts` 의 핸들러만 갈아 끼운다. 화면 코드는 이 함수 하나만
 * 보므로 바뀌는 범위가 여기서 멈춘다.
 *
 * **응답 스키마를 `shared/types/ai/wiki.ts` 에 두지 않았다.** 그 파일은 확정된
 * 계약(openapi 에서 직접 읽은 것)만 담는 자리다. 아직 서버에 없는 것을 그 옆에
 * 끼워 두면 다음 사람이 둘을 구별할 수 없다. 승격 결과가 `WikiFactOut` 한 건이라는
 * 것만 확정 스키마(`WikiFactSchema`)를 재사용해 적고, 껍데기만 여기에 둔다.
 *
 * **승격된 문장을 프론트가 만들지 않는다.** 물음표 문장(`…편인가요?`)을 평서문
 * (`…편이다.`)으로 바꾸는 것은 서버 몫이다 — 어미가 다양해 정규식 규칙이 금방
 * 샌다. 화면은 응답의 `text` 를 그대로 그린다(그 변환을 흉내 내는 코드는 목
 * 안에만 있다).
 */
const ConfirmWikiFactResponseSchema = createAiResponseSchema(WikiFactSchema);

export function confirmWikiFact(
  factId: string,
  signal?: AbortSignal,
): Promise<AiResult<WikiFact>> {
  return request(API_PATHS.ai.wiki.confirmFact(factId), {
    method: 'POST',
    schema: ConfirmWikiFactResponseSchema,
    signal,
  }).then(toAiResult);
}
