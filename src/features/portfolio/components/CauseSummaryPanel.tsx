import {
  type AiAttributionContent,
  type AiAttributionRow,
} from '@/shared/types/ai/attribution';

import {
  ATTRIBUTION_FACTOR_ORDER,
  resolveTopContributors,
  type CauseView,
} from '../lib/attributionInsight';

import { MarketComparison } from './MarketComparison';
import { PerformanceDriver } from './PerformanceDriver';
import { TopContributors } from './TopContributors';

/**
 * `요약` 탭의 본문 — 질문 2·3·4 를 **하나의 리포트**로 잇는다 (FINCH-333).
 *
 * ## 카드를 걷었다 (2026-09-23)
 *
 * 세 섹션이 흰 `Card` 하나에 들어 있었다. 카드 넷이던 것을 하나로 줄인 것이라
 * 그 자체로는 나아졌지만, 화면에는 여전히 **히어로(배경) → 탭(회색 트랙) →
 * 카드(흰 면) → FINCH(회색 면)** 네 덩어리가 층층이 쌓여 있었다.
 *
 * 이제 면이 없다. 섹션은 32px 여백과 1px 구분선으로만 갈린다.
 *
 * ```
 * [배경]  이번 기간 수익률 / +2.13% / 시장 +0.89% · 시장보다 +1.24%p
 * [탭]    요약 | 기여 분석 | 종목별
 *
 *         시장과 비교
 *           내 포트폴리오 ████████ +2.13%
 *           시장         ███      +0.89%
 *         ─────────────────────────────────
 *         초과 성과는 어디서 왔나요?
 *           종목 선택 +1.42%p + 막대 셋
 *         ─────────────────────────────────
 *         성과에 영향을 준 종목            전체
 *           SK하이닉스 / 카카오
 *
 * [연한 면] ✦ FINCH 분석
 * ```
 *
 * **면을 갖는 것은 FINCH 패널 하나**다. 그 하나가 "이건 AI 가 쓴 글" 이라는
 * 표시를 하고, 나머지는 읽는 사람이 위에서 아래로 훑는 하나의 글이 된다.
 *
 * ## 구분선은 `--color-border` 다
 *
 * `--color-divider`(#DFE4EA)가 아니라 한 톤 옅은 `--color-border`(#E9ECEF)를
 * 쓴다. 전자는 **카드 안에서** 내용 덩어리를 가르라고 만든 값이라 흰 면 위
 * 기준으로 잡혀 있고, 여기는 배경(#F7F8FA) 위라 같은 선이 더 진해 보인다.
 * 선이 눈에 띄면 다시 칸막이가 되고, 이 화면에서 선은 **숨 쉬는 자리**여야 한다.
 *
 * ## 섹션 사이는 32px 이다
 *
 * 섹션 제목(`--text-section-title` 18/700)이 이미 덩어리의 시작을 표시하므로
 * 여백은 그것을 받쳐 주기만 하면 된다. 36px 이상 벌리면 한 화면에 두 섹션이
 * 안 들어와 "이어 읽는 글" 이라는 느낌이 끊긴다.
 *
 * ## 이 파일은 배치만 한다
 *
 * 세 섹션 모두 엔진 값이고(`benchmarkReturn`·`excessReturn` / `breakdown` /
 * `contributors`·`detractors`), 프론트가 하는 계산은 정렬·argmax·막대 폭뿐이다.
 * 요청·응답·쿼리 키·캐시는 이 티켓에서 한 줄도 바뀌지 않았다.
 */

type CauseSummaryPanelProps = {
  breakdown: AiAttributionContent['breakdown'];
  /** `sortByImpact()` 가 절댓값 내림차순으로 정렬해 넘긴 목록 */
  rows: readonly AiAttributionRow[];
  portfolioReturn: number;
  benchmarkReturn: number;
  excessReturn: number;
  onNavigate: (view: CauseView) => void;
};

/** 섹션 사이. 첫 섹션만 선과 여백을 뺀다 — `ContributionRow` 와 같은 처리다. */
const SECTION_CLASS =
  'mt-8 border-t border-border pt-8 first:mt-0 first:border-t-0 first:pt-0';

export function CauseSummaryPanel({
  breakdown,
  rows,
  portfolioReturn,
  benchmarkReturn,
  excessReturn,
  onNavigate,
}: CauseSummaryPanelProps) {
  const { best, worst } = resolveTopContributors(rows);
  // 셋이 다 0 인 기간에는 "어디서 왔나" 에 답할 것이 없다.
  const hasBreakdown = ATTRIBUTION_FACTOR_ORDER.some(
    (factor) => breakdown[factor] !== 0,
  );
  const hasContributors = best !== undefined || worst !== undefined;

  return (
    <div className="mt-7">
      <div className={SECTION_CLASS}>
        <MarketComparison
          portfolioReturn={portfolioReturn}
          benchmarkReturn={benchmarkReturn}
          excessReturn={excessReturn}
        />
      </div>

      {hasBreakdown && (
        <div className={SECTION_CLASS}>
          <PerformanceDriver breakdown={breakdown} />
        </div>
      )}

      {hasContributors && (
        <div className={SECTION_CLASS}>
          <TopContributors
            best={best}
            worst={worst}
            onSeeAll={() => onNavigate('stock')}
          />
        </div>
      )}
    </div>
  );
}
