import { rememberChunkRecoveryPath } from './bootLanding';

/**
 * 배포가 도는 동안 청크를 못 받으면 새 문서를 받아 스스로 낫는다 (FINCH-304).
 *
 * ## 무엇이 터지나
 *
 * 이미 열려 있던 탭은 배포 전의 `index.html` 을 들고 있다. 라우트가 lazy 로 갈려
 * 있어서(`app/router.tsx` 의 `lazyPage`) 화면을 옮기는 순간 그 문서가 아는 해시의
 * 청크를 요청하는데, 배포가 파일을 갈아 끼우는 찰나에 그 이름이 없으면 dynamic
 * import 가 실패한다. 사용자에게는 이렇게 보였다.
 *
 * ```
 * Failed to fetch dynamically imported module: .../assets/HomePage-CFCKXvft.js
 * ```
 *
 * 나중에 그 URL 을 직접 받아 보면 200 이다 — 파일이 지워져 남은 것이 아니라
 * **교체되는 순간에 걸린 것**이다. 그래서 간헐적이고 배포 직후에만 난다.
 *
 * **PWA 가 이 창을 넓힌다.** 서비스워커가 `autoUpdate`(`skipWaiting` +
 * `clientsClaim`, `vite.config.ts`)라 새 워커가 기다리지 않고 즉시 기존 탭을
 * 가져가는데, 이미 그려진 페이지는 여전히 옛 JS 를 들고 있다. 문서와 워커의 판이
 * 어긋난 탭이 그만큼 더 오래 남는다. 갱신 전략 자체는 이 티켓에서 바꾸지 않는다.
 *
 * ## 고치는 법
 *
 * Vite 는 dynamic import 가 실패하면 `window` 에 `vite:preloadError` 를 쏜다.
 * 새로고침하면 브라우저가 새 `index.html` 을 받아 새 해시를 알게 되므로 저절로 낫는다.
 *
 * **이 이벤트는 빌드 산출물에서만 난다.** 이벤트를 쏘는 `__vitePreload` 헬퍼를
 * 끼우는 것이 빌드 전용 플러그인(`vite:build-import-analysis`)이고, dev 서버는
 * 애초에 청크를 해시로 가르지 않아 이 고장이 재현되지 않는다. 그래서 이 파일의
 * 검증은 `npm run build` + `npm run preview` 로만 된다 — dev 에서 아무 일도 일어나지
 * 않는 것이 정상이다.
 *
 * ## 무한 새로고침 가드
 *
 * 새로고침했는데도 또 실패하면(네트워크가 정말 죽었거나 서버가 망가진 경우) 이
 * 핸들러는 무한히 돈다. 새로고침한 사실을 **문서가 바뀌어도 살아남는 곳**에 적어야
 * 다음 문서가 그것을 읽고 멈출 수 있다 — 모듈 변수로는 안 된다. 새로고침이 모듈을
 * 통째로 다시 만들어 표시가 함께 사라지기 때문이다.
 *
 * `sessionStorage` 를 고른 이유는 범위가 정확히 맞기 때문이다. 이 고장은 "이 탭이
 * 옛 문서를 들고 있다" 는 탭 하나의 상태이고, `sessionStorage` 는 탭마다 따로이며
 * 탭을 닫으면 사라진다. `localStorage` 면 한 번의 실패가 다른 탭과 다음 방문까지
 * 따라다녀 만료를 직접 관리해야 한다.
 *
 * 값은 불린이 아니라 **새로고침을 건 시각**이다. 불린이면 한 번 복구한 탭은 그 탭이
 * 살아 있는 내내 다시는 스스로 낫지 못한다 — 오래 열어 두는 탭이 다음 배포에서
 * 또 깨지는데, 그때가 바로 이 장치가 필요한 순간이다. 시각을 적어 두면 판정이
 * "방금 새로고침했는가" 가 되어, 직전 시도가 실패한 경우(=새 문서가 뜨자마자 다시
 * 터진 경우)만 걸러 내고 한참 뒤의 새로운 고장에는 다시 한 번 기회를 준다.
 *
 * 창을 1분으로 잡은 것은 두 시간 사이에 있으면 되기 때문이다. 문서를 새로 받아
 * 앱이 뜨기까지 걸리는 시간보다는 넉넉히 길고(그보다 짧으면 느린 회선에서 표시가
 * 만료돼 다시 새로고침한다), 배포와 배포 사이 간격보다는 훨씬 짧다.
 *
 * 가드에 걸려 새로고침을 포기하면 **에러를 삼키지 않는다.** 그대로 던지게 두면
 * 라우터의 `errorElement` 가 받아 사용자용 오류 화면을 낸다 (`app/RouteErrorPage`).
 *
 * ## 새로고침 뒤에 어디에 떨어지나 (FINCH-320)
 *
 * 여기서 문서를 새로 받으면 재진입 착지 규칙(`app/bootLanding`, FINCH-295)이
 * 그것을 "밖에서 주소를 들고 들어왔다" 로 읽고 **홈으로 보낸다.** 그래서 화면을
 * 옮기다 청크를 못 받은 사용자는 가려던 화면 대신 홈에 떨어졌다 — 설치형 PWA 에서
 * 잦았고 2026-09-17 에 실기기로 관측됐다. 복구가 사용자 눈에는 "탭을 잘못 눌렀다"
 * 로만 보인 것이다.
 *
 * 새로고침을 걸기 직전에 `rememberChunkRecoveryPath` 로 지금 주소를 적어 두면, 새
 * 문서의 `bootLanding` 이 그 한 번만 착지를 건너뛴다. **착지 규칙 자체는 그대로다** —
 * 사용자가 직접 주소를 치거나 새로고침한 경우는 여전히 홈에서 시작한다.
 */

