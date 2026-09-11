import { request, toAiResult, type AiResult } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  CreateWikiThesisResponseSchema,
  type CreateWikiThesisInput,
  type CreateWikiThesisRequest,
  type WikiThesis,
} from '@/shared/types/ai/wiki';
import { type StockCode } from '@/shared/types/primitives';

/**
 * `POST /ai/wiki/theses` (contracts C97). 논지 **신규** 기록.
 *
 * `putWikiThesis.ts` 의 짝이다. 둘이 나뉜 이유는 하나뿐이다 — **`PUT` 은 upsert 가
 * 아니다.** 활성 논지가 없는 종목에 `PUT` 을 보내면 서버가 `InvalidRequest` 를
 * 던진다(`ai/app/wiki/store.py` `update_active_thesis`). 그래서 화면은 같은 시트를
 * 쓰더라도 그 종목에 논지가 있는지로 경로를 갈라 부른다.
 *
 * **경로에 종목이 없다.** `PUT` 은 `{stockCode}` 를 경로로 받고 본문의 `ticker` 를
 * 무시하지만(C60), 이쪽은 **본문의 `ticker` 가 종목을 정하는 유일한 값**이다.
 * 그래서 `stockCode` 를 첫 인자로 받아 호출부가 `ticker` 를 따로 챙기지 않게 한다 —
 * 두 함수의 호출 모양을 맞추려는 것이기도 하다.
 *
 * **멱등이 아니다.** 같은 종목에 활성 논지가 있으면 서버가 그것을 `closed` 로 닫고
 * 새로 남긴다(교체, apiSpec §10.1). 실패하지는 않지만 이력이 한 줄 는다 — 고칠
 * 때는 `PUT` 을 쓴다.
 *
 * **본문 검증을 여기서 다시 하지 않는다.** `ticker`·`text` 누락이나 500자 초과는
 * AI 의 `400 INVALID_REQUEST` 가 그대로 내려오고(apiSpec §11.2) 화면이 그 `message`
 * 를 띄운다. 프론트에 같은 규칙을 한 벌 더 두면 둘이 어긋날 때 사용자가 서버에
 * 닿지도 못한다.
 */
export function postWikiThesis(
  stockCode: StockCode,
  input: CreateWikiThesisInput,
  signal?: AbortSignal,
): Promise<AiResult<WikiThesis>> {
  const body: CreateWikiThesisRequest = { ticker: stockCode, ...input };
  return request(API_PATHS.ai.wiki.createThesis, {
    method: 'POST',
    body,
    schema: CreateWikiThesisResponseSchema,
    signal,
  }).then(toAiResult);
}
