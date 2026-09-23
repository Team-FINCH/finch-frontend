import {
  formatSignedPercent,
  getPriceDirection,
} from '@/shared/lib/formatNumber';

import { formatSignedPercentPoint } from '../lib/attributionInsight';

/**
 * 화면의 시작점 — 질문 1·2 "이번 기간 성과가 어땠나 / 시장보다 잘했나"
 * (FINCH-308 · 333).
 *
 * ## 면이 없다
 *
 * 페이지 배경 위에 글자만 선다. 테두리도 카드도 없으니 **36px 숫자 자체가 이
 * 화면에서 가장 무거운 것**이 되고, 눈이 들어오자마자 `+2.13%` 에 닿는다.
 * 전에는 흰 카드 + 1px 테두리 + 20px 여백이 이 숫자를 감싸고 있어서 상자가
 * 먼저 읽혔다.
 *
 * ## 라벨 → 값 → 비교 순이다
 *
 * ```
 * 이번 기간 수익률                      13px muted
 * +2.13%                              36px/700
 * 시장 +0.89% · 시장보다 +1.24%p        15px, %p 만 강조
 * 최근 21거래일 기준                     13px muted
 * ```
 *
 * 전에는 큰 값이 먼저, 라벨이 아래였다(*"금융 화면이라 숫자가 설명보다 먼저"*).
 * 면이 없어지면 덩어리의 시작을 표시하는 것이 사라져서, 13px 라벨이 머리 노릇을
 * 해야 36px 숫자가 어디서부터 시작하는 이야기인지 알 수 있다. 라벨이 작고 옅어
 * 시선을 뺏지 않는다.
 *
 * ## 비교 두 값을 한 줄에 눕혔다
 *
 * 전에는 `시장` · `시장 대비` 가 2열 격자에 값 위·라벨 아래로 서 있었다. 격자가
 * 카드 안에서는 정렬을 잡아 줬는데, 면이 사라지자 **라벨 넷이 뜬금없이 떠 있는
 * 표**처럼 보였다. 한 줄로 눕히면 `내 수익률 → 시장 → 차이` 가 한 호흡으로 읽힌다.
 *
 * `시장보다 +1.24%p` 의 수치만 강조한다. 이 화면에서 **둘째로 중요한 값**이라
 * 등락색이 붙을 자격이 있고, 앞의 `시장 +0.89%` 는 비교 기준이라 중립색이다 —
 * 그 값에 색을 입히면 읽는 사람이 자기 성과로 오인한다.
 *
 * 320px 에서도 한 줄에 들어간다(15px 26자 ≈ 200px). `whitespace-nowrap` 으로
 * `%p` 가 다음 줄로 떨어지는 것만 막고 줄 자체는 접히게 둔다.
 *
 * ## 서브카피를 뺐다 (2026-09-23)
 *
 * `시장보다 앞선 기간이에요.` 한 줄이 큰 숫자 바로 아래 있었다. **숫자보다 해석이
 * 먼저 오면 안 된다** — 바로 아래 비교 막대가 같은 사실을 그림으로 말하고, 그
 * 아래 FINCH 가 문장으로 말한다. 한 화면에서 같은 결론을 세 번 말하던 것 중
 * 가장 앞의 것을 걷었다. 그 문구를 만들던 `resolveExcessNote` 도 함께 지웠다 —
 * 쓰는 곳 없이 남은 export 는 다음 사람이 되살릴 자리로 오해한다.
 *
 * ## 확정 등락색을 쓰는 자리는 둘뿐이다
 *
 * 큰 수익률과 `시장보다 +1.24%p`. 아래 모든 수치(요인·종목·막대)는 저채도 짝
 * (`--color-stock-*-muted`)이라, 화면에서 채도가 가장 높은 빨강이 맨 위 둘로
 * 묶인다 — `styles/index.css` 의 해당 토큰 주석 참고.
 *
 * ## 단위
 *
 * 기간 수익률·시장은 `%`, 시장 대비는 `%p` 다. 두 퍼센트의 차라서 그렇다 —
 * 근거는 `attributionInsight.ts` 의 `formatSignedPercentPoint` 주석에 있다.
 *
 * ## 탭이 바뀌어도 이 블록은 그대로 선다
 *
 * 2차 탭(`요약`·`기여 분석`·`종목별`) 위에 있고 셋이 공유한다. 어느 탭에서든
 * "그래서 얼마 벌었나" 가 화면 맨 위에 남아 있어야 아래 기여도·종목 수치가
 * 무엇의 조각인지 읽힌다.
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
    <section className="mt-5">
      <h2 className="text-caption text-text-muted">이번 기간 수익률</h2>

      <p
        className={`mt-1.5 text-display tabular-nums ${RATIO_TEXT_CLASS[getPriceDirection(portfolioReturn)]}`}
      >
        {formatSignedPercent(portfolioReturn)}
      </p>

      <p className="mt-2.5 text-body-2 text-text-secondary">
        <span className="tabular-nums">
          시장 {formatSignedPercent(benchmarkReturn)}
        </span>
        <span aria-hidden="true" className="mx-1.5 text-text-muted">
          ·
        </span>
        <span className="whitespace-nowrap">
          시장보다{' '}
          <strong
            className={`font-bold tabular-nums ${
              excessReturn === 0
                ? 'text-stock-neutral'
                : excessReturn > 0
                  ? 'text-stock-up'
                  : 'text-stock-down'
            }`}
          >
            {formatSignedPercentPoint(excessReturn)}
          </strong>
        </span>
      </p>

      {/* 거래일 수는 방향이 없는 개수라 등락색을 얹지 않는다. */}
      <p className="mt-2 text-caption text-text-muted tabular-nums">
        최근 {tradingDays}거래일 기준
      </p>
    </section>
  );
}