const STORAGE_KEY = 'finch.chunkReload.at';

/** 위 주석 "무한 새로고침 가드" 참고. */
const RETRY_WINDOW_MS = 60_000;

/** 직전 새로고침이 이 창 안에 있으면 그 시도가 실패한 것으로 본다. */
function hasRecentReload(): boolean {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    // 스토리지 접근 자체가 막힌 환경이다. 표시를 읽을 수 없으면 새로고침이 몇
    // 번째인지 알 수 없으므로 "방금 시도했다" 로 본다 — 아래 `setItem` 이 같은
    // 이유로 실패할 것이고, 근거 없이 새로고침하면 그대로 무한 루프다.
    return true;
  }

  if (raw === null) {
    return false;
  }

  const at = Number(raw);
  // 남의 값이나 손으로 고친 값이 들어오면 숫자가 아니다. 판정할 수 없으면
  // "방금 시도했다" 쪽으로 기운다 — 무한 루프보다 오류 화면이 낫다.
  if (!Number.isFinite(at)) {
    return true;
  }

  return Date.now() - at < RETRY_WINDOW_MS;
}

export function installChunkRecovery(): void {
  window.addEventListener('vite:preloadError', (event) => {
    if (hasRecentReload()) {
      // 방금 새로고침하고도 또 실패했다. 한 번 더 돌면 무한이다.
      return;
    }

    try {
      sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // 사파리 프라이빗 모드처럼 스토리지가 막힌 환경이다. 표시를 남길 수 없으면
      // 다음 문서가 멈출 근거도 없으므로 **새로고침하지 않는다.** 복구를 포기하고
      // 오류 화면을 내는 쪽이 무한 새로고침보다 낫다.
      return;
    }

    /*
     * 주소는 **새로고침이 확정된 뒤에** 적는다 (FINCH-320). 위의 두 `return`
     * 보다 앞에서 적으면 새로고침 없이 표시만 남아, 나중에 사용자가 직접 새로고침한
     * 문서가 착지를 건너뛴다.
     *
     * 키가 가드의 것과 달라서 위 `hasRecentReload` 판정에는 끼어들지 않는다.
     */
    rememberChunkRecoveryPath(window.location.pathname);

    // 이 문서는 어차피 버린다. 던지게 두면 새로고침이 시작되기까지 오류 화면이
    // 한 번 번쩍인다.
    event.preventDefault();
    window.location.reload();
  });
}
