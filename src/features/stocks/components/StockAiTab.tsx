import { isHttpError } from '@/shared/api';
import { formatKstTime } from '@/shared/lib/formatDate';
import { AiCard } from '@/shared/ui/AiCard';
import { AiStatus } from '@/shared/ui/AiStatus';
import { Skeleton } from '@/shared/ui/Skeleton';

import { useStockAnalysis } from '../api/useStockAnalysis';

import { AiCitationList } from './AiCitationList';
import { AiFeedbackRow } from './AiFeedbackRow';

/**
 * AI 분석 탭 (프로토타입 `isDtAi` 블록, ia.md §4 슬롯 3번).
 *
 * ## 본문을 그리지 않는 이유
 *
 * **응답의 `content` 가 빈 객체다.** `AnalysisSection` 이 `ai/docs/openapi.json` 에
 * `{"additionalProperties": true, "type": "object"}` 로 떨어져 있어 구현 스키마가 키를
 * 하나도 알려주지 않는다 (이슈 #15, contracts P8). 계약 원장이 "AI 파트 문서와 어긋나면
 * 구현이 맞다" 로 정했으므로 문서 §3 예시를 보고 손으로 섹션 키를 적으면 **틀린 것을
 * 계약처럼 굳히는 것**이 된다 (`shared/types/ai/analysis.ts` 가 같은 이유로 본문
 * 스키마를 만들지 않았다).
 *
 * 그래서 재포장 뒤에도 보존이 확정된 넷만 그린다 —
 * `requestId` · `dataAsOf` · `citations` · `disclaimer` (apiSpec §10.3, contracts C7).
 *
 * TODO(계약): AI 종목 분석 본문(`content`)의 키 구성이 미확정이라 서술 섹션을 그리지
 * 못한다. 섹션 키 후보 일곱(`current`·`changes`·`attention`·`risks`·`my_impact`·
 * `thesis_check`·`next_events`)도 계약이 아니라 소스에서 읽은 값이다. 계약이 오면
 * `shared/types/ai/analysis.ts` 를 채우고 이 파일에 섹션 렌더를 붙인다.
 * 그때 지킬 것 — 섹션 제목을 화면이 짓지 않고 응답의 `title` 을 그대로 쓰며(ia.md:447),
 * `null` 섹션은 자리를 비운다(ia.md:452). 문장은 `text` 하나로 렌더되고 `segments` 는
 * 등락 색·강조가 필요할 때만 순회한다(ia.md §4).
 * — 근거: contracts P8 · ia.md §4:433~454 / 이슈 #15
 *
 * ## 실패 자리
 *
 * 재시도 버튼을 낼지는 **코드가 정한다** — `AiStatus` 가 `isRetryableAiErrorCode` 로
 * 판정하므로 여기서 따로 고르지 않는다 (ia.md §4).
 * **실패·데이터 부족 자리에는 피드백을 붙이지 않는다** (design.md §10 · ia.md §4).
 */
type StockAiTabProps = {
  stockCode: string;
  /** AI 탭이 열려 있을 때만 부른다 — 안 그러면 차트만 보는 사람에게 AI 요금이 나간다. */
  isActive: boolean;
};

export function StockAiTab({ stockCode, isActive }: StockAiTabProps) {
  const analysis = useStockAnalysis(stockCode, isActive);

  if (analysis.isPending) {
    return (
      <div className="mt-6">
        <AiCard label="AI 종목 분석" headline="공시와 뉴스를 확인하고 있어요.">
          {/* AiCard 는 onClick 이 없으면 <section> 으로 나온다. Skeleton 이 <div> 라
              <span> 안에 넣으면 HTML 이 깨진다 — 그래서 여기만 div 로 감싼다. */}
          <div className="mt-4">
            <Skeleton className="mb-2.5 h-3.5 w-[92%]" />
            <Skeleton className="mb-2.5 h-3.5 w-[76%]" />
            <Skeleton className="h-3.5 w-[86%]" />
          </div>
        </AiCard>
      </div>
    );
  }

  if (analysis.isError) {
    const error = analysis.error;
    const code = isHttpError(error) ? error.code : undefined;
    // 문구는 서버가 완성해 준 message 를 쓴다 (컨벤션 §5). 화면이 다시 짓지 않는다.
    const message = isHttpError(error)
      ? error.message
      : '잠시 후 다시 시도해 주세요.';

    return (
      <AiStatus
        code={code ?? undefined}
        title="분석을 불러오지 못했어요"
        description={message}
        onRetry={() => void analysis.refetch()}
      />
    );
  }

  const { requestId, dataAsOf, citations, disclaimer } = analysis.data;

  /**
   * 기준 시각. AI 명세 §2.2 가 "UI 에 반드시 노출한다" 로 적었다 —
   * 시세는 지연될 수 있어 생성 시각과 따로 관리한다. 다섯 원천 중 읽지 않은 것은
   * 키가 빠지는 것이 아니라 `null` 이라(contracts C54) 값이 있는 것만 고른다.
   */
  const asOfLabel = dataAsOf.filings ?? dataAsOf.price ?? null;

  return (
    <div className="mt-6">
      <AiCard
        label="AI 종목 분석"
        headline="분석 본문을 준비하고 있어요."
        caption={
          asOfLabel === null ? undefined : `${formatKstTime(asOfLabel)} 기준`
        }
      >
        <span className="mt-3 block text-body-2 text-ai-text-secondary">
          이 종목의 분석 내용은 아직 연결되지 않았어요. 근거와 기준 시각은
          아래에서 확인할 수 있어요.
        </span>
      </AiCard>

      <AiCitationList citations={citations} />

      {/* disclaimer 는 하드코딩하지 않고 응답 값을 그대로 쓴다 — 규제 문구가 바뀌면
          서버만 고치게 하기 위해서다 (envelope.ts 주석). */}
      <p className="mt-5 text-caption leading-5 text-text-muted">
        {disclaimer}
      </p>

      <AiFeedbackRow requestId={requestId} />
    </div>
  );
}
