import { isHttpError } from '@/shared/api';
import { formatKstTime } from '@/shared/lib/formatDate';
import {
  AI_ANALYSIS_SECTION_KEYS,
  type AiAnalysisSection,
} from '@/shared/types/ai/analysis';
import { AiCard } from '@/shared/ui/AiCard';
import { AiCitationList } from '@/shared/ui/AiCitationList';
import { AiFeedbackRow } from '@/shared/ui/AiFeedbackRow';
import { AiSegmentText } from '@/shared/ui/AiSegmentText';
import { AiStatus } from '@/shared/ui/AiStatus';
import { Skeleton } from '@/shared/ui/Skeleton';

import { useStockAnalysis } from '../api/useStockAnalysis';

/**
 * AI 분석 탭 (프로토타입 `isDtAi` 블록, ia.md §4 슬롯 3번).
 *
 * ## 본문을 그린다 — 무엇을 근거로 어떻게
 *
 * 섹션 일곱(`current`·`changes`·`attention`·`risks`·`myImpact`·`thesisCheck`·
 * `nextEvents`)의 키 구성이 `ai/docs/openapi.json` 으로 확정됐다(이슈 #15 닫힘,
 * contracts C57~C59). 스키마와 그 근거는 `shared/types/ai/analysis.ts` 에 있다.
 *
 * 지키는 규약 넷이다.
 * - **섹션 제목을 화면이 짓지 않고 응답의 `title` 을 그대로 쓴다**(ia.md:447).
 *   `title` 이 없으면 **제목을 그리지 않는다.** 키 이름(`myImpact` 등)을 한국어로
 *   옮겨 제목으로 쓰면 AI 가 제목을 바꿀 때 화면이 못 따라간다
 * - **`null` 섹션은 자리를 비운다**(ia.md:452). 접힌 카드도 "정보 없음" 박스도
 *   만들지 않는다 — 미보유 종목에서 개인화 섹션 둘이 빠지는 것이 정상 상태다
 * - **문장은 `text` 하나로 렌더된다.** `segments` 는 이어 붙이면 `text` 와 정확히
 *   일치하므로(C55) 둘 다 그리면 같은 문장이 두 번 나온다. 수치 강조가 필요할 때만
 *   `segments` 를 순회하고, 조각이 없으면 `text` 를 그대로 쓴다
 * - **표시 순서는 화면이 정한다** — 응답이 객체라 순서가 없다(ia.md §4).
 *   순서는 `AI_ANALYSIS_SECTION_KEYS` 한 곳에 있다
 *
 * ## 왜 검정 카드에 `current` 하나만 넣나
 *
 * design.md §8.3 `AIDetail` 이 **"상세 분석 전체를 하나의 Dark Card에 넣지 않는다"**
 * 와 "기본 Background 위 Flat Section" 을 못박았다. 프로토타입도 AI 탭 맨 위에
 * 검정 카드 하나를 두고 그 아래를 평면 섹션으로 쌓는다. `current` 가 그 자리인
 * 근거는 ia.md §4 가 이 섹션에 기획서의 차별점("현재 가격이 왜 비싸거나 싼지")을
 * 걸어 둔 것이다. `current` 가 없으면 검정 카드는 공통 AI 헤더(§8.4)와 기준 시각만
 * 담는다.
 *
 * **지표 표를 만들지 않는다**(ia.md §4 ★). PER·PBR 을 숫자로 나열하는 순간
 * 기획서가 피하려던 화면이 그대로 나온다. 숫자 강조는 `segments` 로만 한다.
 *
 * ## 만들지 않은 것
 *
 * `cached`·`cachedAt` 은 항상 `false`/`null` 이라 **캐시 배지를 만들지 않는다.**
 * `thesisCheck.supporting`·`challenging` 과 `nextEvents.events` 도 지금 항상 빈
 * 배열이라(contracts C56) 전용 UI 를 만들지 않았다 — 그 자리를 그리려면 목이 계약보다
 * 관대해져야 한다. 값이 실제로 실려 오면 스키마는 이미 받고 있으니 여기만 고친다.
 *
 * `thesisCheck` 가 `null` 일 때의 논지 입력 유도 카드(ia.md §4 ★)는 AI 채팅 진입이
 * 필요해 이 티켓 범위 밖이다.
 *
 * ## 실패 자리
 *
 * 재시도 버튼을 낼지는 **코드가 정한다** — `AiStatus` 가 `isRetryableAiErrorCode` 로
 * 판정하므로 여기서 따로 고르지 않는다 (ia.md §4).
 * **실패·데이터 부족 자리에는 피드백을 붙이지 않는다** (design.md §10 · ia.md §4).
 * 보유 종목·근거가 없어 분석이 성립하지 않는 경우는 `409 INSUFFICIENT_DATA` 로
 * 오므로(contracts C12) 이 갈래가 아니라 위의 에러 갈래에서 걸린다.
 */
