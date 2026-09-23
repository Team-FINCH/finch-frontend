import { formatSignedPercent } from '@/shared/lib/formatNumber';
import { type AiAttributionContent } from '@/shared/types/ai/attribution';

import {
  ATTRIBUTION_FACTOR_LABEL,
  ATTRIBUTION_FACTOR_ORDER,
  divergingScale,
  resolveAttributionVerdict,
  resolveMainFactor,
} from '../lib/attributionInsight';

import { AttributionGuideSheet } from './AttributionGuideSheet';
import { ContributionRow } from './ContributionRow';

/**
 * `요인별` 탭 — 시장·업종·종목 선택 세 축과 그 합
 * (FINCH-308 · 333 · 341 · 345).
 *
 * ```
 * 수익률은 이렇게 만들어졌어요                      [?]
 *
 * 종목 선택이 시장 영향과 업종 배분을 거의 만회했어요.
 *
 * 수익률을 낮춤            0            수익률을 높임   ← 축 라벨
 * 시장 영향                            -0.40%p
 *    ░░░░░░░░████████│░░░░░░░░░░░░░░
 * 업종 배분                            -0.06%p
 *    ░░░░░░░░░░░░░░██│░░░░░░░░░░░░░░
 * 종목 선택                            +0.42%p
 *    ░░░░░░░░░░░░░░░░│██████████████
 * ───────────────────────────────────────────
 * 내 수익률                             -0.04%
 * ```
 *
 * ## 설명을 차트로 옮겼다 (FINCH-345, 사용자 지적)
 *
 * 첫 판은 같은 자리에 산문이 열한 줄이었다 — 제목 아래 설명 줄, 해석 두 줄, 막대
 * 읽는 법 한 줄, 요인마다 붙는 설명 셋, 그리고 아래 `수익률 구성` 블록. **설명이
 * 많아져서 오히려 안 보였다.**
 *
 * 그 글들이 말하던 것을 둘이 대신한다.
 *
 * | 걷어낸 글 | 대신하는 것 |
 * | --- | --- |
 * | `전체 시장의 움직임이 내 수익률을 0.40%p 낮췄어요` ×3 | **축 라벨 한 줄** |
 * | `막대는 0을 가운데 두고, 왼쪽이…` | 〃 |
 * | `내 수익률에 어떤 요인이 얼마나…` | 제목 옆 `?` |
 * | `수익률 구성` 블록 (같은 숫자 셋 + 합계) | **최종 행이 같은 차트 안으로** |
 *
 * **세 번 반복하던 말을 축 하나로 옮긴 것**이 요점이다. `낮춤 / 0 / 높임` 은 세
 * 행에 한 번만 서지만 세 행 모두에 걸리고, 행이 늘어도 길어지지 않는다.
 *
 * ## 최종 수익률이 같은 차트의 마지막 행이다
 *
 * 전 판은 `수익률 구성` 이라는 별도 블록에 **같은 숫자 셋을 한 번 더** 적고 그
 * 아래 합계를 뒀다. 덧셈 관계는 보였지만 한 화면에 같은 값이 두 벌 섰다.
 *
 * 지금은 위 목록의 오른쪽 숫자 열이 그대로 이어지고 선 하나 뒤에 도착점이 온다.
 * 열이 하나면 덧셈은 그 열을 따라 내려가는 것으로 읽힌다 — **블록을 더하지 않고
 * 관계를 얻는다.**
 *
 * 막대를 주지 않는 것이 이 행을 요인과 가른다. 이 줄은 흐름의 한 걸음이 아니라
 * 걸음들이 닿은 자리다. 단위도 다르다 — 위 셋은 `%p`(수익률의 조각), 이쪽은
 * `%`(원금 대비)다.
 *
 * **값을 만들지 않는다.** 세 요인을 더한 결과가 아니라 응답의 `portfolioReturn`
 * 이고, `PerformanceHero` 와 같은 `formatSignedPercent` 를 쓴다. 엔진이 AI 명세
 * §6.3 에서 항등식을 검증하므로 값은 같지만, 부동소수 덧셈으로 만들면 끝자리가
 * 갈리는 날 화면이 자기 자신과 어긋난다.
 *
 * ## 결론 한 줄은 위에 남는다
 *
 * `종목 선택의 영향이 가장 컸어요.` 가 목록 **아래** 캡션이었다. 세 값을 보면
 * 이미 아는 사실이었고, 결론인데 목록을 다 읽어야 닿았다.
 *
 * 축이 말할 수 없는 것이 하나 있어서 이 줄만 남겼다 — **방향이 다른 요인들이
 * 서로 어떻게 됐는가.** 나머지 설명은 `AttributionGuideSheet` 로 보냈다.
 *
 * ## `ContributionRow` 로 돌아왔다
 *
 * 341 이 요인 쪽을 누적 워터폴로 갈라내며 *"모양이 다른 둘을 한 부품에 담으면 그
 * 부품이 분기로 채워진다"* 고 적었다. **그 전제가 없어진다** — 요인 막대가 다시
 * 0 을 가운데 둔 발산 막대라 두 탭의 행이 같은 모양이다.
 */

