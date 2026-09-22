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
  causeViewTabId,
  CAUSE_VIEW_PANEL_ID,
  DEFAULT_ATTRIBUTION_PERIOD,
  DEFAULT_CAUSE_VIEW,
  sortByImpact,
  type CauseView,
} from '../lib/attributionInsight';

import { AnalysisInfoSheet } from './AnalysisInfoSheet';
import { AttributionPeriodTabs } from './AttributionPeriodTabs';
import { CauseSummaryPanel } from './CauseSummaryPanel';
import { CauseViewTabs } from './CauseViewTabs';
import { FinchReturnInsight } from './FinchReturnInsight';
import { PerformanceHero } from './PerformanceHero';
import { ReturnAttributionSection } from './ReturnAttributionSection';
import { StockContributionSection } from './StockContributionSection';

/**
 * "수익률 분석" 탭 (프로토타입 `isPfCause` 블록, AI 슬롯 2번).
 * 프로토타입 실제 UI에서 피드백이 붙는 확정된 세 자리 중 하나다
 * (ia.md §4 "피드백 슬롯 배치 규칙" 각주 — 종목 상세 AI 탭 · AI 채팅 · 여기).
 *
 * ## 읽기 순서가 이 파일의 내용이다 (FINCH-308 · 327 · 333)
 *
 * 이 파일은 그리지 않는다. **무엇을 어떤 차례로 놓을지**만 정한다.
 *
 * ```
 * 기간 선택         1일 · 1주 · 1개월 · 3개월 · 올해
 * [카드] 성과       +2.13% · 최근 21거래일 · 시장 +0.89% · 시장 대비 +1.24%p
 * [세그먼트]        요약 | 기여 분석 | 종목별
 *   요약            시장 대비 한 줄 · 요인 1위 · 종목 1위 → [카드] FINCH 해석
 *   기여 분석       시장 영향 / 업종 영향 / 종목 선택 발산 막대 + 인사이트
 *   종목별          종목 기여 목록 (기여도 · 기간 수익률 · 막대)
 * 안내 한 줄        09:12 기준 · 분석 기준 및 안내 ›
 * 피드백
 * ```
 *
 * ## 왜 세로 한 줄을 탭으로 갈랐나 (FINCH-333)
 *
 * 전에는 성과 → 수익률 기여 → 종목별 기여 → FINCH 해석이 끊김 없이 이어졌다.
 * 세 가지가 한꺼번에 눈에 들어와서 생긴 문제가 셋이다.
 *
 * 1. **두 차트를 비교하게 된다.** 요인 막대와 종목 막대는 `divergingScale` 을
 *    각자 잡으므로 길이를 서로 견주면 안 되는데(그 함수 주석), 나란히 서 있으면
 *    같은 축의 차트로 읽힌다. 이제 구조적으로 한 화면에 함께 서지 않는다
 * 2. **적색이 반복된다.** 한 화면의 등락색 요소가 열넷 안팎이었다.
 *    `요약` 은 넷(성과 둘 + 요약 둘)이다. **색 토큰은 한 글자도 바꾸지 않았다** —
 *    `--color-stock-up` 은 이슈 #32 회신으로 확정된 값이고 앱 전체가 공유한다.
 *    줄인 것은 자리 수이고, 막대는 같은 색을 80% 로 얹어 면적만 줄였다
 * 3. **스크롤이 길다.** 보유 여덟 종목이면 본문이 화면 셋을 넘겼다
 *
 * ## 성과 카드는 탭 밖에 남는다
 *
 * 세 탭이 공유한다. `기여 분석` 을 보는 동안에도 `+2.13%` 가 위에 있어야
 * `+1.42%p` 가 무엇의 조각인지 읽힌다. 자세한 이유는 `PerformanceHero` 주석에 있다.
 *
 * ## 기간 줄은 탭보다 위에 있다
 *
 * 기간을 바꾸면 세 탭의 값이 **모두** 바뀌므로 탭보다 상위 축이다. 아래로
 * 내리면 탭마다 기간이 따로 있는 것처럼 보인다.
 *
 * ## 카드는 화면당 둘이다
 *
 * FINCH-327 이 "면을 갖는 것은 성과와 FINCH 해석 둘뿐" 이라고 정했고, 그
 * 이유는 **넷을 다 카드로 감싸면 카드가 겹겹이 쌓인 대시보드가 된다**는 것이었다.
 * 탭이 그 전제를 바꿨다 — 한 번에 한 패널만 서므로 `성과 + 패널` 둘이다.
 * `요약` 탭만 셋인데(성과 + 요약 + FINCH), 그 셋이 이 화면의 결론 전부다.
 *
 * ## 계산값과 AI 해석값
 *
 * | 블록 | source of truth |
 * | --- | --- |
 * | `PerformanceHero` | 엔진 — `portfolioReturn` · `benchmarkReturn` · `excessReturn` |
 * | `CauseSummaryPanel` | 엔진 — `excessReturn` 의 부호 · `resolveMainFactor` · `sortByImpact[0]` |
 * | `ReturnAttributionSection` | 엔진 — `breakdown` |
 * | `StockContributionSection` | 엔진 — `contributors` · `detractors` |
 * | `FinchReturnInsight` | **AI** — `summary` |
 * | `AnalysisInfoSheet` | 엔진 — `notes` / 봉투 — `citations` · `disclaimer` · `dataAsOf` |
 *
 * 수치는 하나도 프론트가 만들지 않는다. 프론트가 계산하는 것은 **순서와 강조**뿐이다
 * (`sortByImpact` · `resolveMainFactor` · `resolveExcessNote` · 막대 폭).
 * 요청·응답·쿼리 키·캐시는 이 티켓에서 한 줄도 건드리지 않았다.
 *
 * ## 아래 여백을 여기서 주지 않는다
 *
 * `PageMain` 이 `calc(var(--page-bottom-space) + env(safe-area-inset-bottom))` 으로
 * 이미 더하고 `TabBarLayout` 이 132px 을 넣는다 — 여기서 `pb-*` 를 또 적으면
 * 이중이 된다.
 */
