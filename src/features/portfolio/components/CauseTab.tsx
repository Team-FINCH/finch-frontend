import { useState } from 'react';

import {
  isInsufficientDataErrorCode,
  isRetryableAiErrorCode,
  readAiErrorCode,
  readAiErrorMessage,
} from '@/shared/lib/aiErrorRetry';
import { type AiAttributionPeriod } from '@/shared/types/ai/attribution';
import { AiFeedbackRow } from '@/shared/ui/AiFeedbackRow';
import { AiStatus } from '@/shared/ui/AiStatus';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';

import { usePortfolioAttribution } from '../api/usePortfolioAttribution';
import {
  DEFAULT_ATTRIBUTION_PERIOD,
  sortByImpact,
} from '../lib/attributionInsight';

import { AnalysisInfoSheet } from './AnalysisInfoSheet';
import { AttributionPeriodTabs } from './AttributionPeriodTabs';
import { FinchReturnInsight } from './FinchReturnInsight';
import { PerformanceHero } from './PerformanceHero';
import { ReturnAttributionSection } from './ReturnAttributionSection';
import { StockContributionSection } from './StockContributionSection';

/**
 * "수익률 분석" 탭 (프로토타입 `isPfCause` 블록, AI 슬롯 2번).
 * 프로토타입 실제 UI에서 피드백이 붙는 확정된 세 자리 중 하나다
 * (ia.md §4 "피드백 슬롯 배치 규칙" 각주 — 종목 상세 AI 탭 · AI 채팅 · 여기).
 *
 * ## 읽기 순서가 이 파일의 내용이다 (FINCH-308 · 327)
 *
 * 이 파일은 그리지 않는다. **무엇을 어떤 차례로 놓을지**만 정한다.
 *
 * ```
 * 기간 선택         1일 · 1주 · 1개월 · 3개월 · 올해
 * [카드] 성과       +2.13% · 최근 21거래일 · 시장 +0.89% · 시장 대비 +1.24%p
 * 수익률 기여       시장 영향 / 업종 영향 / 종목 선택 발산 막대
 * 종목별 기여       상위 3종목 + `전체 N종목 ›`
 * [카드] FINCH 해석 ← AI 는 맨 뒤다. 3줄에서 끊고 시트로 잇는다
 * 안내 한 줄        09:12 기준 · 분석 기준 및 안내 ›
 * 피드백
 * ```
 *
 * **AI 가 숫자와 차트보다 먼저 나오면 안 된다.** 전에는 검정 `AiCard` 가 맨 위에
 * 있어서 사용자가 자기 수익률보다 AI 문장을 먼저 읽었다. 검정 면은 어떤 위계를
 * 주더라도 흰 배경 위에서 가장 먼저 눈에 들어온다.
 *
 * ## 계산값과 AI 해석값
 *
 * | 블록 | source of truth |
 * | --- | --- |
 * | `PerformanceHero` | 엔진 — `portfolioReturn` · `benchmarkReturn` · `excessReturn` |
 * | `ReturnAttributionSection` | 엔진 — `breakdown` |
 * | `StockContributionSection` | 엔진 — `contributors` · `detractors` |
 * | `FinchReturnInsight` | **AI** — `summary` |
 * | `AnalysisInfoSheet` | 엔진 — `notes` / 봉투 — `citations` · `disclaimer` · `dataAsOf` |
 *
 * 수치는 하나도 프론트가 만들지 않는다. 프론트가 계산하는 것은 **순서와 강조**뿐이다
 * (`sortByImpact` · `resolveMainFactor` · 막대 폭).
 *
 * ## 카드는 둘뿐이다 (FINCH-327)
 *
 * 면을 갖는 것은 **성과와 FINCH 해석** 둘이다. 가운데 두 섹션은 제목과 여백만으로
 * 갈린다 — 넷을 다 카드로 감싸면 카드가 겹겹이 쌓인 대시보드가 되고, 넷 다 배경
 * 위에 두면 이 화면의 시작과 끝이 어디인지 표시가 없다.
 *
 * ## 여백으로 섹션을 가른다
 *
 * 섹션 간격은 `mt-8`(32px) 하나로 통일하고 각 섹션이 자기 위 여백을 갖는다.
 * **48px 에서 내렸다** — AI 진단 탭이 32px 이라 같은 4탭 안에서 두 탭의 리듬이
 * 달랐다(FINCH-325 MR 이 범위 밖으로 남겨 둔 항목이다).
 *
 * 본문에 divider 가 없다. 전에는 `AnalysisMethodNote` 위 하나가 있었는데 그 각주
 * 덩어리 자체가 시트로 들어가면서 선을 그을 자리도 같이 사라졌다.
 *
 * **아래 여백을 여기서 주지 않는다.** `PageMain` 이
 * `calc(var(--page-bottom-space) + env(safe-area-inset-bottom))` 으로 이미 더하고
 * `TabBarLayout` 이 132px 을 넣는다 — 여기서 `pb-*` 를 또 적으면 이중이 된다.
 */
