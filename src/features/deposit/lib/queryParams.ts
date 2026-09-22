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

/**
 * 우리 화면으로 가는 경로에 입금 금액을 싣는다.
 *
 * **계좌이체 승인 화면의 금액 카드가 `—` 로 뜨던 것을 고친다.** 서버
 * `MockTransferGateway.ready` 는 `checkoutUrl` 에 `?paymentId` 하나만 붙이고
 * (C90) 그 화면에는 금액을 가져올 다른 계약이 없다 — `GET /deposits/{paymentId}`
 * 가 없고 `mock-approve` 의 `amount` 는 **승인 뒤에야** 오는데, 금액은 승인 전에
 * 보여줘야 하는 값이다. `contracts.md` C90 은 "금액을 되찾으려면 서버 변경이
 * 필요하다"고 닫아 뒀지만 **서버를 고치지 않아도 된다** — `ready` 응답이 이미
 * `amount` 를 주고, 그 도착지는 우리 라우트라 우리가 라우터로 넘긴다.
 *
 * **카카오페이 쪽에는 이 함수를 태우지 않는다.** 그쪽 `checkoutUrl` 은 외부
 * 주소라 애초에 `toSameOriginPath` 가 `null` 을 돌려주고, 복귀 URL 에는 서버가
 * `amount` 를 직접 싣는다(C84·C89).
 *
 * 이미 `amount` 가 실려 있으면 건드리지 않는다 — 나중에 서버가 싣기 시작하면
 * **서버 값이 맞다.** 우리 것으로 덮으면 둘이 갈렸을 때 그 사실이 가려진다.
 */
export function withAmountParam(path: string, amount: number): string {
  try {
    const url = new URL(path, window.location.origin);
    if (url.searchParams.has('amount')) {
      return path;
    }
    url.searchParams.set('amount', String(amount));
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    // 여기까지 온 값은 `toSameOriginPath` 가 이미 파싱에 성공한 경로다. 그래도
    // 실패하면 금액 한 줄을 잃는 것이 이동 자체를 잃는 것보다 낫다.
    return path;
  }
}
