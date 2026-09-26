/**
 * 수익률 원인을 찾는 동안 도는 분석 자국 (FINCH-353).
 *
 * 흩어진 값이 하나씩 놓이고 → 가는 선이 왼쪽에서 오른쪽으로 잇고 → 그중 한 점이
 * 커지며 고리가 한 번 퍼진다. 이 탭이 실제로 하는 일("여러 값을 본다 → 이어 본다 →
 * 원인을 짚는다")을 그대로 옮긴 것이다.
 *
 * 타이밍·키프레임의 근거는 `styles/index.css` 의 «수익률 분석 대기 연출» 주석에
 * 모아 두었다. 여기는 좌표와 배선만 든다.
 *
 * ## 진행률이 아니다
 *
 * 한 바퀴가 끝나면 처음으로 돌아간다. 서버가 진행 단계를 주지 않으므로(요청이 단일
 * POST 다) 어디까지 왔는지 말할 방법이 없고, 말할 수 없는 것을 말하는 시늉을 하지
 * 않는다. 이 자국이 뜻하는 것은 "어디까지 왔다" 가 아니라 "이런 일을 하는 중이다" 다.
 *
 * ## 정적 속성이 곧 멈춘 모양이다
 *
 * 움직임을 줄이기로 한 사람에게는 `motion-reduce:animate-none` 으로 전부 멈추고,
 * 그때 남는 것은 요소에 적힌 정적 값 — 점 다섯과 다 그려진 선, 조금 큰 원인 점 —
 * 즉 **완성된 작은 차트**다. 선의 `strokeDashoffset` 이 0 인 이유가 그것이다.
 */

/**
 * 값이 놓이는 자리. 수익률 경로처럼 오르내리되 실제 수치가 아니다 — 아직 아무것도
 * 계산되지 않은 시점이라 진짜 값을 그릴 수 없고, 그리는 시늉을 해서도 안 된다.
 *
 * 뷰박스 세로 64 중 20~44 만 쓴다. 위쪽 20 은 고리가 가장 크게 퍼질 때
 * (반지름 3 × 2.6 ≈ 8) 잘리지 않게 비워 둔 자리다.
 */
const POINTS = [
  { x: 10, y: 44 },
  { x: 32, y: 36 },
  { x: 54, y: 42 },
  { x: 76, y: 20 },
  { x: 110, y: 28 },
] as const;

/**
 * 원인으로 짚이는 점. 가장 크게 튄 자리(네 번째)다 — 눈이 이미 가 있는 곳을
 * 짚어야 "찾았다" 로 읽힌다.
 *
 * **이 값이 바뀌면 `analysis-point-found` 의 백분율도 함께 봐야 한다.** 그 키프레임은
 * 지연 360ms(= 네 번째 점)를 전제로 고리와 같은 순간에 커지도록 맞춰져 있다.
 */
const FOUND_INDEX = 3;

/** 점 하나가 놓이는 간격. 다섯을 0.8초 안에 다 놓는다. */
const POINT_STAGGER_MS = 120;

/*
 * 네 연출이 공유하는 한 바퀴는 3200ms 다. **아래 클래스에 그 값을 글자 그대로 적는다.**
 * Tailwind 는 소스에 리터럴로 적힌 클래스 문자열만 훑어서 CSS 를 만들기 때문에,
 * 상수를 끼워 `animate-[analysis-trace_${cycle}_...]` 처럼 조립하면 그 클래스는
 * 아예 생성되지 않고 연출이 조용히 죽는다. 바꿀 때는 네 자리를 함께 고친다.
 */

const polylinePoints = POINTS.map(
  ({ x, y }) => `${String(x)},${String(y)}`,
).join(' ');

export function AnalysisTrace() {
  return (
    <svg
      /* 뜻은 옆의 문구가 말한다. 보조 기술에 모양을 읽힐 것이 없다. */
      aria-hidden="true"
      viewBox="0 0 120 64"
      className="h-16 w-30 text-text-primary"
      fill="none"
    >
      {/*
        값이 놓이는 바닥. 아주 흐리게 깔아 두어야 점들이 허공이 아니라 축 위에
        있는 것으로 읽힌다. 눈금은 넣지 않는다 — 읽을 수 있는 축이 아니다.
      */}
      <line
        x1="6"
        y1="56"
        x2="114"
        y2="56"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.12"
      />

      {/*
        점들을 잇는 선. `pathLength` 를 100 으로 정규화해서 좌표와 무관하게
        대시 100 이 전체 길이가 되게 한다 — 점 자리를 고쳐도 키프레임은 그대로다.
      */}
      <polyline
        points={polylinePoints}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        strokeDasharray="100"
        /* 멈췄을 때 다 그려진 선이 되도록 0 이다 — 위 «정적 속성» 참고. */
        strokeDashoffset={0}
        className="animate-[analysis-trace_3200ms_var(--ease-standard)_infinite] motion-reduce:animate-none"
        opacity="0.75"
      />

      {/*
        원인 자리에서 한 번 퍼지는 고리. 정적 상태에서는 보이지 않아야 해서
        기본 불투명도가 0 이다 — 멈춘 화면에 뜻 없는 큰 원이 남으면 안 된다.
      */}
      <circle
        cx={POINTS[FOUND_INDEX].x}
        cy={POINTS[FOUND_INDEX].y}
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0"
        className="analysis-mark animate-[analysis-focus_3200ms_var(--ease-standard)_infinite] motion-reduce:animate-none"
      />

      {POINTS.map((point, index) => {
        const found = index === FOUND_INDEX;
        return (
          <circle
            key={`${String(point.x)}-${String(point.y)}`}
            cx={point.x}
            cy={point.y}
            /* 원인 점만 반지름이 크다. 멈춘 화면에서도 어느 점이 짚인 것인지
               색 없이 드러나야 한다. */
            r={found ? 3 : 2.5}
            /* 속을 배경색으로 채워 선이 점을 가로지르지 않게 한다. 원인 점만
               잉크로 채운다 — 다만 **도는 동안에는 뒤늦게** 채워진다
               (`analysis-point-found` 의 `fill-opacity`). 여기 적힌 값은 멈췄을
               때의 모양, 즉 이미 찾아낸 뒤의 모양이다. */
            fill={found ? 'currentColor' : 'var(--color-bg)'}
            stroke="currentColor"
            strokeWidth="1.5"
            opacity={found ? 1 : 0.55}
            className={
              found
                ? 'analysis-mark animate-[analysis-point-found_3200ms_var(--ease-standard)_infinite] motion-reduce:animate-none'
                : 'analysis-mark animate-[analysis-point_3200ms_var(--ease-standard)_infinite] motion-reduce:animate-none'
            }
            style={{ animationDelay: `${String(index * POINT_STAGGER_MS)}ms` }}
          />
        );
      })}
    </svg>
  );
}
