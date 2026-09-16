import {
  formatSignedPercent,
  getPriceDirection,
} from '@/shared/lib/formatNumber';

/**
 * 기간 성과 세 수치 (FINCH-308).
 *
 * 전에는 이 셋이 AI 카드의 `caption` 한 줄에 눌려 있었다. 검정 면 위 캡션은
 * 화면에서 가장 약한 자리인데, **여기 담긴 것은 AI 가 쓴 문장이 아니라 엔진이
 * 계산한 사실이다.** 계산값을 AI 카드 안에 두면 그 숫자까지 AI 가 만든 것으로
 * 읽힌다 — 이 화면 개편의 출발점이 그것이었다.
 *
 * 그래서 카드 밖 흰 면으로 끌어냈다. 이 블록에 있는 값은 전부
 * `ai/app/engines/attribution.py` 가 Brinson-Fachler 로 분해하고 항등식까지
 * 검증한 뒤 내려보낸 것이다.
 *
 * ## 기간 수익률만 크게 둔다
 *
 * 셋을 같은 크기로 늘어놓으면 무엇을 먼저 읽어야 하는지가 사라진다. 사용자가
 * 이 탭에 들어온 이유는 "내 수익률이 어떻게 됐나" 이므로 그것만 크게 두고,
 * 시장·초과는 그 값을 해석하는 보조로 아래에 붙인다.
 *
 * `totalReturn` 을 쓰지 않는다 — `portfolioReturn` 과 같은 값이고(C56) 한 쌍에서
 * 한쪽만 읽는 것이 프론트 규약이다.
 */

const RATIO_TEXT_CLASS = {
  rise: 'text-stock-up',
  fall: 'text-stock-down',
  flat: 'text-stock-neutral',
} as const;

type PerformanceSummaryProps = {
  /** 기간 수익률. 0~1 소수다 (백엔드 `changeRate` 계열의 백분율과 다르다) */
  portfolioReturn: number;
  /** 벤치마크 수익률. 보유 종목 유니버스를 시가총액으로 합성한 시장 전체다 */
  benchmarkReturn: number;
  /** `portfolioReturn - benchmarkReturn`. 엔진이 계산해 내려준다 */
  excessReturn: number;
  /** 되짚은 거래일 수. `period` 만으로는 알 수 없어 응답이 따로 준다 */
  tradingDays: number;
};

export function PerformanceSummary({
  portfolioReturn,
  benchmarkReturn,
  excessReturn,
  tradingDays,
}: PerformanceSummaryProps) {
  return (
    <section className="mb-8">
      <h2 className="text-caption text-text-secondary">기간 수익률</h2>

      <p
        className={`mt-1 text-[32px] leading-[42px] font-bold tracking-[-0.02em] tabular-nums ${RATIO_TEXT_CLASS[getPriceDirection(portfolioReturn)]}`}
      >
        {formatSignedPercent(portfolioReturn)}
      </p>

      {/* 거래일 수는 방향이 없는 개수라 등락색을 얹지 않는다. */}
      <p className="mt-0.5 text-caption text-text-muted">
        {tradingDays}거래일 기준
      </p>

      <dl className="mt-4 flex gap-6 border-t border-border pt-4">
        <SummaryItem label="시장" ratio={benchmarkReturn} />
        <SummaryItem label="초과수익" ratio={excessReturn} />
      </dl>
    </section>
  );
}

function SummaryItem({ label, ratio }: { label: string; ratio: number }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.75">
      <dt className="text-caption text-text-secondary">{label}</dt>
      <dd
        className={`text-body-1 font-bold tabular-nums ${RATIO_TEXT_CLASS[getPriceDirection(ratio)]}`}
      >
        {formatSignedPercent(ratio)}
      </dd>
    </div>
  );
}