type StockAiTabProps = {
  stockCode: string;
  /** AI 탭이 열려 있을 때만 부른다 — 안 그러면 차트만 보는 사람에게 AI 요금이 나간다. */
  isActive: boolean;
};

/**
 * 검정 카드 아래의 평면 섹션 하나 (design.md §8.3 — "기본 Background 위 Flat Section",
 * "모든 Section을 Card로 만들지 않는다", "Section 간 충분한 여백").
 */
function AnalysisSectionBlock({ section }: { section: AiAnalysisSection }) {
  const title = section.title ?? null;

  return (
    <section className="mt-8">
      {title === null ? null : (
        <h3 className="mb-3 text-label font-semibold text-text-secondary">
          {title}
        </h3>
      )}
      <p className="text-body-2 leading-6 text-pretty text-text-secondary">
        <AiSegmentText segments={section.segments} text={section.text} />
      </p>
    </section>
  );
}

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

  const { content, requestId, dataAsOf, citations, disclaimer } = analysis.data;

  /**
   * 기준 시각. AI 명세 §2.2 가 "UI 에 반드시 노출한다" 로 적었다 —
   * 시세는 지연될 수 있어 생성 시각과 따로 관리한다. 다섯 원천 중 읽지 않은 것은
   * 키가 빠지는 것이 아니라 `null` 이라(contracts C54) 값이 있는 것만 고른다.
   */
  const asOfLabel = dataAsOf.filings ?? dataAsOf.price ?? null;

  /**
   * 온 섹션만 표시 순서대로 고른다. **일곱이 전부 없을 수 있다** — 그때는 아래
   * 안내로 접는다. 요청에서 뺀 섹션은 키째로 빠지고(`exclude_unset`) 개인화가
   * 꺼지거나 미보유면 값이 `null` 이라(C58) 둘을 함께 걸러야 한다.
   */
  const present = AI_ANALYSIS_SECTION_KEYS.flatMap((key) => {
    const section = content.sections[key] ?? null;
    return section === null ? [] : [{ key, section }];
  });

  const current = content.sections.current ?? null;
  const flat = present.filter((entry) => entry.key !== 'current');

  return (
    <div className="mt-6">
      <AiCard
        label="AI 종목 분석"
        headline={
          present.length === 0
            ? '분석 본문을 준비하고 있어요.'
            : (current?.title ?? undefined)
        }
        caption={
          asOfLabel === null ? undefined : `${formatKstTime(asOfLabel)} 기준`
        }
      >
        {present.length === 0 ? (
          <span className="mt-3 block text-body-2 text-ai-text-secondary">
            이 종목의 분석 내용은 아직 연결되지 않았어요. 근거와 기준 시각은
            아래에서 확인할 수 있어요.
          </span>
        ) : current === null ? null : (
          <span className="mt-3 block text-body-2 leading-6 text-pretty text-ai-text-secondary">
            <AiSegmentText
              segments={current.segments}
              text={current.text}
              onDark
            />
          </span>
        )}
      </AiCard>

      {flat.map((entry) => (
        <AnalysisSectionBlock key={entry.key} section={entry.section} />
      ))}

      <AiCitationList
        citations={citations}
        title="근거"
        showPublisher
        className="mt-8"
      />

      {/* disclaimer 는 하드코딩하지 않고 응답 값을 그대로 쓴다 — 규제 문구가 바뀌면
          서버만 고치게 하기 위해서다 (envelope.ts 주석). */}
      <p className="mt-5 text-caption leading-5 text-text-muted">
        {disclaimer}
      </p>

      <AiFeedbackRow requestId={requestId} className="mt-5" />
    </div>
  );
}
