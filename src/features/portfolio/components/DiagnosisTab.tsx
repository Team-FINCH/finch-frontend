import { useState } from 'react';

import {
  isInsufficientDataErrorCode,
  isRetryableAiErrorCode,
  readAiErrorCode,
  readAiErrorMessage,
} from '@/shared/lib/aiErrorRetry';
import { AiStatus } from '@/shared/ui/AiStatus';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';

import { usePortfolio } from '../api/usePortfolio';
import { usePortfolioDiagnosis } from '../api/usePortfolioDiagnosis';

import { AnalysisEvidenceSheet } from './AnalysisEvidenceSheet';
import { ConcentrationCard } from './ConcentrationCard';
import { FinchInsightCard } from './FinchInsightCard';
import { PortfolioRiskSummary } from './PortfolioRiskSummary';

/**
 * "AI 진단" 탭 (프로토타입 `isPfDiag` 블록, AI 슬롯 5번).
 *
 * ## 읽기 순서가 이 파일의 내용이다 (FINCH-325)
 *
 * 이 파일은 그리지 않는다. **무엇을 어떤 차례로 놓을지**만 정한다.
 *
 * ```
 * 결과        PortfolioRiskSummary   점수 · 등급 배지 · 핵심 위험 한 줄 · KPI 3열
 * 시각적 근거  ConcentrationCard      스택 바 · 상위 종목 · insight 한 줄
 * 해석        FinchInsightCard       metric anchor · 요약 · 진단 자세히 보기
 * 상세        근거 N개 · 계산 기준 보기 › → AnalysisEvidenceSheet
 * ```
 *
 * **카드는 셋뿐이다.** 나머지를 카드로 감싸면 카드가 겹겹이 쌓인 대시보드가 된다.
 *
 * ## 무엇을 없앴나
 *
 * 같은 사실이 세 군데서 반복되던 것을 걷어냈다 — 상위 종목 비중 43%가 AI 문장 ·
 * `포트폴리오 상태` 집중도 줄 · `위험 지표` `1위 종목 비중` 에 각각 다른 말투와
 * 다른 반올림(43.2% / 43% / 43%)으로 적혀 있었다.
 *
 * | 없앤 것 | 어디로 갔나 |
 * | --- | --- |
 * | `PortfolioStateSection` 3행 + 막대 | Hero 안 KPI 3열 |
 * | `확인된 사항` 섹션 | 집중도 항목은 `ConcentrationCard` insight 줄, 나머지는 진단 시트 |
 * | `위험 지표` 6행 | `AnalysisEvidenceSheet` — 점수에 들어가는 것과 아닌 것으로 갈라서 |
 * | 상시 노출되던 근거 목록·면책 단락 | 같은 시트. 본문에는 한 줄만 남는다 |
 *
 * **`확인된 사항` 을 그냥 지우면 정보가 없어진다.** `findings[].id` 6종 중
 * `correlation`·`liquidity`·`macro_exposure` 는 대응하는 시각화가 없어서,
 * `FinchInsightCard` 의 `진단 자세히 보기` 시트가 그 셋을 받는다.
 *
 * ## 시트를 여는 입구가 둘인 이유
 *
 * `AnalysisEvidenceSheet` 의 열림 상태를 이 파일이 갖는다. Hero 의 KPI 와 본문
 * 맨 아래 한 줄이 **같은 시트**를 열기 때문이다 — 내용이 같아 두 시트로 나눌 이유가
 * 없고, 상태를 위로 올리지 않으면 두 컴포넌트가 각자 사본을 갖는다.
 *
 * ## 계산값과 AI 해석값
 *
 * | 블록 | source of truth |
 * | --- | --- |
 * | `PortfolioRiskSummary` | 엔진 — `riskScore` · `riskLevel` · `indicators` · `findings[].severity` / **AI** — `findings[0].title` |
 * | `ConcentrationCard` | 원장 — 보유 평가금액 / **AI** — `findings[].text` |
 * | `FinchInsightCard` | **AI** — `summary` · `findings[]` |
 * | `AnalysisEvidenceSheet` | 엔진 — `indicators` / 봉투 — `citations` · `disclaimer` |
 *
 * 프론트가 계산하는 것은 **순서와 강조**뿐이다. 수치를 만들지 않는다 — 종목 비중만
 * 화면이 내는데 그것도 평가금액 합계라 지어낸 값이 아니다(`ConcentrationCard`).
 *
 * ## 간격
 *
 * 섹션 사이 `mt-8`(32px) 하나로 통일한다. 좌우 여백은 `PageMain` 의 26px 을 그대로
 * 쓴다 — **여기만 바꾸면 4탭의 좌우선이 어긋난다.**
 *
 * **피드백을 붙이지 않는다.** 프로토타입 실제 UI에서 피드백이 붙는 자리는 셋뿐이고
 * 이 탭은 그중 하나가 아니다(ia.md §4 "피드백 슬롯 배치 규칙" 각주).
 *
 * **보유가 0이면 요청을 보내지 않는다** — 프로토타입 `diagCold`(proto L2209,
 * `aiOk && hk.length===0`)와 같다. 진단할 것이 없다는 것은 프론트가 이미 아는
 * 사실이라 빈 계좌에서 AI 요청 한 번을 낭비할 이유가 없다. 보유 조회가 실패해
 * 개수를 모를 때는 요청을 보낸다 — 곁가지 실패가 본문을 막지 않게 한다.
 */
