import { formatSignedPercent } from '@/shared/lib/formatNumber';
import { type AiAttributionContent } from '@/shared/types/ai/attribution';

import {
  ATTRIBUTION_FACTOR_LABEL,
  ATTRIBUTION_FACTOR_ORDER,
  formatSignedPercentPoint,
} from '../lib/attributionInsight';

/**
 * `수익률 구성` — 세 요인과 최종 수익률의 덧셈 관계 (FINCH-345).
 *
 * ```
 * 수익률 구성
 * 시장 영향                    -0.40%p
 * 업종 배분                    -0.06%p
 * 종목 선택                    +0.42%p
 * ─────────────────────────────────────
 * 내 수익률                     -0.04%
 * ```
 *
 * ## 워터폴이 하던 일을 넘겨받는다
 *
 * FINCH-341 은 이 관계를 **그림으로** 말했다 — 막대가 앞 요인이 끝난 자리에서
 * 시작하는 누적 흐름이었다. 그 그림은 누적 경로가 0 을 넘나들 때만 읽힌다.
 * 세 값이 `-0.40 · -0.06 · +0.42` 면 누적이 `0 → -0.40 → -0.46 → -0.04` 라
 * **전 구간이 0 이하**이고, 0 기준선이 트랙 오른쪽 끝에 붙어 양수 막대가 화면
 * 맨 왼쪽에서 출발한다. 부호와 막대 방향이 서로 반대로 읽혔다.
 *
 * 그래서 두 가지 일을 나눴다 — **막대는 부호와 크기**(`DivergingBar`, 0 이 언제나
 * 가운데), **이 블록은 덧셈**. 하나의 그림에 두 뜻을 싣지 않는다.
 *
 * ## 합계 규칙의 세 번째 판이다
 *
 * | | 규칙 | 이유 |
 * | --- | --- | --- |
 * | 333 | 합계를 적지 않는다 | 같은 값이 `PerformanceHero` 에 가장 크게 있다 |
 * | 341 | 흐름의 도착점에만 적는다 | 도착점 없는 워터폴은 어긋난 막대 셋이다 |
 * | 345 | 덧셈을 보이는 자리에 적는다 | 관계를 그림이 말하지 못하게 됐다 |
 *
 * 333 의 걱정(한 수치를 두 곳에 적으면 포맷이 갈린다)은 그대로 유효하고,
 * **값과 포매터를 묶어** 막는다 — 아래 «값을 만들지 않는다» 참고.
 *
 * ## 값을 만들지 않는다
 *
 * 최종 줄은 세 값을 더한 결과가 **아니다.** 응답의 `portfolioReturn` 을 그대로
 * 적고, `PerformanceHero` 와 같은 `formatSignedPercent` 를 쓴다. 엔진이 AI 명세
 * §6.3 에서 항등식(`market + sector + selection = portfolioReturn`)을 검증하므로
 * 값은 같지만, 부동소수 덧셈으로 만들면 끝자리가 갈리는 날 화면이 자기 자신과
 * 어긋난다.
 *
 * **단위가 다른 것이 맞다.** 위 셋은 `%p`(수익률의 조각), 최종은 `%`(원금 대비)다.
 * 그 차이는 `AttributionGuideSheet` 가 푼다.
 *
 * ## 등락색은 마지막 줄만 쓴다
 *
 * 위 세 줄은 중립색이다. 바로 위 목록이 같은 세 값을 이미 등락색 + 막대로
 * 칠했으므로, 여기서 또 칠하면 **한 화면의 등락색 요소가 두 배가 되고 어느 것이
 * 결론인지 흐려진다**(FINCH-333 이 탭을 가른 이유 2번과 같은 판단).
 *
 * 이 블록에서 색이 뜻을 갖는 자리는 도착점 하나다. 부호는 세 줄 모두
 * `formatSignedPercentPoint` 가 `+`/`-` 로 적고 있어 색 없이도 읽힌다.
 *
 * ## 상자를 쓰지 않는다
 *
 * 면도 테두리도 없다. 위 목록과는 1px 선 + 위아래 여백으로 갈린다 — 이 화면에서
 * 채워진 면은 세그먼티드 트랙과 FINCH 차콜 카드 둘뿐이라는 `CauseTab` 의 선을
 * 그대로 따른다. 표를 상자에 넣으면 그 순간 계산기가 된다.
 */

type AttributionCalcSummaryProps = {
  breakdown: AiAttributionContent['breakdown'];
  /** 도착점. 누적 결과가 아니라 응답 값 그대로다 */
  portfolioReturn: number;
};

export function AttributionCalcSummary({
  breakdown,
  portfolioReturn,
}: AttributionCalcSummaryProps) {
  return (
    <div className="mt-8 border-t border-border pt-6">
      {/* `h4` 다 — `h3` 는 이 패널의 `수익률은 이렇게 만들어졌어요`, `h2` 는 패널
          밖 `수익률 상세 분석` 이 갖는다. 크기는 14px 라 제목 계단의 맨 아래
          칸이고, 이 블록이 새 섹션이 아니라 앞 목록의 마무리라는 뜻이다. */}
      <h4 className="text-label text-text-secondary">수익률 구성</h4>

      <dl className="mt-3">
        {ATTRIBUTION_FACTOR_ORDER.map((factor) => (
          <div
            key={factor}
            className="flex items-baseline justify-between gap-3 py-1"
          >
            <dt className="min-w-0 truncate text-body-2 text-text-secondary">
              {ATTRIBUTION_FACTOR_LABEL[factor]}
            </dt>
            <dd className="flex-none text-body-2 whitespace-nowrap text-text-secondary tabular-nums">
              {formatSignedPercentPoint(breakdown[factor])}
            </dd>
          </div>
        ))}

        {/* 도착점. 선 하나로 갈라 둔다 — 위 셋은 조각이고 이 줄은 그 조각들이
            닿은 자리다. */}
        <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-border pt-3">
          <dt className="min-w-0 truncate text-body-1 font-semibold text-text-primary">
            내 수익률
          </dt>
          <dd
            className={`flex-none text-title-2 whitespace-nowrap tabular-nums ${
              portfolioReturn === 0
                ? 'text-stock-neutral'
                : portfolioReturn > 0
                  ? 'text-stock-up-muted'
                  : 'text-stock-down-muted'
            }`}
          >
            {formatSignedPercent(portfolioReturn)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
