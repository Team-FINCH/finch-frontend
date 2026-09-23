import { type AiAttributionContent } from '@/shared/types/ai/attribution';

import {
  ATTRIBUTION_FACTOR_LABEL,
  ATTRIBUTION_FACTOR_ORDER,
  describeFactor,
  divergingScale,
  resolveAttributionVerdict,
  resolveMainFactor,
} from '../lib/attributionInsight';

import { AttributionCalcSummary } from './AttributionCalcSummary';
import { AttributionGuideSheet } from './AttributionGuideSheet';
import { ContributionRow } from './ContributionRow';

/**
 * `요인별` 탭의 본문 — 시장·업종·종목 선택 세 축 (FINCH-308 · 333 · 341 · 345).
 *
 * ## 이 파일은 배치만 한다
 *
 * ```
 * 수익률은 이렇게 만들어졌어요            [?]   ← 18/700 + 시트 진입
 * 내 수익률에 어떤 요인이 얼마나 영향을…         ← 14 보조
 *
 * 종목 선택이 시장 영향과 업종 배분을 거의       ← 18/700 이번 기간의 해석
 * 만회했어요.
 * 수익률을 깎은 쪽이 -0.46%p, 올린 쪽이…        ← 13 보조
 *
 * 막대는 0을 가운데 두고, 왼쪽이…               ← 13 읽는 법
 * [요인 3행]                                  ← ContributionRow × 3
 * [수익률 구성]                                ← AttributionCalcSummary
 * ```
 *
 * ## 사용자가 묻던 네 가지에 자리를 하나씩 줬다 (FINCH-345)
 *
 * | 물음 | 답하는 자리 |
 * | --- | --- |
 * | 이 화면이 뭔가 | 제목 아래 설명 줄 + `?` 시트 |
 * | `-0.40%p` 가 무슨 뜻인가 | 요인마다 붙는 `describeFactor` 한 줄 |
 * | 왜 이 셋을 보나 | 해석 한 줄 — 셋이 서로 어떻게 됐는지 |
 * | 어떻게 `-0.04%` 가 됐나 | `AttributionCalcSummary` |
 *
 * ## 결론이 아래에서 위로 올라왔다
 *
 * `종목 선택의 영향이 가장 컸어요.` 가 목록 **아래** 캡션(`InsightNote`)이었다.
 * 두 가지가 문제였다 — 세 값을 보면 이미 아는 사실이었고, 결론인데 목록을 다
 * 읽어야 닿았다. 이 화면에 3~5초 머무는 사람은 거기까지 가지 않는다.
 *
 * 지금은 `resolveAttributionVerdict` 가 **방향이 다른 요인들이 서로 어떻게
 * 됐는지**를 말하고 목록 위에 선다. 여전히 AI 가 쓰지 않는다 — 근거는 그 함수
 * 주석에 있다.
 *
 * **아래 캡션 자리는 비운다.** 같은 해석을 위아래로 두 번 적으면 둘 중 무엇이
 * 결론인지 사라진다. `InsightNote` 는 이 티켓에서 마지막 사용처를 잃었다.
 *
 * ## `ContributionRow` 로 돌아왔다
 *
 * FINCH-333 이 요인 목록과 종목 목록을 한 부품으로 합쳤고, 341 이 요인
 * 쪽을 누적 워터폴로 갈라내며 *"모양이 다른 둘을 한 부품에 담으면 그 부품이
 * 분기로 채워진다"* 고 적었다. **그 전제가 이번에 없어진다** — 요인 막대가 다시
 * 0 을 가운데 둔 발산 막대라 두 탭의 행이 같은 모양이다.
 *
 * 부품을 다시 쓰는 것이 333 이 고쳤던 문제(두 탭의 행 간격·막대 높이·값 크기가
 * 조금씩 갈리는 것)를 **구조적으로** 막는다. 341 이 워터폴을 만들며 그 셋을
 * 실제로 다시 냈고, 그때는 주석의 대조표로 막았다.
 *
 * ## 요인 목록도 `sub` 를 쓴다
 *
 * 그 prop 에 *"요인 목록은 넘기지 않는다 — 요인에는 그 요인 자신의 수익률 같은
 * 값이 없다"* 고 적혀 있었다. 맞는 말이고, 그래서 여기 들어가는 것은 값이
 * 아니라 **문장**이다(`describeFactor`). 종목 쪽 `기간 수익률 +9.12%` 와 자리는
 * 같고 성격이 다르다.
 */

