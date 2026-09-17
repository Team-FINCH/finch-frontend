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
 *
 * 예외는 하나뿐이다 — **앱이 스스로 건 새로고침**. 아래 `RECOVERY_PATH_KEY` 주석을
 * 본다 (FINCH-320).
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

/**
 * 앱이 스스로 건 새로고침을 알리는 자리 (FINCH-320).
 *
 * `app/installChunkRecovery` 는 lazy 청크를 못 받으면 문서를 새로 받아 스스로 낫는다.
 * 그 새로고침이 위 규칙의 "문서를 새로 받았다" 에 그대로 걸려서, **화면을 옮기던
 * 사용자가 홈으로 튕겼다.** 설치형 PWA 에서 화면 이동이 자주 홈으로 끝나던 원인이다
 * (2026-09-17 실기기 관측). 청크 실패는 빌드 산출물에서만 나므로 dev 서버에서는
 * 재현되지 않는다.
 *
 * **규칙 자체는 그대로 둔다.** 주소를 직접 치고 들어오거나 사용자가 새로고침한
 * 경우는 여전히 홈에서 시작한다 (2026-09-17 재확인). 여기서 비켜 가는 것은 **앱이
 * 스스로 건 새로고침 한 번**뿐이다.
 *
 * 저장 자리가 `sessionStorage` 인 이유는 `installChunkRecovery` 의 무한 새로고침
 * 가드와 같다 — 표시가 **문서를 새로 받아도 살아남아야** 하고(모듈 변수는 함께
 * 사라진다), 이 고장은 탭 하나의 상태다.
 *
 * **키는 그 가드의 `finch.chunkReload.at` 과 따로 둔다.** 한 키를 나눠 쓰면 이 값이
 * 가드의 "방금 새로고침했는가" 판정에 끼어들어, 한 번 복구한 탭이 다음 고장에서
 * 낫지 못하거나 반대로 무한히 도는 쪽으로 기운다.
 */
const RECOVERY_PATH_KEY = 'finch.chunkReload.path';

/**
 * 새로고침을 걸기 직전에 지금 주소를 적어 둔다. `app/installChunkRecovery` 만 부른다.
 *
 * 스토리지가 막힌 환경(사파리 프라이빗 모드)이면 조용히 지나간다. 표시가 없으면 새
 * 문서는 예전처럼 홈에 착지할 뿐, 청크 복구 자체는 그대로 돈다.
 */
export function rememberChunkRecoveryPath(pathname: string): void {
  try {
    sessionStorage.setItem(RECOVERY_PATH_KEY, pathname);
  } catch {
    // 위 주석 참고. 적지 못한 것으로 여기서 할 수 있는 일이 없다.
  }
}

/**
 * 이 문서에서 표시를 이미 읽었는지.
 *
 * `undefined` 는 "아직 안 읽었다", `null` 은 "읽었더니 없었다" 다. 읽는 순간
 * 지우므로 **기억해 두지 않으면 두 번째 호출이 빈손이 된다** — `RootLayout` 은
 * StrictMode 의 이중 렌더에서 `needsBootLanding` 을 두 번 부르고, 그때 두 번째
 * 판정이 착지시키는 쪽으로 뒤집히면 화면에 남는 것은 그쪽이다.
 *
 * 모듈 스코프인 것도 같은 이유다. "문서 하나에 한 번" 이 정확히 이 모듈의 수명이다
 * (`RootLayout` 의 `hasHandledBootLanding` 과 같은 방식).
 */
let recoveredPath: string | null | undefined;

/**
 * **읽으면 반드시 지운다.** 남겨 두면 그다음 새로고침까지 착지를 건너뛴다 — 그때는
 * 사용자가 직접 새로고침한 것이라 홈에서 시작하는 것이 맞다.
 */
function readAndClearRecoveryPath(): string | null {
  try {
    const raw = sessionStorage.getItem(RECOVERY_PATH_KEY);
    sessionStorage.removeItem(RECOVERY_PATH_KEY);
    return raw;
  } catch {
    // 스토리지가 막혔으면 적힌 표시도 없다. 규칙을 그대로 태운다.
    return null;
  }
}

function takeRecoveryPath(): string | null {
  if (recoveredPath === undefined) {
    recoveredPath = readAndClearRecoveryPath();
  }
  return recoveredPath;
}

/** 문서를 새로 받으며 이 경로로 들어왔을 때 홈으로 보내야 하는가. */
export function needsBootLanding(pathname: string): boolean {
  const path = normalize(pathname);

  /*
   * 표시는 경로를 따지기 전에, 어느 갈래로 가든 소비한다 (FINCH-320). 한 번
   * 쓰고 지우는 값이라 읽지 않고 지나가는 갈래를 두면 다음 문서까지 따라간다.
   *
   * **적어 둔 주소가 지금 주소와 같을 때만** 착지를 건너뛴다. `location.reload()` 는
   * 주소를 그대로 두므로 앱이 건 새로고침이면 둘은 반드시 같다. 그래서 값이 손으로
   * 고쳐졌든 앱 밖의 무엇이든 따로 검사할 것이 없다 — 지금 주소와 다르면 규칙이
   * 그대로 돌아 홈으로 간다. `ENTRY_PATHS` 의 주소가 적혀 있어도 결과는 같다
   * (그 경로들은 어차피 홈으로 보내지 않는다).
   */
  const recovered = takeRecoveryPath();
  if (recovered !== null && normalize(recovered) === path) {
    return false;
  }

  return path !== ROUTES.home && !ENTRY_PATHS.includes(path);
}