export function CauseTab() {
  const [period, setPeriod] = useState<AiAttributionPeriod>(
    DEFAULT_ATTRIBUTION_PERIOD,
  );
  const [view, setView] = useState<CauseView>(DEFAULT_CAUSE_VIEW);
  const { data, isPending, isError, error, refetch } = usePortfolioAttribution(
    period,
    true,
  );

  // 기간 줄은 상태와 무관하게 언제나 서 있다. 로딩·오류일 때 사라지면 다른 기간으로
  // 빠져나갈 길이 없어진다 — 고른 기간에 거래일이 없어 409 가 나는 경우가 실제로 있다.
  //
  // **2차 탭 줄은 그렇지 않다.** 고를 내용 자체가 없는 상태라 세 칸을 띄워 두면
  // 눌러도 아무 일이 없는 컨트롤이 된다. 기간과 달리 상태를 벗어날 길도 아니다.
  const periodTabs = (
    <AttributionPeriodTabs value={period} onChange={setPeriod} />
  );

  if (isPending) {
    return (
      <div className="pt-4">
        {periodTabs}
        <div className="flex flex-col gap-3 pt-6">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-9.5 w-full" />
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

      <CauseViewTabs value={view} onChange={setView} className="mt-6" />

      {/*
        `key` 로 탭마다 새 노드를 만들어 페이드를 다시 태운다 — `PortfolioPage` 가
        4탭에 쓰는 것과 같은 애니메이션이고, 여기는 `--motion-normal`(180ms)이다.
        4탭보다 짧은 전환이라 같은 화면 안에서 두 겹의 페이드가 겹쳐 보이지 않는다.

        `min-h` 를 주지 않았다. 2차 탭 줄이 화면 위쪽에 있어서 누르려면 이미 위로
        올라와 있어야 하고, 그 자리에서는 패널 높이가 줄어도 스크롤이 튈 여지가 없다.
      */}
      <div
        key={view}
        role="tabpanel"
        id={CAUSE_VIEW_PANEL_ID}
        aria-labelledby={causeViewTabId(view)}
        className="animate-[tab-panel-fade-in_var(--motion-normal)_var(--ease-standard)_both]"
      >
        {view === 'summary' && (
          <>
            <CauseSummaryPanel
              breakdown={breakdown}
              rows={rows}
              excessReturn={excessReturn}
              onNavigate={setView}
            />
            <FinchReturnInsight
              summary={summary}
              rows={rows}
              className="mt-4"
            />
          </>
        )}

        {view === 'factor' && (
          <ReturnAttributionSection breakdown={breakdown} />
        )}

        {view === 'stock' && <StockContributionSection rows={rows} />}
      </div>

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
