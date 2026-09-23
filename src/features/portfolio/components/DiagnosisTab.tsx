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
import { resolveConcentration } from '../lib/concentration';
import { useDiagnosisIntro } from '../lib/useDiagnosisIntro';

import { AnalysisEvidenceSheet } from './AnalysisEvidenceSheet';
import { ConcentrationCard } from './ConcentrationCard';
import { DiagnosisAiCard } from './DiagnosisAiCard';
import { PortfolioRiskSummary } from './PortfolioRiskSummary';

/**
 * "AI 진단" 탭 (프로토타입 `isPfDiag` 블록, AI 슬롯 5번).
 *
 * ## 읽기 순서가 이 파일의 내용이다 (FINCH-325)
 *
 * 이 파일은 그리지 않는다. **무엇을 어떤 차례로 놓을지**만 정한다.
 *
 * ```
 * 결론   DiagnosisAiCard        [검정 카드] 한 문장 + 최대 낙폭 ›
 * 근거   PortfolioRiskSummary   머리줄 + 근거 N개 › · 점수 44px · 막대 · 지표 3열
 * 근거   ConcentrationCard      머리줄 + 등급 · 스택 바 · 상위 종목
 * ```
 *
 * ## 아래에 매달려 있던 두 덩이를 위로 올렸다 (FINCH-341)
 *
 * 배포 화면을 본 사용자 지적이다. 본문이 끝난 뒤에 작은 글씨가 더 붙어 있어
 * 섹션이 언제 끝나는지 흐렸고, 닿으려면 화면을 더 내려야 했다.
 *
 * | 있던 자리 | 간 자리 |
 * | --- | --- |
 * | 탭 맨 아래 `근거 N개 · 계산 기준 보기 ›` 한 줄 | `PortfolioRiskSummary` 머리줄 오른쪽 |
 * | 집중도 목록 밑 `집중도 판정 높음` | `ConcentrationCard` 머리줄 오른쪽 |
 * | 집중도 목록 밑 AI insight 한 줄 | 없앴다 (그 컴포넌트 주석) |
 *
 * **시트를 여는 곳이 하나 줄지 않았다.** 위험도 지표 3열이 이미 같은
 * `onOpenDetail` 을 물고 있어서, 링크가 그 블록 머리로 간 것은 같은 동작을 같은
 * 블록 안에 모은 것이다.
 *
 * ## 면은 하나뿐이다 (FINCH-334)
 *
 * 전에는 흰 카드 둘(위험도·집중도)에 검정 카드 하나, 그리고 위험도 카드 **안에**
 * 지표 3열을 가르는 테두리가 또 있었다. 상자가 넷이라 내용이 아니라 상자가 리듬을
 * 만들었다.
 *
 * 이제 **검정 AI 카드만 surface** 이고 나머지는 페이지 배경 위 flat 섹션이다.
 * 섹션 사이는 36px 여백(`mt-9`)뿐 — 구분선도 새로 긋지 않는다. 선을 그으면
 * 테두리를 지우고 선을 얻는 것이라 상자가 다시 생긴다.
 *
 * ## 결론이 먼저다 (FINCH-334)
 *
 * FINCH-325 가 검정 카드를 맨 아래로 내렸던 것을 되돌린다. 그때 이유는
 * *"검정 면은 흰 배경 위에서 가장 먼저 눈에 들어와서 사용자가 자기 수치보다 AI
 * 문장을 먼저 읽었다"* 였는데, **그 카드가 이제 숫자를 들지 않는다** — KPI 줄을
 * 지우고 한 문장만 남겼다. FINCH-332 가 종목 상세 AI 탭에 같은 순서
 * (`결론 → 근거`)를 이미 적용했고 그쪽에서 문제가 되지 않았다.
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
 * `DiagnosisAiCard` 의 `진단 자세히 보기` 시트가 그 셋을 받는다.
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
 * | `DiagnosisAiCard` | **AI** — `summary` / 엔진 — `indicators.maxDrawdown1y` |
 * | `PortfolioRiskSummary` | 엔진 — `riskScore` · `riskLevel` · `findings[].severity` / 원장 — 1위 비중 |
 * | `ConcentrationCard` | 원장 — 보유 평가금액 / **AI** — `findings[].text` |
 * | `AnalysisEvidenceSheet` | 엔진 — `indicators` / 봉투 — `citations` · `disclaimer` |
 *
 * 프론트가 계산하는 것은 **순서와 강조**뿐이다. 수치를 만들지 않는다 — 종목 비중만
 * 화면이 내는데 그것도 평가금액 합계라 지어낸 값이 아니다(`ConcentrationCard`).
 *
 * ## 간격
 *
 * 섹션 사이 `mt-9`(36px) 하나로 통일한다. 좌우 여백은 `PageMain` 의 26px 을 그대로
 * 쓴다 — **여기만 바꾸면 4탭의 좌우선이 어긋난다.**
 *
 * ## 진입 애니메이션은 한 번뿐이다
 *
 * `useDiagnosisIntro` 가 "이번 마운트에서 재생할지" 를 정하고 각 블록이 그것을
 * 받아 클래스를 붙인다. 탭을 오가며 다시 볼 때는 재생하지 않고,
 * `prefers-reduced-motion: reduce` 면 전부 꺼지고 최종값이 바로 보인다.
 * **반복·루프 효과는 없다** — 반짝임·펄스·glow·shimmer 를 넣지 않는다.
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
  const intro = useDiagnosisIntro();
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

  // 화면의 "최대 종목 비중" 은 이 계산 하나다 — 위험도 지표와 집중도 섹션이 같은
  // 값을 써야 한다. 근거는 `lib/concentration.ts` 주석에 있다.
  const { slices, top1Percent } = resolveConcentration(
    portfolio.data?.holdings ?? [],
  );

  return (
    <div className="pt-4">
      <DiagnosisAiCard
        summary={summary}
        findings={findings}
        indicators={indicators}
        intro={intro}
      />

      <PortfolioRiskSummary
        riskScore={riskScore}
        riskLevel={riskLevel}
        insufficientHistory={insufficientHistory}
        findings={findings}
        indicators={indicators}
        top1Percent={top1Percent}
        onOpenDetail={() => setEvidenceOpen(true)}
        /* 근거 줄이 이 블록의 머리로 들어갔다 (FINCH-341). 개수를 화면이
           세는 것은 여전히 `citations.length` 뿐이고, 0 이면 컴포넌트가
           `계산 기준 ›` 으로 바꾼다 — 근거가 없어도 계산 기준은 늘 있다. */
        citationCount={aiMeta.citations.length}
        intro={intro}
      />

      <ConcentrationCard slices={slices} findings={findings} intro={intro} />

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
