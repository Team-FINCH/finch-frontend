import {
  formatSignedPercent,
  getPriceDirection,
} from '@/shared/lib/formatNumber';

import { formatSignedPercentPoint } from '../lib/attributionInsight';

/**
 * 화면에서 가장 먼저 읽히는 자리 (FINCH-308).
 *
 * ## 세 숫자를 하나의 성과로 묶는다
 *
 * 전에는 `기간 수익률 / +2.13% / 21거래일` 위에 divider 를 긋고 그 아래 `시장`·
 * `초과수익` 을 나란히 뒀다. 선 하나가 **하나의 성과 정보를 둘로 갈라** 위아래가
 * 서로 다른 이야기처럼 보였다. 선을 걷고 여백으로만 묶는다.
 *
 * ## 값 → 라벨 순서다
 *
 * 금융 화면이라 숫자가 설명보다 먼저 보여야 한다. `기간 수익률` 을 위에 올리고
 * 값을 아래 두면 눈이 라벨을 먼저 밟는다. 그래서 **큰 값이 먼저, 그 값이 무엇인지가
 * 바로 아래** 다. 아래 두 보조 수치도 같은 순서를 쓴다.
 *
 * ## `초과수익` 대신 `시장 대비`
 *
 * `excessReturn` 의 사전적 번역은 초과수익이지만 그 말을 아는 사용자에게만 통한다.
 * 화면이 답하는 질문은 "시장보다 얼마나 잘했나" 이므로 그 질문의 말을 그대로 쓴다.
 * 값의 뜻은 바뀌지 않는다.
 *
 * ## 단위
 *
 * 기간 수익률·시장은 `%`, 시장 대비는 `%p` 다. 두 퍼센트의 차라서 그렇다 —
 * 근거는 `attributionInsight.ts` 의 `formatSignedPercentPoint` 주석에 있다.
 *
 * 카드로 감싸지 않는다. 페이지 배경 위에 그대로 선다.
 */

const RATIO_TEXT_CLASS = {
  rise: 'text-stock-up',
  fall: 'text-stock-down',
  flat: 'text-stock-neutral',
} as const;

type PerformanceHeroProps = {
  /** 기간 수익률. 0~1 소수다 (백엔드 `changeRate` 계열의 백분율과 다르다) */
  portfolioReturn: number;
  /** 보유 종목 유니버스를 시가총액으로 합성한 시장 전체 수익률 */
  benchmarkReturn: number;
  /** `portfolioReturn - benchmarkReturn`. 엔진이 계산해 내려준다 */
  excessReturn: number;
  /** 되짚은 거래일 수. `period` 만으로는 알 수 없어 응답이 따로 준다 */
  tradingDays: number;
};

export function PerformanceHero({
  portfolioReturn,
  benchmarkReturn,
  excessReturn,
  tradingDays,
}: PerformanceHeroProps) {
  return (
    <section className="pt-6">
      <p
        className={`text-display tabular-nums ${RATIO_TEXT_CLASS[getPriceDirection(portfolioReturn)]}`}
      >
        {formatSignedPercent(portfolioReturn)}
      </p>

      {/* 거래일 수는 방향이 없는 개수라 등락색을 얹지 않는다. */}
      <p className="mt-1 text-body-2 text-text-secondary">
        최근 {tradingDays}거래일 수익률
      </p>

      {/* gap-8 로만 갈린다 — 두 값을 나누는 선을 두지 않는다. */}
      <dl className="mt-7 flex gap-8">
        <HeroMetric label="시장" text={formatSignedPercent(benchmarkReturn)} />
        <HeroMetric
          label="시장 대비"
          text={formatSignedPercentPoint(excessReturn)}
          ratio={excessReturn}
        />
      </dl>
    </section>
  );
}

/**
 * 보조 수치 하나. 값이 위, 라벨이 아래다.
 *
 * `ratio` 를 넘기면 등락색이 붙는다. **시장 수익률에는 넘기지 않는다** — 그 값은
 * 사용자의 성과가 아니라 비교 기준이라 잘잘못의 색을 입히면 읽는 사람이 자기
 * 성과로 오인한다. 색이 뜻을 갖는 자리는 "내가 시장보다 나았는가" 하나다.
 */
function HeroMetric({
  label,
  text,
  ratio,
}: {
  label: string;
  text: string;
  ratio?: number;
}) {
  const tone =
    ratio === undefined
      ? 'text-text-primary'
      : RATIO_TEXT_CLASS[getPriceDirection(ratio)];

  return (
    <div className="flex min-w-0 flex-col-reverse">
      <dt className="mt-0.5 text-caption text-text-muted">{label}</dt>
      <dd className={`text-title-3 font-bold tabular-nums ${tone}`}>{text}</dd>
    </div>
  );
}
