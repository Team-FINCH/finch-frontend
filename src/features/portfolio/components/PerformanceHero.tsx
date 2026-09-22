import {
  formatSignedPercent,
  getPriceDirection,
} from '@/shared/lib/formatNumber';
import { Card } from '@/shared/ui/Card';

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
 * **2차 탭이 생긴 뒤에도 선을 도로 긋지 않았다** (FINCH-333). 이 카드는
 * 이제 세 탭이 공유하는 머리가 되어 더더욱 하나로 읽혀야 한다.
 *
 * ## 값 → 라벨 순서다
 *
 * 금융 화면이라 숫자가 설명보다 먼저 보여야 한다. `기간 수익률` 을 위에 올리고
 * 값을 아래 두면 눈이 라벨을 먼저 밟는다. 그래서 **큰 값이 먼저, 그 값이 무엇인지가
 * 바로 아래** 다. 아래 두 보조 수치도 같은 순서를 쓴다.
 *
 * ## 보조 수치를 한 단 내렸다 (FINCH-333)
 *
 * `시장`·`시장 대비` 가 `text-title-3 font-bold`(18px/700)였다. **섹션 제목
 * (`--text-section-title`, 18px/700)과 크기·굵기가 같았다.** 보조 수치가 제목과
 * 같은 무게로 서 있으면 계단이 서지 않는다 — 36px 에서 곧장 18px 로 떨어지고,
 * 그 18px 이 아래 제목들과 같은 층이라 어디까지가 이 카드인지도 흐렸다.
 *
 * `text-body-1 font-semibold`(16px/600)로 내려 계단을 넷으로 만든다.
 *
 * ```
 * 36 / 700   +2.13%          기간 수익률 (이 화면의 답)
 * 18 / 700   섹션 제목
 * 16 / 600   +0.89%          보조 수치 ← 여기가 18/700 이었다
 * 13 / 400   시장            라벨
 * ```
 *
 * 값을 지우거나 접지 않았다. 읽을 것은 그대로 있고 무게만 내렸다.
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
 * ## 흰 카드로 올렸다 (FINCH-327)
 *
 * 전에는 페이지 배경 위에 그대로 섰다. 카드를 남발하지 않는다는 판단 자체는
 * 그대로지만, **이 화면에서 면을 가질 자격이 있는 것은 여기와 FINCH 해석 둘뿐**
 * 이고 둘 다 지금 면이 없었다.
 *
 * 페이지 배경이 `--color-bg`(#F7F8FA)라 흰 면(`--color-surface`)과 테두리 1px 이면
 * 그림자 없이도 경계가 선다. AI 진단 탭의 `PortfolioRiskSummary` 와 같은 셸이라
 * 두 탭이 같은 모양으로 열린다.
 *
 * ## 탭이 바뀌어도 이 카드는 그대로 선다 (FINCH-333)
 *
 * 2차 탭(`요약`·`기여 분석`·`종목별`) 위에 있고 셋이 공유한다. 어느 탭에서든
 * **"그래서 얼마 벌었나" 가 화면 맨 위에 남아 있어야** 아래 기여도·종목 수치가
 * 무엇의 조각인지 읽힌다. 탭 안으로 넣으면 `기여 분석` 을 보는 동안 기준이 되는
 * 값이 화면에서 사라진다.
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
    <Card className="mt-4">
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
      <dl className="mt-5 flex gap-8">
        <HeroMetric label="시장" text={formatSignedPercent(benchmarkReturn)} />
        <HeroMetric
          label="시장 대비"
          text={formatSignedPercentPoint(excessReturn)}
          ratio={excessReturn}
        />
      </dl>
    </Card>
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
      <dd className={`text-body-1 font-semibold tabular-nums ${tone}`}>
        {text}
      </dd>
    </div>
  );
}