type ReturnAttributionSectionProps = {
  breakdown: AiAttributionContent['breakdown'];
  /** 마지막 행의 도착점. 응답 값 그대로 넘긴다 */
  portfolioReturn: number;
};

export function ReturnAttributionSection({
  breakdown,
  portfolioReturn,
}: ReturnAttributionSectionProps) {
  const mainFactor = resolveMainFactor(breakdown);
  const values = ATTRIBUTION_FACTOR_ORDER.map((factor) => breakdown[factor]);
  const allZero = values.every((value) => value === 0);
  const scale = divergingScale(values);

  return (
    <section>
      {/* 제목과 `?` 가 같은 줄이다. `items-start` 라 제목이 두 줄로 넘어가도
          물음표가 첫 줄 옆에 남는다. */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-section-title text-pretty break-keep text-text-primary">
          수익률은 이렇게 만들어졌어요
        </h3>
        <AttributionGuideSheet />
      </div>

      {/* 이 탭에서 산문은 이 한 줄뿐이다.

          **제목보다 가볍다** (FINCH-345). 한때 제목과 같은 18/700 primary
          였는데, 그러면 두 줄짜리 문장이 화면에서 가장 무거운 덩어리가 되어
          제목을 덮었다(사용자 지적). 지금은 16/600 secondary 다 — 제목(18/700
          primary)보다 크기·굵기·색이 모두 한 단 아래고, 아래 요인 라벨(16/500·600)
          보다는 굵어서 그 사이에 선다.

          **그래프를 보기 전에 한 번 읽는 줄**이지 결론을 대신하는 줄이 아니다.
          줄 높이는 `--text-body-1` 이 24/16 = 1.5 로 이미 갖고 있다.

          `text-pretty break-keep` 이 두 줄로 떨어질 때 마지막 줄에 한 단어만
          남는 것과 단어 중간에서 끊기는 것을 막는다. */}
      <p className="mt-4 text-body-1 font-semibold text-pretty break-keep text-text-secondary">
        {resolveAttributionVerdict(breakdown)}
      </p>

      {/* 축 라벨 (FINCH-345, 사용자 지적).

          *"뭐가 왼쪽 가고 뭐가 긴 거야"* 가 이 화면의 첫 물음이었다. 전 판은
          그 답을 요인마다 문장으로 세 번 적었고, 그래서 글이 차트를 덮었다.
          축에 이름을 붙이면 **한 번만 적고 세 행 모두에 걸린다.**

          `0` 이 가운데 서는 것이 `DivergingBar` 의 0 축과 같은 자리(`left-1/2`)라
          라벨과 세로선이 한 열로 이어진다. 막대가 트랙 폭을 다 쓰므로 이 줄도
          들여쓰지 않는다.

          **낭독기에 내보내지 않는다.** 방향은 각 행의 값이 `+`/`-` 로 이미 말하고
          있어서, 읽어 주면 같은 사실이 한 번 더 나온다 — `DivergingBar` 와 같은
          판단이다.

          길이 기준(`divergingScale` — 절댓값이 가장 큰 값이 한쪽 절반을 다
          차지한다)은 적지 않는다. 축이 답하는 것은 **방향**이고, 크기는 값이
          바로 옆에 있어 막대를 읽지 않아도 된다. */}
      <div
        aria-hidden="true"
        className="relative mt-7 flex justify-between text-caption text-text-muted"
      >
        <span>수익률을 낮춤</span>
        <span className="absolute left-1/2 -translate-x-1/2 tabular-nums">
          0
        </span>
        <span>수익률을 높임</span>
      </div>

      <div className="mt-2">
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
          />
        ))}
      </div>

      {/* 도착점. 위 셋과 달리 막대가 없다 — 이 줄은 흐름의 한 걸음이 아니라
          걸음들이 닿은 자리다. 선 하나로 갈라 둔다.

          등락색은 여기만 쓴다. 위 세 값도 색을 갖지만 그쪽은 막대와 짝이고,
          이 줄은 색이 곧 결론이다. */}
      <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-border pt-4">
        <span className="min-w-0 truncate text-body-1 font-semibold text-text-primary">
          내 수익률
        </span>
        <span
          className={`flex-none text-title-2 whitespace-nowrap tabular-nums ${
            portfolioReturn === 0
              ? 'text-stock-neutral'
              : portfolioReturn > 0
                ? 'text-stock-up-muted'
                : 'text-stock-down-muted'
          }`}
        >
          {formatSignedPercent(portfolioReturn)}
        </span>
      </div>
    </section>
  );
}
