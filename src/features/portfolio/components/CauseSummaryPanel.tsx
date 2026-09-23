import {
  type AiAttributionContent,
  type AiAttributionRow,
} from '@/shared/types/ai/attribution';
import { Card } from '@/shared/ui/Card';

import {
  ATTRIBUTION_FACTOR_ORDER,
  resolveTopContributors,
  type CauseView,
} from '../lib/attributionInsight';

import { MarketComparison } from './MarketComparison';
import { PerformanceDriver } from './PerformanceDriver';
import { TopContributors } from './TopContributors';

/**
 * `요약` 탭의 분석 본문 — 질문 2·3·4 를 한 장에 순서대로 담는다
 * (FINCH-333).
 *
 * ## 이 화면은 네 질문에 차례로 답한다
 *
 * | | 질문 | 어디서 |
 * | --- | --- | --- |
 * | 1 | 이번 기간 성과가 어땠나 | `PerformanceHero` (탭 밖, 카드 없음) |
 * | 2 | 시장보다 잘했나 | `MarketComparison` |
 * | 3 | 왜 그런 결과가 나왔나 | `PerformanceDriver` |
 * | 4 | 어떤 종목이 영향을 줬나 | `TopContributors` |
 * | 5 | (해설) | `FinchReturnInsight` (이 카드 밖, 연한 패널) |
 *
 * ## 셋을 한 카드에 넣은 이유
 *
 * 전 판은 **상자 넷**이었다 — 히어로 카드 · 요약 카드 · FINCH 검정 카드에 탭 트랙
 * 까지. *"카드가 많고 모두 비슷한 무게라서 시선의 우선순위가 없다"* 는 지적의
 * 실체가 이것이다. 상자마다 테두리와 20px 여백이 붙으면 **내용이 아니라 상자가
 * 리듬을 만든다.**
 *
 * 질문 2·3·4 는 *하나의 분석*이 세 걸음으로 나뉜 것이지 별개의 세 가지가 아니다.
 * 그래서 면은 하나로 두고 **안에서 제목과 구분선으로** 걸음을 나눈다.
 *
 * ```
 * [배경]  이번 기간 수익률 / +2.13% / 시장 +0.89% · 시장 대비 +1.24%p
 * [탭]    요약 | 기여 분석 | 종목별
 * ┌─ 흰 카드 ────────────────────────┐
 * │ 시장과 비교                        │
 * │   막대 둘 + 차이 한 줄              │
 * │ ─────────────────────────────    │
 * │ 초과 성과는 어디서 왔나요?           │
 * │   종목 선택 +1.42%p + 비중 막대     │
 * │ ─────────────────────────────    │
 * │ 성과에 가장 큰 영향을 준 종목        │
 * │   SK하이닉스 / 카카오               │
 * └──────────────────────────────────┘
 * [연한 패널] ✦ FINCH 한줄 분석
 * ```
 *
 * 화면의 면은 셋이고 **무게가 다 다르다** — 배경(히어로) · 흰 카드(분석) ·
 * 연한 회색(해설). 전에는 넷이 전부 비슷했다.
 *
 * ## 섹션 제목이 위계를 만든다
 *
 * 세 제목은 `text-body-2 font-bold`(15px/700)다. 히어로 숫자(36px) → 요인 1위
 * (18px) → 섹션 제목(15px) → 본문(15px/400) → 캡션(13px) 으로 계단이 선다.
 * **제목을 본문보다 작게 두지 않되 크게도 두지 않는다** — 카드 안의 소제목이라
 * `--text-section-title`(18px/700)을 쓰면 그 안의 `종목 선택 +1.42%p` 와 같은
 * 무게가 되어 무엇이 답이고 무엇이 항목 이름인지 흐려진다.
 *
 * ## 구분선은 섹션 사이에만 있다
 *
 * 섹션 **안**에는 선을 긋지 않는다. 한 걸음이 여러 줄이어도 그것은 한 덩어리이고,
 * 선이 안팎에 다 있으면 다시 "상자 구조" 로 돌아간다. 값은
 * `--color-divider` — 카드 안에서 내용 덩어리를 가르라고 만든 토큰이다.
 *
 * ## 값을 새로 만들지 않는다
 *
 * 세 섹션 모두 엔진 값이다 — `benchmarkReturn`·`excessReturn`(비교),
 * `breakdown`(요인), `contributors`/`detractors`(종목). 프론트가 하는 계산은
 * 정렬·argmax·막대 폭뿐이고, 요청·응답·쿼리 키는 이 티켓에서 한 줄도 바뀌지
 * 않았다 (`attributionInsight.ts` 가 못박은 선).
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

/** 섹션 사이 구분선. 첫 섹션만 뺀다 — `ContributionRow` 와 같은 처리다. */
const SECTION_CLASS =
  'mt-5 border-t border-divider pt-5 first:mt-0 first:border-t-0 first:pt-0';

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
    <Card className="mt-4">
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
    </Card>
  );
}
