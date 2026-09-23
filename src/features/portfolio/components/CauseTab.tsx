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
 * 성과 (면 없음)    이번 기간 수익률 / +2.13%
 *                  시장 +0.89% · 시장보다 +1.24%p · 최근 21거래일 기준
 * [세그먼트]        요약 | 기여 분석 | 종목별
 *   요약  [AI 카드]  ✦ FINCH 분석 → 관련 공시 N건 (없으면 분석 전문 보기)
 *         (면 없음) 시장과 비교 ─ 초과 성과는 어디서 왔나요? ─ 영향을 준 종목
 *   요인별  (면 없음) 수익률은 이렇게 만들어졌어요 ─ 해석 한 줄
 *                      시장 영향 / 업종 배분 / 종목 선택 ─ 수익률 구성
 *   종목별   (면 없음) 영향이 큰 순 ─ 순위 · 종목 · 기여도 · 막대 · 수익률/비중
 * 안내 한 줄        09:12 기준 · 분석 기준 및 안내 ›
 * 피드백
 * ```
 *
 * ## 요약 탭은 네 질문에 차례로 답한다 (2026-09-23)
 *
 * `성과가 어땠나`(히어로) → `시장보다 잘했나`(비교) → `왜 그랬나`(요인) →
 * `어떤 종목이`(기여) → `해설`(FINCH). 각 블록의 근거는
 * `CauseSummaryPanel` 주석에 있다.
 *
 * **면을 갖는 것은 FINCH 카드 하나다.** 전에는 히어로·요약·FINCH 가 전부 카드라
 * 넷이 비슷한 무게로 서서 어느 것을 먼저 봐야 하는지 표시가 없었다. 지금은 AI 가
 * 쓴 덩어리만 차콜이고 나머지는 배경 위 글이다.
 *
 * ## 왜 세로 한 줄을 탭으로 갈랐나 (FINCH-333)
 *
 * 전에는 성과 → 수익률 기여 → 종목별 기여 → FINCH 해석이 끊김 없이 이어졌다.
 * 세 가지가 한꺼번에 눈에 들어와서 생긴 문제가 셋이다.
 *
 * 1. **두 차트를 비교하게 된다.** 요인 막대와 종목 막대는 `divergingScale` 을
 *    각자 잡으므로 길이를 서로 견주면 안 되는데(그 함수 주석), 나란히 서 있으면
 *    같은 축의 차트로 읽힌다. 이제 구조적으로 한 화면에 함께 서지 않는다.
 *    **두 탭이 같은 부품(`ContributionRow`)으로 돌아온 뒤에도 그대로다**
 *    (FINCH-345) — 모양이 같아진 것이지 축을 공유하게 된 것이 아니다
 * 2. **적색이 반복된다.** 한 화면의 등락색 요소가 열넷 안팎이었고 전부 같은
 *    채도였다. `요약` 은 넷(성과 둘 + 요약 둘)이다. **확정 토큰 값은 한 글자도
 *    바꾸지 않았다** — `--color-stock-up` 은 이슈 #32 회신으로 확정됐고 앱 전체가
 *    공유한다. 대신 저채도 짝(`--color-stock-*-muted`)을 더해서, 이 화면에서
 *    확정값을 쓰는 자리가 **성과 카드의 큰 수익률 하나**만 남게 했다
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
 * ## 상자를 쓰지 않는다 — 구간은 선과 여백이 가른다 (2026-09-23 · FINCH-341)
 *
 * FINCH-327 이 "면을 갖는 것은 성과와 FINCH 해석 둘뿐" 이라고 정했을 때
 * 이유는 **넷을 다 카드로 감싸면 카드가 겹겹이 쌓인 대시보드가 된다**는 것이었다.
 * 그 방향을 끝까지 밀었다 — 히어로가 카드를 벗고, 요약 탭의 분석 세 섹션이 카드를
 * 벗었다. 그때는 `기여 분석`·`종목별` 두 탭만 카드로 남아 세 탭의 결이 갈렸고,
 * FINCH-341 이 그 셋을 같은 모양으로 맞췄다.
 *
 * **그런데 상자를 전부 없애자 반대쪽으로 넘어갔다** — 히어로부터 피드백까지가
 * 경계 없는 하나의 긴 회색 띠가 되어, 어디까지가 성과이고 어디부터가 상세 분석인지
 * 표시가 없었다(사용자 지적).
 *
 * 한때 고른 탭의 내용 전체를 흰 면 하나로 감쌌다가 **걷어냈다** (사용자 결정,
 * 2026-09-23). 경계를 만드는 방법이 면 말고도 있고, 이 화면에서는 그쪽이 더 맞다 —
 * **구간 제목 · 1px 선 · 32px 여백** 셋이 그 일을 한다. 면을 쓰면 그 안에 또
 * 들어가는 FINCH 차콜 카드가 상자 속 상자가 되고, 세그먼티드 트랙(회색)과 카드
 * (흰색)와 배경(회색)이 세 층으로 쌓인다.
 *
 * ```
 * 기간 · 수익률 · 시장 대비        ← 배경 위 (Summary)
 * ────────────────────────       ← 32px · 선 · 32px
 * 수익률 상세 분석                 ← 18/700 구간 제목
 * 수익률이 어디에서 만들어졌는지…     ← 14 보조
 * [ 요약 │ 기여 분석 │ 종목별 ]      ← 어두운 칸이 선택
 *   고른 탭의 내용                  ← 배경 위 (Analysis)
 * ────────────────────────
 * 14:48 기준 · 분석 기준 및 안내 ›   ← 부가 정보
 * ────────────────────────
 * 이 분석이 도움이 됐나요?           ← 선으로 또 갈린다
 * ```
 *
 * 위계는 전부 **타이포와 여백**이 진다 — 36px 수익률 → 18px 구간 제목 →
 * 18px 패널 제목 → 16px 라벨 → 13px 캡션. 이 화면에서 채워진 면은 세그먼티드
 * 트랙과 FINCH 차콜 카드 둘뿐이다.
 *
 * ## 계산값과 AI 해석값
 *
 * | 블록 | source of truth |
 * | --- | --- |
 * | `PerformanceHero` | 엔진 — `portfolioReturn` · `benchmarkReturn` · `excessReturn` |
 * | `CauseSummaryPanel` | 엔진 — `excessReturn` 의 부호 · `resolveMainFactor` · `sortByImpact[0]` |
 * | `ReturnAttributionSection` | 엔진 — `breakdown` · `portfolioReturn` |
 * | `StockContributionSection` | 엔진 — `contributors` · `detractors` |
 * | `FinchReturnInsight` | **AI** — `summary` |
 * | `AnalysisInfoSheet` | 엔진 — `notes` / 봉투 — `citations` · `disclaimer` · `dataAsOf` |
 *
 * 수치는 하나도 프론트가 만들지 않는다. 프론트가 계산하는 것은 **순서와 강조**뿐이다
 * (`sortByImpact` · `resolveMainFactor` · `sortFactorsByImpact` · 막대 폭).
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
          <Skeleton className="h-9 w-full" />
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

      {/* 화면을 둘로 가른다 (FINCH-341).

          위는 **이번 기간 성과**(기간 · 수익률 · 시장 대비), 아래는 **상세 분석**
          이다. 전에는 히어로 다음에 세그먼티드 트랙이 곧장 나와서, 트랙이 성과
          블록의 일부인지 새 구간의 시작인지 표시가 없었다 — 화면 전체가 경계 없는
          긴 회색 띠로 읽혔다(사용자 지적).

          선 하나와 위아래 32px 이 그 경계다. 요약 전체를 카드로 감싸지 않는다 —
          히어로가 배경 위 36px 숫자로 서 있는 것이 이 화면에서 가장 무거워야 하고,
          상자를 씌우면 그 무게가 상자로 옮겨 간다. */}
      <div className="mt-8 border-t border-border pt-8">
        {/* 설명 줄은 **탭을 가리킨다**. 전에는 `수익률이 어디에서 만들어졌는지
            확인해 보세요.` 였는데 세 줄 아래 패널 제목이 `수익률은 이렇게
            만들어졌어요` 라 같은 말이 붙어 나왔다 (FINCH-341). */}
        <h2 className="text-section-title text-text-primary">
          수익률 상세 분석
        </h2>
        <p className="mt-1 text-label text-pretty break-keep text-text-secondary">
          요인별로도, 종목별로도 볼 수 있어요.
        </p>

        <CauseViewTabs value={view} onChange={setView} className="mt-4" />

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
          className="mt-5 animate-[tab-panel-fade-in_var(--motion-normal)_var(--ease-standard)_both]"
        >
          {view === 'summary' && (
            <>
              {/*
              FINCH 가 근거보다 **위**에 있다 (2026-09-23). 맨 아래에 있을 때는
              시장 비교·요인·종목을 다 지나야 닿아서 실기기에서 보이지 않았다.
              자세한 사유는 `FinchReturnInsight` 주석.
            */}
              <FinchReturnInsight summary={summary} rows={rows} />
              <CauseSummaryPanel
                breakdown={breakdown}
                rows={rows}
                portfolioReturn={portfolioReturn}
                benchmarkReturn={benchmarkReturn}
                excessReturn={excessReturn}
                onNavigate={setView}
              />
            </>
          )}

          {view === 'factor' && (
            <ReturnAttributionSection
              breakdown={breakdown}
              /* `수익률 구성` 의 도착점이다. 세 요인을 더한 값이 아니라 응답 값을
               그대로 넘긴다 — 근거는 `AttributionCalcSummary` 주석. */
              portfolioReturn={portfolioReturn}
            />
          )}

          {view === 'stock' && <StockContributionSection rows={rows} />}
        </div>
      </div>

      <AnalysisInfoSheet
        notes={notes}
        asOf={aiMeta.dataAsOf.portfolio ?? aiMeta.dataAsOf.price}
        citations={aiMeta.citations}
        disclaimer={aiMeta.disclaimer}
      />

      {/* 피드백은 분석 결과가 아니라 **이 화면에 대한 물음**이다 (FINCH-341).
          바로 위 안내 줄에 이어 붙어 있으면 둘이 같은 묶음으로 읽혀서, 선 하나와
          20px 으로 갈라 둔다. */}
      <AiFeedbackRow
        requestId={aiMeta.requestId}
        className="mt-5 border-t border-border pt-5"
      />
    </div>
  );
}