type ReturnAttributionSectionProps = {
  breakdown: AiAttributionContent['breakdown'];
  /** `수익률 구성` 의 도착점. 응답 값 그대로 넘긴다 */
  portfolioReturn: number;
};

export function ReturnAttributionSection({
  breakdown,
  portfolioReturn,
}: ReturnAttributionSectionProps) {
  const verdict = resolveAttributionVerdict(breakdown);
  const mainFactor = resolveMainFactor(breakdown);
  const values = ATTRIBUTION_FACTOR_ORDER.map((factor) => breakdown[factor]);
  const allZero = values.every((value) => value === 0);
  const scale = divergingScale(values);

  return (
    <section>
      {/* 제목과 `?` 가 같은 줄이다. `items-start` 라 제목이 두 줄로 넘어가도
          물음표가 첫 줄 옆에 남는다 — 가운데 정렬이면 두 줄의 중간으로 내려가
          어느 줄에 걸린 것인지 흐려진다. */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-section-title text-pretty break-keep text-text-primary">
          수익률은 이렇게 만들어졌어요
        </h3>
        <AttributionGuideSheet />
      </div>
      <p className="mt-1 text-label text-pretty break-keep text-text-secondary">
        내 수익률에 어떤 요인이 얼마나 영향을 줬는지 보여드려요.
      </p>

      {/* 이번 기간의 해석. **제목과 같은 18/700 이다** — 위 두 줄이 이 화면이
          무엇인지 말하는 틀이라면 이 줄은 그 틀에 대한 답이라, 한 단 내리면
          답이 설명 줄과 같은 무게가 된다. 20px 여백과 색(primary 대 secondary)이
          둘을 가른다.

          면을 두지 않는다. 지시서의 `핵심 결과 카드` 인데 이 화면에서 채워진
          면은 세그먼티드 트랙과 FINCH 차콜 카드 둘뿐이고(`CauseTab`), 여기에
          흰 상자를 놓으면 그 안의 목록이 상자 속 목록이 된다. */}
      <div className="mt-5">
        <p className="text-section-title text-pretty break-keep text-text-primary">
          {verdict.headline}
        </p>
        {verdict.detail !== null && (
          <p className="mt-1.5 text-caption text-pretty break-keep text-text-secondary tabular-nums">
            {verdict.detail}
          </p>
        )}
      </div>

      {/* 막대 읽는 법 (FINCH-345, 사용자 지적).

          *"뭐가 왼쪽 가고 뭐가 긴 거야"* 가 이 화면의 첫 물음이었다. 막대는
          부호를 방향으로, 크기를 길이로 말하는데 **둘 다 다른 행과 견줘야
          보이는** 표현이라 처음 보는 사람에게는 근거가 없다.

          길이 기준(`divergingScale` — 절댓값이 가장 큰 값이 한쪽 절반을 다
          차지한다)은 적지 않는다. 한 줄에 다 넣으면 읽히지 않고, 각 행의
          `describeFactor` 가 크기를 이미 글로 말한다. 여기서는 **방향**만 푼다. */}
      <p className="mt-7 text-caption text-pretty break-keep text-text-muted">
        막대는 0을 가운데 두고, 왼쪽이 수익률을 깎은 쪽 · 오른쪽이 올린
        쪽이에요.
      </p>

      <div className="mt-3">
        {ATTRIBUTION_FACTOR_ORDER.map((factor) => (
          <ContributionRow
            key={factor}
            label={ATTRIBUTION_FACTOR_LABEL[factor]}
            value={breakdown[factor]}
            scale={scale}
            /* 셋이 모두 0 인 기간에는 `lead` 가 없다 — `resolveMainFactor` 는
               절댓값 비교라 그때도 `market` 을 돌려주는데, 아무것도 움직이지
               않은 기간에 하나만 굵게 하면 없는 순위를 만든다. */
            emphasis={!allZero && factor === mainFactor ? 'lead' : 'sub'}
            sub={describeFactor(factor, breakdown[factor])}
          />
        ))}
      </div>

      <AttributionCalcSummary
        breakdown={breakdown}
        portfolioReturn={portfolioReturn}
      />
    </section>
  );
}
