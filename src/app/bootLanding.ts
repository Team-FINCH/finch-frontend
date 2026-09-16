import { ROUTES } from '@/shared/config/routes';

/**
 * 재진입 착지 규칙 (FINCH-295).
 *
 * **주소를 들고 들어와도, 새로고침해도 홈에서 시작한다.** 전에는 문서를 새로
 * 받으면 그 주소의 화면에 그대로 떨어졌다. 앱처럼 쓰는 화면에서 그 동작은
 * "아까 보던 것이 아직 열려 있다" 가 아니라 "탭을 잘못 눌렀다" 로 읽힌다 —
 * 딥링크로 들어온 사람도 자기가 어디에 있는지 모르는 채로 시작한다.
 *
 * 판정은 **문서를 새로 받은 순간에 한 번만** 한다. 앱 안에서 화면을 옮기는 것은
 * 여기와 무관하다 (`app/layouts/RootLayout.tsx` 가 한 번만 부르게 한다).
 */

/**
 * 홈으로 보내지 않는 경로.
 *
 * **바깥에서 문서를 새로 열어 주는 자리들이다.** 여기까지 홈으로 튕기면 로그인과
 * 충전이 끝나지 않는다 — 돌아온 주소에 붙은 인가 코드·결제 결과를 읽을 화면이
 * 뜨지 못한 채 사라진다.
 *
 * - `login` — 비로그인이면 `RequireAuth` 가 여기로 보낸다. 홈으로 되돌리면 둘이 서로를 가리킨다
 * - `oauthKakao` — 카카오가 인가 코드를 붙여 여는 주소
 * - `depositComplete`·`depositFail`·`depositTransfer` — 백엔드 `application.yaml` 의
 *   `success-path`·`fail-path`·`transfer-checkout-path` 와 짝이다. 카카오페이 승인 뒤
 *   서버가 이 주소로 `302` 를 보낸다 (`shared/config/routes.ts` 주석)
 * - `health` — 주소로 여는 것이 유일한 용도인 개발용 배선 점검 화면
 *
 * **온보딩은 넣지 않는다.** 바깥에서 여는 주소가 아니라 로그인 콜백이 앱 안에서
 * 보내는 자리라 문서를 새로 받는 일이 없다.
 */
const ENTRY_PATHS: readonly string[] = [
  ROUTES.login,
  ROUTES.oauthKakao,
  ROUTES.depositComplete,
  ROUTES.depositFail,
  ROUTES.depositTransfer,
  ROUTES.health,
];

/**
 * `/my/` 와 `/my` 를 같은 것으로 본다. 정규화하지 않으면 슬래시 하나 붙은 주소만
 * 규칙을 비껴간다.
 */
function normalize(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/** 문서를 새로 받으며 이 경로로 들어왔을 때 홈으로 보내야 하는가. */
export function needsBootLanding(pathname: string): boolean {
  const path = normalize(pathname);
  return path !== ROUTES.home && !ENTRY_PATHS.includes(path);
}
