import { formatSignedPercent } from '@/shared/lib/formatNumber';
import { type AiAttributionContent } from '@/shared/types/ai/attribution';

import {
  ATTRIBUTION_FACTOR_DESCRIPTION,
  ATTRIBUTION_FACTOR_LABEL,
  formatSignedPercentPoint,
  resolveMainFactor,
  resolveWaterfall,
  waterfallBar,
  waterfallZero,
} from '../lib/attributionInsight';

/**
 * 수익률이 어떻게 만들어졌는지 — 세 요인의 **누적 흐름** (FINCH-341).
 *
 * ## 무엇을 고쳤나
 *
 * 전에는 요인 셋이 각자 0 을 가운데 둔 막대로 나란히 서 있었다. 길이는 견줄 수
 * 있었지만 **셋이 서로 어떤 관계인지가 화면에 없었다** — 더하면 기간 수익률이
 * 된다는 사실을 사용자가 머릿속으로 이어야 했다(사용자 지적 1·2·3번).
 *
 * 이제 막대가 **앞 요인이 끝난 자리에서 시작한다.** 0 에서 출발해 시장이 밀고,
 * 업종이 조금 당기고, 선택이 다시 밀어 최종에 닿는 한 줄기다.
 *
 * ```
 * 시장 움직임                              +0.89%p
 * │      ████████
 * 시장 전체가 움직인 만큼이에요.
 *
 * 업종 배분                                -0.18%p
 * │             ██
 * 어떤 업종에 얼마나 담았는지의 몫이에요.
 *
 * 종목 선택                                +1.42%p
 * │           ████████████
 * 업종 안에서 어떤 종목을 골랐는지의 몫이에요.
 * ─────────────────────────────────────────────
 * 최종 수익률                               +2.13%
 * ```
 *
 * ## 최종 줄을 두는 것이 규칙을 하나 바꾼다
 *
 * `ReturnAttributionSection` 은 **합계를 적지 않는다**는 규칙을 갖고 있었다
 * (FINCH-333) — 같은 값이 위 `PerformanceHero` 에 이미 가장 크게 있고, 한
 * 수치를 두 곳에 적으면 포맷이 갈라지는 날 둘이 달라 보인다는 이유였다.
 *
 * **흐름에는 도착점이 있어야 한다.** 0 에서 출발한 막대가 어디에 닿는지 적지
 * 않으면 워터폴이 아니라 그냥 어긋나게 배치된 막대 셋이다. 그래서 규칙을 좁힌다 —
 * *합계를 본문 중간에 큰 숫자로 세우지 않는다* 로 두고, 흐름의 마지막 칸에는 적는다.
 *
 * 갈라질 위험은 **값과 포맷을 하나로 묶어** 막는다. 누적한 결과가 아니라 응답의
 * `portfolioReturn` 을 그대로 쓰고, `PerformanceHero` 와 같은
 * `formatSignedPercent` 를 쓴다. 두 자리가 다른 값을 보일 방법이 없다.
 *
 * **단위가 다른 것이 맞다.** 요인 셋은 `%p`(수익률의 조각)이고 최종은 `%`다.
 *
 * ## 색은 저채도 짝이다
 *
 * `--color-stock-*-muted`. 확정값(`--color-stock-up`)을 쓰는 자리는 이 화면에서
 * 성과 히어로의 큰 수익률 하나뿐이고, 여기는 그 값을 이루는 조각이라 한 단
 * 내린다(`ContributionRow` 와 같은 판단). 0 은 중립색이다.
 *
 * ## 0 기준선
 *
 * 트랙 전체가 누적이 지나간 범위(`min ~ max`)를 덮고, 그 안에서 0 이 있는
 * 자리에 세로선을 세운다. **가운데가 아니다** — 세 요인이 모두 양수면 0 은 왼쪽
 * 끝이다. `resolveWaterfall` 이 범위 후보에 언제나 0 을 끼워서 선이 트랙 밖으로
 * 나가지 않는다.
 *
 * ## `ContributionRow` 를 쓰지 않는다
 *
 * FINCH-333 이 요인 목록과 종목 목록을 한 부품으로 합친 이유는 **둘이 같은
 * 모양의 목록**이어서였다(간격이 16px 대 14px 로 갈려 있었다). 요인 쪽이 누적
 * 흐름이 되면서 그 전제가 깨진다 — 종목 목록은 여전히 각자 0 축을 가운데 둔
 * 독립 막대고, 이쪽은 앞 칸에 이어 붙는 막대다. **모양이 다른 둘을 한 부품에
 * 담으면 그 부품이 분기로 채워진다.**
 */

