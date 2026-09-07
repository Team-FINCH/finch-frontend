/**
 * CSS 커스텀 프로퍼티 값을 읽는다.
 *
 * **차트 때문에 있는 함수다.** `lightweight-charts` 는 캔버스에 그리므로 Tailwind
 * 클래스가 닿지 않고 색을 문자열로 받아야 한다. 그렇다고 `#C93B3B` 를 코드에 박으면
 * 토큰 파일이 단일 출처가 아니게 되고, 지금처럼 다른 사람이 토큰 값을 고치는 중이면
 * 차트만 옛 색으로 남는다 (`frontConvention` §6).
 *
 * 그래서 런타임에 `:root` 의 계산된 값을 읽어 온다. 토큰이 바뀌면 차트가 따라온다.
 *
 * SSR 이나 테스트 환경처럼 `document` 가 없을 수 있어 폴백을 받는다. 폴백은 색이
 * 아니라 "읽지 못했다" 를 뜻하는 자리라 호출부가 중립값을 넘긴다.
 */
export function readCssToken(name: string, fallback: string): string {
  if (typeof document === 'undefined') {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value === '' ? fallback : value;
}
