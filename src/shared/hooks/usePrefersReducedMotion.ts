import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onStoreChange: () => void): () => void {
  const mediaQuery = window.matchMedia(QUERY);
  mediaQuery.addEventListener('change', onStoreChange);
  return () => {
    mediaQuery.removeEventListener('change', onStoreChange);
  };
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/**
 * `prefers-reduced-motion: reduce` 가 켜져 있는지.
 *
 * **CSS 로 끌 수 없는 움직임에만 쓴다.** 전환·키프레임은 Tailwind 의
 * `motion-reduce:transition-none`·`motion-reduce:animate-none` 으로 끄는 것이
 * 이 저장소의 관용이고(`RollingNumber`·`TabBar`·`WikiGuessCarousel`), 그쪽이
 * 리렌더를 만들지 않아 더 싸다. 이 훅이 필요한 자리는 **타이머가 상태를 바꿔
 * 움직임이 만들어지는 경우**다 — 홈 헤더의 지수 롤링이 그렇다. 전환만 꺼도
 * 항목이 3초마다 순간이동하므로 타이머 자체를 돌리지 않아야 한다.
 *
 * 설정은 실행 중에 바뀔 수 있어 구독한다. `useEffect` + `useState` 로 짜면
 * 첫 렌더가 끝난 뒤에야 값을 읽어 설정을 켠 사람에게도 한 번은 움직임이
 * 시작되므로, 첫 렌더에서 곧바로 값을 읽는 `useSyncExternalStore` 를 쓴다.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}
