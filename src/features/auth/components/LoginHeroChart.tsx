/**
 * 히어로의 장식용 차트 (프로토타입 `isLanding`).
 *
 * **실제 시세가 아니다.** 좌표는 프로토타입에 박힌 값 그대로이고 데이터와
 * 연결되지 않는다. 그래서 `aria-hidden` 이고 접근성 트리에 올리지 않는다 —
 * 읽어 줄 값이 없다.
 *
 * `preserveAspectRatio="none"` 이라 가로는 컨테이너 폭에 맞춰 늘어나고 높이는
 * 118px 로 고정된다. 뷰박스 너비 338 은 기준 뷰포트 375px 에서 좌우 26px 여백을
 * 뺀 폭에 맞춰 그린 값이다. 늘어나면 선 굵기가 가로로 함께 늘지만 프로토타입이
 * 정한 모양이라 그대로 둔다.
 */

/** 꺾은선 위에서 강조되는 세 지점. 점과 그 아래 점선이 지연을 두고 따라 나온다. */
const MARKERS = [
  { x: 56, y: 94, pointDelay: '0.6s', tickDelay: '0.85s' },
  { x: 169, y: 62, pointDelay: '1.05s', tickDelay: '1.3s' },
  { x: 282, y: 36, pointDelay: '1.5s', tickDelay: '1.75s' },
];

const LINE_PATH =
  'M0 104 L28 88 L56 94 L92 74 L124 82 L169 62 L204 48 L238 58 L282 36 L312 42 L338 28';

export function LoginHeroChart() {
  return (
    <svg
      viewBox="0 0 338 118"
      preserveAspectRatio="none"
      className="block h-[118px] w-full overflow-visible"
      aria-hidden="true"
    >
      <path
        className="hero-chart-line"
        d={LINE_PATH}
        fill="none"
        stroke="var(--color-text-primary)"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {MARKERS.map((marker) => (
        <line
          key={`tick-${marker.x}`}
          className="hero-chart-tick"
          x1={marker.x}
          y1={marker.y}
          x2={marker.x}
          y2={118}
          stroke="var(--color-text-muted)"
          strokeWidth="1.2"
          strokeDasharray="3 4"
          style={{ animationDelay: marker.tickDelay }}
        />
      ))}
      {MARKERS.map((marker) => (
        <g
          key={`point-${marker.x}`}
          className="hero-chart-point"
          style={{ animationDelay: marker.pointDelay }}
        >
          {/* 바깥 원은 점을 떠 보이게 하는 후광이다. 값이 아니라 장식이다. */}
          <circle
            cx={marker.x}
            cy={marker.y}
            r={9}
            fill="var(--color-text-primary)"
            opacity="0.12"
          />
          <circle
            cx={marker.x}
            cy={marker.y}
            r={3.8}
            fill="var(--color-text-primary)"
          />
        </g>
      ))}
    </svg>
  );
}
