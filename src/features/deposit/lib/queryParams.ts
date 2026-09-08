/**
 * URL 쿼리에서 읽은 양의 정수. 없거나 정수가 아니면 `null` 이다.
 *
 * **`Number()` 만 쓰면 안 된다.** `Number('abc')` 는 `NaN` 이고 `NaN !== null` 이라
 * 호출부의 널 검사를 그대로 통과해 `NaN` 이 그대로 요청 본문에 실린다. 서버는
 * 400 을 주고 사용자는 이유를 모른다 — 결제 복귀 URL 은 우리가 만드는 값이 아니라
 * PG 가 붙여 보내는 값이라 형식을 믿을 수 없다.
 */
export function parsePositiveIntParam(value: string | null): number | null {
  if (value === null || value.trim() === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * `checkoutUrl` 이 우리 화면인가.
 *
 * **같은 오리진이면 전체 새로고침을 하면 안 된다.** `window.location.assign` 은
 * 앱을 통째로 다시 띄우는데, 그러면 (1) MSW 목의 인메모리 상태가 날아가 방금
 * 만든 결제 건을 다음 단계가 못 찾고, (2) 서비스 워커 재등록과 첫 요청이 경합해
 * 요청이 목을 비껴 나간다. 실제로 목에서는 충전이 끝까지 흐르지 않았다.
 *
 * 카카오 결제창은 외부 주소라 `assign` 이 맞다. 계좌이체의 `checkoutUrl` 은
 * 우리 `/deposit/transfer` 이고 배포도 같은 오리진이다(이슈 #35 회신).
 *
 * 파싱에 실패하면 외부로 본다 — 우리 라우터에 못 넘길 주소를 넘기는 것보다
 * 브라우저에 맡기는 쪽이 안전하다.
 */
export function toSameOriginPath(checkoutUrl: string): string | null {
  try {
    const url = new URL(checkoutUrl, window.location.origin);
    if (url.origin !== window.location.origin) {
      return null;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
