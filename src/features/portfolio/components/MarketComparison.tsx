import { formatSignedPercent } from '@/shared/lib/formatNumber';

import { formatSignedPercentPoint } from '../lib/attributionInsight';

/**
 * 질문 2의 그림 — "시장보다 잘했나 못했나" (FINCH-333).
 *
 * ## 숫자가 이미 있는데 왜 또 그리나
 *
 * 히어로에 `시장 +0.89%` 와 `시장 대비 +1.24%p` 가 이미 있다. 그런데 **두 값의
 * 관계는 숫자로 읽어야 알 수 있다** — `+2.13` 과 `+0.89` 를 보고 머릿속에서 빼야
 * "두 배 넘게 앞섰다" 가 나온다. 막대 둘은 그 뺄셈을 눈이 대신한다.
 *
 * ```
 * 내 포트폴리오  ████████████████████  +2.13%
 * 시장          ████████              +0.89%
 *                       └──────────┘  +1.24%p 앞섰어요
 * ```
 *
 * ## 축도 격자도 라벨도 없다
 *
 * 값 둘을 견주는 그림이라 **스케일은 둘 중 절댓값이 큰 쪽**이면 충분하다. 0 부터
 * 시작하는 단순 막대라 `DivergingBar` 를 쓰지 않는다 — 그쪽은 0 을 가운데 두고
 * 좌우로 뻗는 발산 막대이고, 여기 두 값은 같은 방향일 때가 대부분이라 절반을
 * 비워 두면 막대가 전부 오른쪽에 몰린다.
 *
 * **둘이 부호가 갈리는 기간이 있다**(내 -1.2%, 시장 +0.4%). 그때도 각자 자기
 * 길이만큼 왼쪽에서 뻗고 색으로 방향을 말한다 — 축을 옮기지 않는 이유는 한 쌍을
 * 견주는 그림에서 기준선이 움직이면 길이 비교가 무너지기 때문이다.
 *
 * ## 시장 막대에는 등락색을 얹지 않는다
 *
 * `PerformanceHero.HeroMetric` 과 같은 규칙이다 — 시장은 사용자의 성과가 아니라
 * 비교 기준이라 잘잘못의 색을 입히면 자기 성과로 오인한다. 중립 회색으로 둔다.
 * 내 막대만 저채도 등락색이다.
 *
 * ## 차이는 막대가 아니라 글자로 적는다
 *
 * 두 막대 사이 간격을 괄호로 묶는 그림도 생각했지만, 1px 선 둘과 캡션이 더해지면
 * **막대 둘보다 장식이 많아진다.** 차이값은 이 카드가 답하는 것 자체라 그냥
 * 한 줄로 크게 적는 편이 빠르다. 막대는 "얼마나 차이 나는지" 를 어림잡게 하고,
 * 정확한 값은 그 아래 글자가 말한다.
 */

type MarketComparisonProps = {
  portfolioReturn: number;
  benchmarkReturn: number;
  excessReturn: number;
};

/** 막대가 아예 보이지 않는 것을 막는 하한. `divergingWidth` 와 같은 취지다. */
const MIN_VISIBLE_WIDTH = 2;

function barWidth(value: number, scale: number): number {
  if (value === 0) {
    return 0;
  }
  return Math.max((Math.abs(value) / scale) * 100, MIN_VISIBLE_WIDTH);
}

export function MarketComparison({
  portfolioReturn,
  benchmarkReturn,
  excessReturn,
}: MarketComparisonProps) {
  const scale =
    Math.max(Math.abs(portfolioReturn), Math.abs(benchmarkReturn)) || 1;

  return (
    <section>
      <h3 className="text-body-2 font-bold text-text-primary">시장과 비교</h3>

      <div className="mt-3.5 flex flex-col gap-2.5">
        <ComparisonBar
          label="내 포트폴리오"
          value={portfolioReturn}
          width={barWidth(portfolioReturn, scale)}
          tone={portfolioReturn >= 0 ? 'up' : 'down'}
        />
        <ComparisonBar
          label="시장"
          value={benchmarkReturn}
          width={barWidth(benchmarkReturn, scale)}
          tone="neutral"
        />
      </div>

      <p className="mt-3.5 text-caption text-text-secondary">
        시장보다{' '}
        <strong className="font-bold text-text-primary tabular-nums">
          {formatSignedPercentPoint(excessReturn)}
        </strong>{' '}
        {excessReturn >= 0 ? '앞섰어요' : '뒤졌어요'}
      </p>
    </section>
  );
}

const BAR_CLASS = {
  up: 'bg-stock-up-muted',
  down: 'bg-stock-down-muted',
  neutral: 'bg-border-strong',
} as const;

/**
 * 막대 한 줄. 라벨(왼쪽, 고정 폭) · 막대(가변) · 값(오른쪽, 고정 폭)이다.
 *
 * **라벨 폭을 고정한다.** `내 포트폴리오` 와 `시장` 은 글자 수가 크게 달라서
 * 자동 폭으로 두면 두 막대의 시작점이 어긋나고, 그러면 길이 비교 자체가 무의미해진다.
 * 막대 차트에서 기준선이 한 줄로 서는 것이 가장 중요하다.
 */
function ComparisonBar({
  label,
  value,
  width,
  tone,
}: {
  label: string;
  value: number;
  width: number;
  tone: keyof typeof BAR_CLASS;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[68px] flex-none truncate text-caption text-text-secondary">
        {label}
      </span>

      <span
        aria-hidden="true"
        className="h-2 min-w-0 flex-1 rounded-[3px] bg-chart-track"
      >
        <span
          className={`block h-full rounded-[3px] ${BAR_CLASS[tone]}`}
          style={{ width: `${width}%` }}
        />
      </span>

      <span className="w-[62px] flex-none text-right text-caption font-semibold text-text-primary tabular-nums">
        {formatSignedPercent(value)}
      </span>
    </div>
  );
}
