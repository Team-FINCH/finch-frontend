import { useEffect, useRef, useState } from 'react';

import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion';

/**
 * 글자당 재생 시간(ms) 기준값. 실측이 아니라 채팅 타자 연출의 관행값이다 —
 * 초당 80자 안팎이면 "타자"로 읽히면서도 느리다는 인상을 주지 않는다.
 */
const MS_PER_CHAR = 12;
/** 아주 짧은 답이 순간이동처럼 뚝 끊기지 않게 두는 하한. */
const MIN_DURATION_MS = 300;
/**
 * 전체 재생 시간의 상한 (FINCH-274, task-F 지시). AI 응답은 수백 자에
 * 이를 수 있어(`ai/docs/api-spec.md`) 글자당 고정 간격만 쓰면 캡 없이 몇 초씩
 * 걸린다. 진행률(경과/전체시간) 기준으로 드러낼 글자 수를 계산해 길이와 무관하게
 * 이 상한 안에서 끝나게 한다.
 */
const MAX_DURATION_MS = 1400;

type TypewriterResult = {
  /** 지금까지 드러난 부분 문자열. `enabled=false` 나 재생이 끝나면 `text` 전체다. */
  visibleText: string;
  /** 전문이 다 드러났는가. 근거·피드백 행을 언제 낼지 이 값으로 정한다. */
  isDone: boolean;
};

/**
 * 문자열을 앞에서부터 드러낸다.
 *
 * **스트리밍이 아니다.** `text` 는 호출 시점에 이미 전부 도착한 값이다 — 이 훅은
 * 그것을 화면에서만 나눠 보여줄 뿐 네트워크와 무관하고, 재시도·에러 처리에도
 * 관여하지 않는다.
 *
 * `enabled` 가 꺼지면(`prefers-reduced-motion` 포함) 타이머를 아예 돌리지 않고
 * 전문을 즉시 보여준다 — `usePrefersReducedMotion` 주석의 관용대로, 타이머가
 * 상태를 바꿔 움직임을 만드는 경우라 CSS 만으로는 끌 수 없어 이 훅이 직접
 * 갈린다.
 */
export function useTypewriter(
  text: string,
  enabled: boolean,
): TypewriterResult {
  const prefersReducedMotion = usePrefersReducedMotion();
  const shouldAnimate = enabled && !prefersReducedMotion;

  // `shouldAnimate` 가 꺼져 있으면 이 상태 자체를 쓰지 않는다(아래 렌더 값 계산
  // 참고) — effect 안에서 "꺼졌으니 전체 길이로 맞춘다" 는 동기 `setState` 를
  // 만들지 않기 위해서다. 그런 setState 는 렌더를 한 번 더 만들 뿐인데, 여기서는
  // 애초에 그 값을 파생값으로 계산할 수 있어 필요 없다.
  const [visibleLength, setVisibleLength] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!shouldAnimate) {
      return;
    }

    const duration = Math.min(
      Math.max(text.length * MS_PER_CHAR, MIN_DURATION_MS),
      MAX_DURATION_MS,
    );
    const start = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      setVisibleLength(Math.floor(text.length * progress));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    // 시작을 `setVisibleLength(0)` 으로 동기 리셋하지 않는다 — `visibleLength`
    // 초기값이 이미 0 이고(`useState(0)`), `text`·`shouldAnimate` 가 같은 훅
    // 인스턴스에서 실제로 바뀌는 경로가 없어(말풍선 하나 = 응답 하나) 리셋이
    // 필요한 상황 자체가 생기지 않는다. 첫 프레임은 `requestAnimationFrame`
    // 콜백(`tick`) 안에서 계산되므로 effect 본문에 동기 `setState` 가 남지 않는다.
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameRef.current);
    };
  }, [text, shouldAnimate]);

  // `shouldAnimate` 가 거짓이면(비활성 · reduced-motion) 타이머가 애초에 돌지
  // 않으니 `visibleLength` 상태값을 무시하고 전체 길이를 그대로 쓴다 — 렌더
  // 시점에 계산하는 파생값이라 effect 의 동기 setState 가 필요 없다.
  const effectiveLength = shouldAnimate ? visibleLength : text.length;

  return {
    visibleText: text.slice(0, effectiveLength),
    isDone: effectiveLength >= text.length,
  };
}