type AttributionWaterfallProps = {
  breakdown: AiAttributionContent['breakdown'];
  /** 최종 줄에 적는다. 누적 결과가 아니라 응답 값 그대로다 */
  portfolioReturn: number;
};

export function AttributionWaterfall({
  breakdown,
  portfolioReturn,
}: AttributionWaterfallProps) {
  const waterfall = resolveWaterfall(breakdown);
  const mainFactor = resolveMainFactor(breakdown);
  const allZero = waterfall.steps.every((step) => step.value === 0);
  const zeroLeft = waterfallZero(waterfall);

  return (
    <div>
      {waterfall.steps.map((step) => {
        const { left, width } = waterfallBar(step, waterfall);
        const lead = !allZero && step.factor === mainFactor;

        return (
          <div key={step.factor} className="mt-4 first:mt-0">
            <div className="flex items-baseline justify-between gap-3">
              <span
                className={`min-w-0 truncate text-body-2 ${
                  lead
                    ? 'font-bold text-text-primary'
                    : 'font-medium text-text-secondary'
                }`}
              >
                {ATTRIBUTION_FACTOR_LABEL[step.factor]}
              </span>
              <span
                className={`flex-none text-body-1 font-bold whitespace-nowrap tabular-nums ${valueColor(step.value)}`}
              >
                {formatSignedPercentPoint(step.value)}
              </span>
            </div>

            {/* 막대. 트랙은 `DivergingBar` 와 같은 높이·반경·면색이라 종목별 탭과
                결이 갈리지 않는다. 다른 것은 칸이 서는 자리 하나다. */}
            <span
              aria-hidden="true"
              className="relative mt-1.5 block h-2.5 w-full rounded-[3px] bg-chart-track"
            >
              <span
                className="absolute -top-[3px] -bottom-[3px] w-px -translate-x-1/2 bg-border-strong"
                style={{ left: `${zeroLeft}%` }}
              />
              {step.value !== 0 && (
                <span
                  className={`absolute inset-y-0 rounded-[3px] ${
                    step.value > 0 ? 'bg-stock-up-muted' : 'bg-stock-down-muted'
                  }`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              )}
            </span>

            <p className="mt-1.5 text-caption text-pretty break-keep text-text-muted">
              {ATTRIBUTION_FACTOR_DESCRIPTION[step.factor]}
            </p>
          </div>
        );
      })}

      {/* 도착점. 위 세 칸과 달리 막대가 없다 — 이 줄은 흐름의 한 걸음이 아니라
          걸음들이 닿은 자리다. 선 하나로 갈라 둔다. */}
      <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-divider pt-3.5">
        <span className="min-w-0 truncate text-body-2 font-medium text-text-secondary">
          최종 수익률
        </span>
        <span
          className={`flex-none text-title-2 font-bold whitespace-nowrap tabular-nums ${valueColor(portfolioReturn)}`}
        >
          {formatSignedPercent(portfolioReturn)}
        </span>
      </div>
    </div>
  );
}

/** 값 하나의 색. 0 은 방향이 없으므로 등락색을 얹지 않는다. */
function valueColor(value: number): string {
  if (value === 0) {
    return 'text-stock-neutral';
  }
  return value > 0 ? 'text-stock-up-muted' : 'text-stock-down-muted';
}
