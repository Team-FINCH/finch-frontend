import { divergingWidth } from '../lib/attributionInsight';

/**
 * 0 을 가운데 둔 발산 막대 (FINCH-308 · 333). 요인 분해와 종목 기여가 같이 쓴다.
 *
 * ## 왜 라이브러리를 쓰지 않는가
 *
 * 이 화면의 차트는 **가로 막대 한 칸과 세로선 하나**가 전부다. 설치된 것은
 * `lightweight-charts` 뿐인데 시계열 전용이라 맞지 않고, recharts 를 새로 들이면
 * 축·격자·툴팁을 전부 숨긴 뒤 custom shape 을 얹게 된다 — 결국 이 파일과 같은 것을
 * 만들면서 번들만 늘어난다. 그래서 CSS 로 그린다.
 *
 * ## 장식선이 아니라 차트로 보이게 하는 것 셋 (FINCH-333)
 *
 * 전에는 `높이 6px 막대 + 1px 세로선`이 전부였다. "막대 그래프가 데이터
 * 시각화처럼 보이지 않고 장식선처럼 보인다" 는 지적의 원인이 이 셋이었다.
 *
 * ```
 * 전                          후
 *        │▓▓▓▓▓                      ╷
 *                            ░░░░░░░░│███████░░░░░░░
 *                                    ╵
 *                            └ 트랙   └ 0축(위아래 3px 돌출)
 * ```
 *
 * **1. 트랙(플롯 영역)이 생겼다.** 전에는 막대만 떠 있어서 **축의 범위가 보이지
 * 않았다** — 눈에 보이는 것이 선 한 토막뿐이라 그 길이가 무엇에 대한 비율인지
 * 알 수 없었다. 트랙이 `여기까지가 최대치` 를 그려 주므로 같은 막대가 이제
 * 차트의 일부로 읽힌다. **막대가 카드 안에서 붕 뜨던 것도 이것이 잡는다** —
 * 막대는 이제 자기 자리 안에 앉아 있다.
 *
 * **2. 막대가 0 축에 붙는다.** 전에는 `rounded-full` 이라 양끝이 다 둥글어서
 * **축 쪽 끝이 축에서 떨어져 보였다.** 0 에서 출발하는 값인데 출발점이 떠 있으면
 * 막대가 아니라 알약이다. 이제 축 쪽은 각지고(`rounded-r-*` 만) 바깥쪽만 둥글다 —
 * 발산 막대 차트의 기본 규칙이다.
 *
 * **3. 0 축이 트랙 위아래로 3px 씩 나온다.** 트랙 안에만 있으면 트랙을 둘로
 * 가르는 칸막이로 읽힌다. 밖으로 나오면 **트랙에 얹힌 축**이 되어, 여러 행이
 * 세로로 쌓였을 때 축들이 한 줄로 이어져 보인다. 행마다 스케일이 같다는 사실이
 * 그 세로선 하나로 드러난다.
 *
 * 축 색을 `--color-border-strong` 으로 올렸다. 전에는 `--color-border` 였고
 * *"border-strong 은 6px 막대 옆에서 축이 막대만큼 진해 보여 데이터로 오인된다"*
 * 는 이유가 달려 있었는데, 그 전제가 바뀌었다 — 막대가 10px 로 굵어졌고 색도
 * 저채도로 또렷해서 축이 막대를 이길 일이 없다. 반대로 축이 트랙(#F4F5F8)보다
 * 진해야 축 구실을 한다.
 *
 * ## 채움은 저채도 짝이다
 *
 * `--color-stock-up-muted` / `--color-stock-down-muted` 다. 이 화면에서 확정값
 * (`--color-stock-up`)을 쓰는 자리는 성과 카드의 큰 수익률 **하나뿐**이고,
 * 나머지는 그 값을 이루는 조각이라 한 단 내린다. 근거는 `styles/index.css` 의
 * 해당 토큰 주석에 있다.
 *
 * 불투명도(`/80`)로 흐리던 것을 그만뒀다. `color-mix` 로 흰 면에 섞으면 **면색이
 * 바뀔 때 결과가 따라 바뀌고**(트랙 위에서는 또 다른 값이 된다), 무엇보다
 * 화면에서 실제로 보이는 색이 토큰에 적혀 있지 않았다. 지금은 눈에 보이는 색이
 * 곧 토큰 값이다.
 *
 * ## 낭독기에 내보내지 않는다
 *
 * 같은 값이 언제나 바로 곁에 글자로 서 있다 (`ContributionRow` 는 같은 줄 오른쪽,
 * `StockContributionRow` 는 바로 위). `ConcentrationCard` 의 스택 바와 같은
 * 처리다.
 */

type DivergingBarProps = {
  value: number;
  /** `divergingScale()` 이 준 기준. 같은 차트 안의 행들이 같은 값을 받아야 한다 */
  scale: number;
  className?: string;
};

export function DivergingBar({
  value,
  scale,
  className = '',
}: DivergingBarProps) {
  const width = divergingWidth(value, scale);
  const positive = value > 0;

  return (
    <span
      aria-hidden="true"
      className={`relative block h-2.5 w-full rounded-[3px] bg-chart-track ${className}`}
    >
      {/* 0 축. 위아래로 3px 씩 나와 트랙에 얹힌다 — 위 주석 3번. */}
      <span className="absolute -top-[3px] -bottom-[3px] left-1/2 w-px -translate-x-1/2 bg-border-strong" />

      {value !== 0 && (
        <span
          className={`absolute inset-y-0 ${
            positive
              ? 'rounded-r-[3px] bg-stock-up-muted'
              : 'rounded-l-[3px] bg-stock-down-muted'
          }`}
          style={
            positive
              ? { left: '50%', width: `${width}%` }
              : { right: '50%', width: `${width}%` }
          }
        />
      )}
    </span>
  );
}