export function DiagnosisTab() {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const portfolio = usePortfolio('EVALUATION');
  const isColdStart = portfolio.data?.holdings.length === 0;
  const { data, isPending, isError, error, refetch } = usePortfolioDiagnosis(
    !portfolio.isPending && !isColdStart,
  );

  if (portfolio.isPending) {
    return (
      <div className="flex flex-col gap-3 pt-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isColdStart) {
    return (
      <EmptyState
        title="아직 진단할 정보가 없어요."
        description="한 종목만 담아도 집중도와 분산을 알려드릴게요."
      />
    );
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-3 pt-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError) {
    const code = readAiErrorCode(error);
    const message = readAiErrorMessage(error, '분석을 불러오지 못했어요');

    if (isInsufficientDataErrorCode(code)) {
      return (
        <AiStatus
          title="아직 분석할 정보가 충분하지 않아요"
          description={
            <>
              투자 기록이 조금 더 쌓이면
              <br />
              FINCH가 진단해드릴게요.
            </>
          }
        />
      );
    }

    return (
      <AiStatus
        code={code}
        title={
          isRetryableAiErrorCode(code) ? '분석을 불러오지 못했어요' : message
        }
        description="잠시 후 다시 시도해 주세요."
        onRetry={() => void refetch()}
      />
    );
  }

  if (data === undefined) {
    return null;
  }

  const {
    riskScore,
    riskLevel,
    insufficientHistory,
    summary,
    findings,
    indicators,
    aiMeta,
  } = data;

  return (
    <div>
      <PortfolioRiskSummary
        riskScore={riskScore}
        riskLevel={riskLevel}
        insufficientHistory={insufficientHistory}
        findings={findings}
        indicators={indicators}
        onOpenDetail={() => setEvidenceOpen(true)}
      />

      {portfolio.data !== undefined && (
        <ConcentrationCard
          holdings={portfolio.data.holdings}
          findings={findings}
        />
      )}

      <FinchInsightCard summary={summary} findings={findings} />

      {/*
        근거 줄. 개수를 화면이 세는 것은 `citations.length` 뿐이고 문구는 고정이다.
        근거가 하나도 없어도 **계산 기준은 늘 있으므로** 줄을 감추지 않는다.
      */}
      <button
        type="button"
        onClick={() => setEvidenceOpen(true)}
        className="mt-8 flex w-full items-center justify-between gap-3 py-2 text-left"
      >
        <span className="min-w-0 truncate text-body-2 text-text-secondary">
          {aiMeta.citations.length > 0
            ? `근거 ${aiMeta.citations.length}개 · 계산 기준 보기`
            : '계산 기준 보기'}
        </span>
        <span
          aria-hidden="true"
          className="flex-none text-body-2 text-text-muted"
        >
          ›
        </span>
      </button>

      <AnalysisEvidenceSheet
        open={evidenceOpen}
        onOpenChange={setEvidenceOpen}
        indicators={indicators}
        citations={aiMeta.citations}
        disclaimer={aiMeta.disclaimer}
      />
    </div>
  );
}