export function CauseTab() {
  const [period, setPeriod] = useState<AiAttributionPeriod>(
    DEFAULT_ATTRIBUTION_PERIOD,
  );
  const { data, isPending, isError, error, refetch } = usePortfolioAttribution(
    period,
    true,
  );

  // 기간 줄은 상태와 무관하게 언제나 서 있다. 로딩·오류일 때 사라지면 다른 기간으로
  // 빠져나갈 길이 없어진다 — 고른 기간에 거래일이 없어 409 가 나는 경우가 실제로 있다.
  const periodTabs = (
    <AttributionPeriodTabs value={period} onChange={setPeriod} />
  );

  if (isPending) {
    return (
      <div className="pt-4">
        {periodTabs}
        <div className="flex flex-col gap-3 pt-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    const code = readAiErrorCode(error);
    const message = readAiErrorMessage(error, '분석을 불러오지 못했어요');

    return (
      <div className="pt-4">
        {periodTabs}
        {isInsufficientDataErrorCode(code) ? (
          // TODO(계약): 개인화가 열리는 최소 데이터 건수가 임시값이다 — 이슈 #26 3번,
          // PRD 자신이 "임시값"이라고 적었다(ia.md §7). 숫자를 하드코딩하지 않는다.
          //
          // 이 탭은 두 상태의 모양이 갈린다 — 실패는 `.aist`(원반 글리프), 데이터
          // 부족은 `.est`(전면 빈 상태)다(proto L2287-2294). 그래서 여기만
          // `AiStatus` 가 아니라 `EmptyState` 를 쓴다.
          //
          // **제목의 마침표는 오타가 아니다.** 프로토타입이 이 자리에만 마침표를
          // 붙이고(L2290) AI 진단 탭의 같은 문구에는 붙이지 않는다(L2227).
          <EmptyState
            title="아직 분석할 정보가 충분하지 않아요."
            description="투자 기록이 조금 더 쌓이면 수익률 원인을 짚어드릴게요."
          />
        ) : (
          // 프로토타입은 이 자리의 `.aist` 여백을 44px 12px 로 덮어 쓴다(proto L2280).
          <AiStatus
            code={code}
            title={
              isRetryableAiErrorCode(code)
                ? '분석을 불러오지 못했어요'
                : message
            }
            description="잠시 후 다시 시도해 주세요."
            onRetry={() => void refetch()}
            className="px-3 py-11"
          />
        )}
      </div>
    );
  }

  if (data === undefined) {
    return null;
  }

  const {
    portfolioReturn,
    benchmarkReturn,
    excessReturn,
    tradingDays,
    breakdown,
    notes,
    summary,
    aiMeta,
  } = data;
  const rows = sortByImpact(data);

  return (
    <div className="pt-4">
      {periodTabs}

      <PerformanceHero
        portfolioReturn={portfolioReturn}
        benchmarkReturn={benchmarkReturn}
        excessReturn={excessReturn}
        tradingDays={tradingDays}
      />

      <ReturnAttributionSection breakdown={breakdown} />

      <StockContributionSection rows={rows} />

      <FinchReturnInsight summary={summary} rows={rows} />

      <AnalysisInfoSheet
        notes={notes}
        asOf={aiMeta.dataAsOf.portfolio ?? aiMeta.dataAsOf.price}
        citations={aiMeta.citations}
        disclaimer={aiMeta.disclaimer}
      />

      <AiFeedbackRow requestId={aiMeta.requestId} className="mt-4" />
    </div>
  );
}
