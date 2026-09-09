import { useEffect, useRef, useState } from 'react';

/**
 * 숫자 롤링 (프로토타입 `.odo`·`.ocell`·`.ochar`).
 * 홈 총자산과 포트폴리오 평가금액이 같은 물건을 쓴다.
 *
 * 값이 바뀌면 **바뀐 자리만** 세로로 굴러간다. 쉼표·부호처럼 숫자가 아닌 글자는
 * 굴리지 않고 자리에 그대로 둔다. 오르면 위에서, 내리면 아래에서 들어온다.
 *
 * 구현은 프로토타입 `odo()` 를 그대로 옮겼다 — 한 자리마다 `0~9` 를 세 벌
 * 쌓아 두고(밴드 0·1·2) 기본은 가운데 밴드(1)에 서 있다가, 값이 바뀌는 순간
 * 전환 없이 반대 밴드로 자리를 옮긴 뒤 다음 프레임에 가운데로 굴러온다.
 * 한 벌만 쌓으면 `9 → 0` 에서 아홉 칸을 거꾸로 훑고 지나간다.
 *
 * **표시 문자열은 부르는 쪽이 만들어 넘긴다.** 이 컴포넌트는 포맷을 정하지
 * 않는다 — 원 단위·주식 수·비율이 각각 다른 포매터(`shared/lib/formatNumber`)를
 * 쓰고, 어느 것을 쓸지는 자리마다 다르다.
 *
 * 굴림 자체는 `aria-hidden` 이다. 낭독기는 `label` 한 줄만 읽는다 — 자릿수가
 * 따로 읽히면 값이 아니라 글자 나열이 된다.
 * `prefers-reduced-motion` 을 켠 사람에게는 굴리지 않고 값만 바꾼다.
 */
type RollingNumberProps = {
  /**
   * 방향 판단에 쓰는 원래 값. `text` 만으로는 `9 → 10` 이 오름인지 알 수 없다.
   */
  value: number;
  /** 화면에 그릴 문자열. `formatAmount(value)` 처럼 이미 포맷된 값을 넘긴다 */
  text: string;
  /** 낭독용 한 줄. 예: `1,234,567원` */
  label: string;
  /**
   * 한 자리의 높이(px). 글자의 행간에 맞춘다 — 이 값이 곧 굴러가는 칸의 높이다.
   * 프로토타입 `.ocell` 실측값 44px 이 기본이다.
   */
  digitHeight?: number;
  className?: string;
};

/** 밴드 하나 = `0~9` 한 벌. 셋을 쌓아 두고 가운데(1)가 기본 자리다. */
const BAND_COUNT = 3;
const BAND_DIGITS = Array.from({ length: BAND_COUNT * 10 }, (_, i) => i % 10);
const DEFAULT_DIGIT_HEIGHT = 44;

/** 프로토타입 `.ocell>i` 의 전환 시간이다. */
const ROLL_DURATION_MS = 480;

type RollState = {
  text: string;
  /** 이번 프레임에 설 밴드. 굴러온 뒤에는 늘 1 이다 */
  band: number;
  /** 자리별로 이번에 바뀌었는지. 바뀌지 않은 자리는 밴드 1 에 그대로 선다 */
  changed: boolean[];
  /** `true` 면 전환 없이 자리만 옮긴다 */
  snap: boolean;
};

function initialState(text: string): RollState {
  return { text, band: 1, changed: [], snap: false };
}

export function RollingNumber({
  value,
  text,
  label,
  digitHeight = DEFAULT_DIGIT_HEIGHT,
  className = '',
}: RollingNumberProps) {
  const [roll, setRoll] = useState<RollState>(() => initialState(text));
  const previous = useRef({ value, text });
  const frame = useRef(0);

  useEffect(() => {
    if (previous.current.value === value && previous.current.text === text) {
      return;
    }

    const isUp = value > previous.current.value;
    const previousText = previous.current.text;
    // 오른쪽 정렬로 비교한다. 자릿수가 늘어나도 같은 자리끼리 대응해야 한다.
    const offset = text.length - previousText.length;
    const changed = text
      .split('')
      .map((char, index) => previousText[index - offset] !== char);

    previous.current = { value, text };
    setRoll({ text, band: isUp ? 2 : 0, changed, snap: true });
    frame.current = requestAnimationFrame(() => {
      frame.current = requestAnimationFrame(() => {
        setRoll({ text, band: 1, changed, snap: false });
      });
    });

    return () => cancelAnimationFrame(frame.current);
  }, [value, text]);

  const cellClass = roll.snap
    ? 'block transition-none'
    : `block transition-transform ease-standard motion-reduce:transition-none`;

  return (
    <span className={`inline-flex items-start ${className}`}>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="inline-flex items-start">
        {roll.text.split('').map((char, index) => {
          const key = `${String(index)}-${char}`;
          if (!/\d/.test(char)) {
            return (
              <span
                key={key}
                className="inline-block"
                style={{ height: digitHeight, lineHeight: `${digitHeight}px` }}
              >
                {char}
              </span>
            );
          }

          // 바뀌지 않은 자리는 굴리지 않는다. 값 하나가 바뀔 때 전부 흔들리면 읽기 힘들다.
          const band = roll.changed[index] === true ? roll.band : 1;
          return (
            <span
              key={key}
              className="inline-block overflow-hidden align-top"
              style={{ height: digitHeight }}
            >
              <i
                className={cellClass}
                style={{
                  fontStyle: 'normal',
                  transform: `translateY(${String(-digitHeight * (band * 10 + Number(char)))}px)`,
                  transitionDuration: `${String(ROLL_DURATION_MS)}ms`,
                }}
              >
                {BAND_DIGITS.map((digit, bandIndex) => (
                  <b
                    key={bandIndex}
                    className="block"
                    style={{
                      height: digitHeight,
                      lineHeight: `${digitHeight}px`,
                      // `<b>` 의 기본 굵기를 지운다. 굵기는 바깥 글자를 따라간다.
                      fontWeight: 'inherit',
                    }}
                  >
                    {digit}
                  </b>
                ))}
              </i>
            </span>
          );
        })}
      </span>
    </span>
  );
}
