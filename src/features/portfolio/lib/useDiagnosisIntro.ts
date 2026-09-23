import { useEffect, useRef, useState } from 'react';

/**
 * AI 진단 탭 진입 애니메이션의 재생 여부와 카운트업 (FINCH-334).
 *
 * ## 왜 컴포넌트 밖에 플래그를 두나
 *
 * `PortfolioPage` 는 탭을 오갈 때 **컴포넌트를 갈아 끼운다** — 보이지 않는 탭의
 * AI 요청이 나가지 않게 하려고 넷을 한꺼번에 마운트하지 않는다(그 파일 주석).
 * 그래서 `useState(false)` 로 "이미 재생했다" 를 들면 탭을 떠나는 순간 사라지고
 * 돌아올 때마다 다시 재생된다.
 *
 * 모듈 스코프 플래그는 마운트를 넘어 산다. 새로고침하면 다시 재생되는데 그것이
 * 맞다 — "탭에 처음 들어올 때" 의 단위는 세션이 아니라 화면을 여는 행위다.
 *
 * **`sessionStorage` 를 쓰지 않는다.** 저장소가 막힌 브라우저에서 예외가 나고,
 * 되살아나서 좋을 값도 아니다(다음 방문에 애니메이션이 영영 안 나온다).
 */
let hasPlayed = false;

/**
 * 이번 마운트에서 진입 애니메이션을 재생할지.
 *
 * 처음 한 번만 `true` 이고 그 뒤로는 계속 `false` 다. `prefers-reduced-motion:
 * reduce` 면 언제나 `false` — 호출부는 그때 애니메이션 클래스를 붙이지 않고
 * 최종값을 바로 그린다.
 *
 * **첫 렌더에 판정을 끝낸다.** `useEffect` 로 켜면 한 프레임 동안 최종 상태가
 * 보였다가 애니메이션이 처음부터 다시 시작해 깜빡인다.
 */
export function useDiagnosisIntro(): boolean {
  const [play] = useState(() => {
    if (hasPlayed) {
      return false;
    }
    // SSR 이 없는 앱이지만 `matchMedia` 가 없는 환경(테스트 러너)에서 터지지 않게 한다.
    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return !reduced;
  });

  useEffect(() => {
    hasPlayed = true;
  }, []);

  return play;
}

/** 스펙의 카운트업 이징. `cubic-bezier` 가 아니라 JS 라 직접 적는다. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const COUNT_UP_DURATION = 900;
const COUNT_UP_DELAY = 320;

type CountUpOptions = {
  /** `false` 면 애니메이션 없이 `target` 을 그대로 돌려준다 */
  enabled: boolean;
  /** 소수 자릿수. 점수는 0, 낙폭 같은 비율은 1 */
  digits?: number;
};

/**
 * 0 에서 `target` 까지 900ms 동안 올라가는 수.
 *
 * **`RollingNumber` 를 쓰지 않는다.** 그쪽은 자릿수를 세로로 굴리는 물건이고
 * (홈 총자산·평가금액) 값이 *바뀔 때* 바뀐 자리만 움직인다. 여기는 처음 그릴 때
 * 0 부터 세어 올라가는 다른 연출이고, 굴림판을 쓰면 `0 → 62` 에서 두 자리가
 * 각자 굴러 숫자가 세어지는 것처럼 보이지 않는다.
 *
 * `target` 이 `null` 이면(판정 보류·계산 불가) 아무것도 세지 않는다 — 없는 값을
 * 0 부터 올리면 "0 점" 이 한순간 화면에 뜬다.
 *
 * `requestAnimationFrame` 이라 탭이 백그라운드면 멈췄다가 돌아온다. 언마운트 때
 * 취소한다.
 */
export function useCountUp(
  target: number | null,
  { enabled, digits = 0 }: CountUpOptions,
): number | null {
  // **애니메이션 중에만 쓰는 값이다.** `enabled` 가 꺼져 있거나 `target` 이 없으면
  // 아래에서 `target` 을 그대로 돌려주므로 이 상태를 읽지 않는다 — 효과 안에서
  // `setValue(target)` 로 동기화하면 렌더가 한 번 더 도는 것을 ESLint
  // (`react-hooks/set-state-in-effect`)가 잡는다. 값을 맞추는 대신 안 쓰면 된다.
  const [animated, setAnimated] = useState<number | null>(null);
  const frameRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!enabled || target === null) {
      return;
    }

    const factor = Math.pow(10, digits);
    const start = () => {
      const startedAt = performance.now();

      const step = (now: number) => {
        const progress = Math.min((now - startedAt) / COUNT_UP_DURATION, 1);
        const eased = easeOutCubic(progress);
        setAnimated(Math.round(target * eased * factor) / factor);

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(step);
        }
      };

      frameRef.current = requestAnimationFrame(step);
    };

    timerRef.current = setTimeout(start, COUNT_UP_DELAY);

    return () => {
      clearTimeout(timerRef.current);
      cancelAnimationFrame(frameRef.current);
    };
  }, [target, enabled, digits]);

  if (!enabled || target === null) {
    return target;
  }

  // 지연(320ms) 동안에는 아직 한 프레임도 안 돌았다. 0 에서 시작한다.
  return animated ?? 0;
}
