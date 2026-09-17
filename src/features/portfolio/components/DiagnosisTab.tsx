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

import { DiagnosisFindingSection } from './DiagnosisFindingSection';
import { DiagnosisInsightPanel } from './DiagnosisInsightPanel';
import { PortfolioStateSection } from './PortfolioStateSection';
import { RiskScoreHero } from './RiskScoreHero';
import { StockConcentrationSection } from './StockConcentrationSection';

/**
 * "AI 진단" 탭 (프로토타입 `isPfDiag` 블록, AI 슬롯 5번).
 *
 * ## 읽기 순서가 이 파일의 내용이다 (FINCH-325)
 *
 * 이 파일은 그리지 않는다. **무엇을 어떤 차례로 놓을지**만 정한다.
 *
 * ```
 * 위험 점수        57 / 100 · 보통   ← 엔진. 화면에서 가장 큰 글자
 * 포트폴리오 상태   집중도 · 업종 집중 · 변동성
 * 종목 집중도       스택 막대
 * 확인된 사항       findings + 위험 지표 시트
 * FINCH가 진단했어요 ← AI 는 맨 뒤다. 근거·고지가 여기 딸린다
 * ```
 *
 * **프로토타입 순서에서 벗어난다.** 프로토타입은 AI 카드 → `포트폴리오 상태` →
 * `종목 집중도` 다(proto L2231–L2275). 전에는 그것을 그대로 따라 검정 `AiCard` 가
 * 맨 위에 있었고, 그래서 사용자가 자기 계좌의 숫자보다 AI 문장을 먼저 읽었다.
 * `CauseTab` 이 같은 이유로 같은 판단을 먼저 했다(FINCH-308) — 검정 면은 어떤
 * 위계를 주더라도 흰 배경 위에서 가장 먼저 눈에 들어온다.
 *
 * ## 계산값과 AI 해석값
 *
 * | 블록 | source of truth |
 * | --- | --- |
 * | `RiskScoreHero` | 엔진 — `riskScore` · `riskLevel` · `insufficientHistory` |
 * | `PortfolioStateSection` | 엔진 — `indicators` · `findings[].severity` |
 * | `StockConcentrationSection` | 원장 — 보유 종목 평가금액 |
 * | `DiagnosisFindingSection` | 엔진 판정 + **AI** 가 쓴 `findings[].text` |
 * | `DiagnosisInsightPanel` | **AI** — `summary.text` |
 *
 * 프론트가 계산하는 것은 **순서와 강조**뿐이다. 숫자를 만들지 않는다.
 *
 * ## 같은 사실을 세 번 말하던 것
 *
 * 상위 종목 비중 43%가 AI 문장 · `포트폴리오 상태` 집중도 줄 · `위험 지표`
 * `1위 종목 비중` 에 각각 다른 말투와 다른 반올림으로 적혀 있었다. 셋 중 하나도
 * 지우지 않고 **위험 지표를 시트로 접어** 처음 읽는 동선에서만 뺐다.
 *
 * ## 섹션 간격
 *
 * `mt-12`(48px) 하나로 통일하고 각 섹션이 자기 위 여백을 갖는다 — `CauseTab` 과
 * 같은 규칙이다. 아래 여백은 주지 않는다(`PageMain` 이 이미 더한다).
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
      <RiskScoreHero
        riskScore={riskScore}
        riskLevel={riskLevel}
        insufficientHistory={insufficientHistory}
      />

      <PortfolioStateSection indicators={indicators} findings={findings} />

      {portfolio.data !== undefined && (
        <StockConcentrationSection holdings={portfolio.data.holdings} />
      )}

      <DiagnosisFindingSection findings={findings} indicators={indicators} />

      <DiagnosisInsightPanel
        text={summary?.text ?? null}
        citations={aiMeta.citations}
        disclaimer={aiMeta.disclaimer}
      />
    </div>
  );
}
