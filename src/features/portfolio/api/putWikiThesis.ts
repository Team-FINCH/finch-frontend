import { request, toAiResult, type AiResult } from '@/shared/api';
import { API_PATHS } from '@/shared/config/apiContract';
import {
  UpdateWikiThesisResponseSchema,
  type UpdateWikiThesisInput,
  type UpdateWikiThesisRequest,
  type WikiThesis,
} from '@/shared/types/ai/wiki';
import { type StockCode } from '@/shared/types/primitives';

/**
 * `PUT /ai/wiki/theses/{stockCode}` (contracts C80). 논지 수정.
 *
 * **2026-09-07부터 호출하는 곳이 생겼다** — 위키 탭 "종목별 매수 이유"의 종목
 * 행에서 여는 논지 수정 시트(`features/portfolio/components/ThesisEditSheet.tsx`,
 * FINCH-28-ai-entry)가 이 함수를 부른다. 그 전까지는 "기록 수정하기"
 * 버튼이 알림함(`/inbox`)으로 이동하기만 해서 어느 화면도 부르지 않았다.
 *
 * **요청 본문에 `ticker`를 채운다.** `stockCode`(경로)와 같은 값이고, 서버가
 * 본문의 `ticker`를 무시한다는 걸 알면서도 호환을 위해 채운다(contracts C60) —
 * 호출부가 `ticker`를 따로 넘기지 않도록 여기서 `stockCode`를 그대로 채워 준다.
 */
export function putWikiThesis(
  stockCode: StockCode,
  input: UpdateWikiThesisInput,
  signal?: AbortSignal,
): Promise<AiResult<WikiThesis>> {
  const body: UpdateWikiThesisRequest = { ticker: stockCode, ...input };
  return request(API_PATHS.ai.wiki.updateThesis(stockCode), {
    method: 'PUT',
    body,
    schema: UpdateWikiThesisResponseSchema,
    signal,
  }).then(toAiResult);
}
