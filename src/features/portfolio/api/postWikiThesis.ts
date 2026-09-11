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
 * **`linkedTradeId` 는 선택이고 문자열이다.** 논지를 특정 매수 체결에 잇는 값이라
 * **이미 그 id 를 아는 호출부만** 채운다 — 위키 탭은 넘길 값이 없어 보내지 않는다.
 * 알림함의 `record` 항목이 주는 체결 id 는 숫자(§7.1 `orderId`)라 **문자열로 바꿔
 * 넘겨야 한다**(apiSpec §10.1 — AI 쪽 필드가 문자열이다). 여기서 숫자를 받아 변환해
 * 주지 않는 이유는 그러면 호출부와 여기 두 곳에서 변환이 일어나기 때문이다.
 *
 * **본문 검증을 여기서 다시 하지 않는다.** `ticker`·`text` 누락이나 500자 초과는
 * AI 의 `400 INVALID_REQUEST` 가 그대로 내려오고(apiSpec §11.2) 화면이 그 `message`
 * 를 띄운다. 프론트에 같은 규칙을 한 벌 더 두면 둘이 어긋날 때 사용자가 서버에
 * 닿지도 못한다.
 */
export function postWikiThesis(
  stockCode: StockCode,
  /** `text` 는 필수, `horizon`·`linkedTradeId` 는 선택이다. */
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
