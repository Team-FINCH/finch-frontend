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
 * 색은 비중 구간이 아니라 **종목**을 가리킨다 (FINCH-294, 프로토타입
 * L4010-4011 과 달라졌다). 프로토타입은 구간색(40%↑ 적색 · 25~40% 주황 ·
 * 12~25% 청색 · 0~12% 회색)을 썼지만, 비중은 이미 막대 칸 너비와 우측 숫자가
 * 말하고 있어 색까지 같은 정보를 반복할 이유가 없다. 오히려 보유 종목 셋이
 * 나란히 25~40% 구간에 들면(예: 38%·31%·31%) 셋 다 같은 주황이 되어 스택
 * 막대가 통짜 하나로 보이고 범례 점으로도 어느 칸이 어느 종목인지 구분이
 * 안 됐다 — 이 정정의 발단이 된 실사용 증상이다.
 *
 * 그래서 길이는 비중, 색은 종목으로 나눈다. 종목별 색은 이미
 * `StockInitialBadge` 가 종목코드를 해시해 다섯 틴트 쌍 중 하나를 고르는
 * 방식으로 갖고 있다 — 그 해시를 그대로 재사용해 같은 종목이면 목록 뱃지와
 * 이 막대에서 같은 색이 나오게 한다. 해시 함수는 `hashStockCode` 로 아래에
 * 다시 적었다: 그 함수가 `shared/ui/StockInitialBadge.tsx` 안에 `export`
 * 없이 있어 그대로 import 하려면 shared/ui 파일을 고쳐야 하는데, 이 화면
 * 하나를 위해 공용 컴포넌트의 공개 표면을 넓히고 싶지 않다. **두 파일의
 * 알고리즘은 반드시 같이 바뀌어야 한다** — 하나만 바뀌면 같은 종목이 목록과
 * 이 막대에서 다른 색으로 보인다.
 *
 * 막대·범례 점에는 틴트의 진한 쪽(`-fg`)만 쓴다. 연한 쪽(면색)은 서로 대비가
 * 약해(흰 배경 대비 1.09~1.13, `styles/index.css` 틴트 블록 주석) 막대에
 * 쓰면 지금 겪은 "다 비슷해 보인다" 문제가 그대로 되풀이된다.
 *
 * 등급 글자색은 종목색을 얹지 않는다. `styles/index.css` 의 틴트 블록
 * 주석이 "이 다섯 쌍을 뱃지 밖에서, 특히 읽어야 하는 글자에 쓰지 마라"고
 * 못박아 뒀다(다섯 중 셋이 AA 미달) — 등급은 원래도 글자(`쏠림` 등)가 뜻을
 * 옮기므로 색이 빠져도 잃는 정보가 없다.
 */
/** 틴트 다섯 쌍의 진한 쪽. 값은 `styles/index.css` 토큰을 그대로 가리킨다 —
 * 색을 복제해 적으면 디자인이 값을 바꿀 때 이 파일만 뒤처진다. */
const STOCK_TINT_FG = [
  'var(--color-stock-tint-1-fg)',
  'var(--color-stock-tint-2-fg)',
  'var(--color-stock-tint-3-fg)',
  'var(--color-stock-tint-4-fg)',
  'var(--color-stock-tint-5-fg)',
] as const;

function hashStockCode(stockCode: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < stockCode.length; index += 1) {
    hash ^= stockCode.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % STOCK_TINT_FG.length;
}

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
        color: STOCK_TINT_FG[hashStockCode(holding.stockCode)],
        level: CONCENTRATION_LEVELS.find((tier) => percent >= tier.min)?.level,
      };
    })
    .sort((a, b) => b.percent - a.percent);

  return (
    <section className="mt-12">
      {/* 프로토타입이 이 두 섹션에서만 `.sht` 를 20px 로 덮어 쓴다 (proto L2262). */}
      <h2 className="mb-3.5 text-[20px] leading-7 font-bold tracking-[-0.02em] text-text-primary">
        종목 집중도
      </h2>

      {/*
        스택 바는 장식이 아니라 아래 목록의 그림이라 같은 색을 쓴다.
        칸 너비는 반올림하지 않은 비중이다 — 정수로 자르면 합이 100 을 벗어난다.

        틴트가 다섯 쌍뿐이라 종목이 여섯 이상이면 해시가 겹치고, 겹친 두 칸이
        마침 이웃하면 경계가 안 보인다. 그래서 칸 사이(마지막 칸 제외)에
        1px 흰 선을 넣는다 — `--color-surface` 는 배경(`--color-bg`)보다
        밝아 어떤 틴트 옆에서도 선이 드러난다. 마지막 칸에는 선을 안 그어
        `rounded-[7px]` 로 잘리는 오른쪽 끝이 선에 걸려 어색해지지 않게 한다.
        (왼쪽 끝은 애초에 `border-right`만 쓰므로 영향이 없다.)
      */}
      <div
        aria-hidden="true"
        className="mb-4 flex h-3.5 overflow-hidden rounded-[7px]"
      >
        {slices.map((slice, index) => (
          <div
            key={slice.stockCode}
            style={{
              width: `${slice.percent}%`,
              background: slice.color,
              borderRight:
                index < slices.length - 1
                  ? '1px solid var(--color-surface)'
                  : undefined,
            }}
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
              {/* 등급 글자는 종목색을 얹지 않는다 — 틴트 다섯 쌍은 뱃지처럼
                  장식 자리에만 쓰기로 했고(위 파일 머리 주석), 등급은 색
                  없이도 글자(`쏠림` 등)로 뜻이 전해진다. */}
              <span className="text-caption font-medium text-text-secondary">
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
