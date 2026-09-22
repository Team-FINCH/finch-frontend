import { divergingWidth } from '../lib/attributionInsight';

/**
 * 0 을 가운데 둔 발산 막대 (FINCH-308). 요인 분해와 종목 기여가 같이 쓴다.
 *
 * ## 왜 라이브러리를 쓰지 않는가
 *
 * 이 화면의 차트는 **가로 막대 한 칸과 세로선 하나**가 전부다. 설치된 것은
 * `lightweight-charts` 뿐인데 시계열 전용이라 맞지 않고, recharts 를 새로 들이면
 * 축·격자·툴팁을 전부 숨긴 뒤 custom shape 을 얹게 된다 — 결국 이 파일과 같은 것을
 * 만들면서 번들만 늘어난다. 그래서 CSS 로 그린다.
 *
 * ```
 * ┌─────────────────────────────┐
 * │              │▓▓▓▓▓▓        │  positive: left 50%
 * │        ▓▓▓▓▓▓│              │  negative: right 50%
 * └──────────────┴──────────────┘
 *                └ 0 축
 * ```
 *
 * ## 얇게 그린다
 *
 * 높이 6px · pill 반경이다. 막대는 이 화면의 주인공이 아니라 **오른쪽 숫자를 눈으로
 * 잡아 주는 보조**이고, 굵으면 값보다 먼저 읽힌다.
 *
 * 0 축은 `--color-border` 1px 이다. `--color-border-strong` 은 6px 막대 옆에서
 * 축이 막대만큼 진해 보여 데이터로 오인된다.
 *
 * ## 면은 값보다 한 톤 옅다 (FINCH-333)
 *
 * 채움이 `--color-stock-up` / `--color-stock-down` 의 **80%** 다. 색을 바꾼 것이
 * 아니라 같은 색을 흰 면에 80% 로 얹는다 — 토큰 값은 그대로다(이슈 #32 회신으로
 * 확정됐고 앱 전체가 공유한다).
 *
 * 한 화면에 등락색이 들어간 요소가 너무 많다는 지적에 대한 답인데, **개수를
 * 줄이는 일은 탭 분할이 하고 여기서는 넓이를 줄인다.** 막대는 이 화면에서 면적이
 * 가장 넓은 색 덩어리라 같은 개수여도 적색의 총량을 가장 많이 차지한다.
 *
 * 값 글자는 100% 로 둔다. 그래서 같은 행 안에서 **숫자가 막대보다 진해지고**,
 * 이 막대가 주인공이 아니라 보조라는 위 문단의 판단이 굵기·높이에 더해 채도로도
 * 나타난다.
 *
 * 대비는 따지지 않는다 — 아래 문단대로 이 막대는 낭독기에 나가지 않고 같은 값이
 * 언제나 곁에 글자로 서 있다. 색만으로 뜻을 나르는 자리가 아니다.
 *
 * ## 낭독기에 내보내지 않는다
 *
 * 같은 값이 언제나 바로 곁에 글자로 서 있다 (`AttributionRow` 는 같은 줄 오른쪽,
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
      className={`relative block h-1.5 w-full ${className}`}
    >
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
      {value !== 0 && (
        <span
          className={`absolute inset-y-0 rounded-full ${positive ? 'bg-stock-up/80' : 'bg-stock-down/80'}`}
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
