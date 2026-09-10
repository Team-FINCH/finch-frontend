import { type Holding } from '@/shared/types/portfolio';

/**
 * "종목 집중도" — 색색 스택 바 + 항목별 색점 · 이름 · 수준 · 비율
 * (프로토타입 `concentration`, proto L2259–L2274 · L4008–L4013 · `design.md` §7.9).
 *
 * 비중은 응답에 필드가 없어 화면이 계산한다 — 평가금액 합계가 이미 있어서
 * 지어내는 값이 아니다(`HoldingsTab` 의 보유 행 비중과 같은 근거). 분모도
 * 프로토타입과 같은 **예수금을 뺀 평가금액 합계**다.
 *
 * **시세가 없는 종목은 빠진다.** 평가금액이 `null` 이라 비중을 낼 수 없고
 * (apiSpec v0.8.2), 합계에도 더해지지 않는다. 0 으로 치면 막대에 없는 칸이 생긴다.
 */

/**
 * 비중 구간별 색과 수준 (proto L4010-4011).
 * 색은 넷, 수준은 셋으로 경계가 다르다 — 프로토타입 그대로다.
 * 대응 토큰이 없어 실측값을 직접 적는다.
 */
const CONCENTRATION_COLORS = [
  { min: 40, color: '#E25555' },
  { min: 25, color: '#E0912F' },
  { min: 12, color: '#3B82F6' },
  { min: 0, color: '#A3ACB9' },
] as const;

const CONCENTRATION_LEVELS = [
  { min: 40, level: '쏠림' },
  { min: 25, level: '다소 높음' },
  { min: 0, level: '적정' },
] as const;

type StockConcentrationSectionProps = {
  holdings: Holding[];
};

export function StockConcentrationSection({
  holdings,
}: StockConcentrationSectionProps) {
  const priced = holdings.filter(
    (holding) => holding.evaluationAmount !== null,
  );
  const total = priced.reduce(
    (sum, holding) => sum + (holding.evaluationAmount ?? 0),
    0,
  );

  if (total === 0) {
    return null;
  }

  const slices = priced
    .map((holding) => {
      const percent = ((holding.evaluationAmount ?? 0) / total) * 100;
      return {
        stockCode: holding.stockCode,
        stockName: holding.stockName,
        percent,
        color: CONCENTRATION_COLORS.find((tier) => percent >= tier.min)?.color,
        level: CONCENTRATION_LEVELS.find((tier) => percent >= tier.min)?.level,
      };
    })
    .sort((a, b) => b.percent - a.percent);

  return (
    <section className="mt-8">
      {/* 프로토타입이 이 두 섹션에서만 `.sht` 를 20px 로 덮어 쓴다 (proto L2262). */}
      <h2 className="mb-3.5 text-[20px] leading-7 font-bold tracking-[-0.02em] text-text-primary">
        종목 집중도
      </h2>

      {/*
        스택 바는 장식이 아니라 아래 목록의 그림이라 같은 색을 쓴다.
        칸 너비는 반올림하지 않은 비중이다 — 정수로 자르면 합이 100 을 벗어난다.
      */}
      <div
        aria-hidden="true"
        className="mb-4 flex h-3.5 overflow-hidden rounded-[7px]"
      >
        {slices.map((slice) => (
          <div
            key={slice.stockCode}
            style={{ width: `${slice.percent}%`, background: slice.color }}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {slices.map((slice) => (
          <div
            key={slice.stockCode}
            className="flex items-center justify-between"
          >
            <span className="flex min-w-0 items-center gap-2.25 text-body-1 text-text-primary">
              <span
                aria-hidden="true"
                className="size-2.5 flex-none rounded-[3px]"
                style={{ background: slice.color }}
              />
              <span className="truncate">{slice.stockName}</span>
            </span>
            <span className="flex flex-none items-baseline gap-2">
              <span
                className="text-caption font-medium"
                style={{ color: slice.color }}
              >
                {slice.level}
              </span>
              <span className="text-body-1 font-bold text-text-primary tabular-nums">
                {Math.round(slice.percent)}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
