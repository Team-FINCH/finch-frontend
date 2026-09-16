/**
 * HTTP 클라이언트가 세션을 다루는 데 필요한 동작의 자리. 구현은 여기 없다.
 *
 * 의존 방향이 단방향이라 shared/api 는 세션 스토어가 있는 features/auth 를
 * import 할 수 없다 (컨벤션 §2). 모양만 여기 두고 app 이 부팅 때 꽂는다.
 * 꽂히기 전에도 요청은 나간다 — 토큰이 안 붙을 뿐이다.
 */
/**
 * 재발급 한 번의 결과.
 *
 * **실패를 두 갈래로 나누는 것이 이 타입의 전부다** (FINCH-302).
 * 전에는 실패가 `null` 하나였고 부르는 쪽이 그것을 모두 "세션이 없다" 로 읽어
 * 로그아웃시켰다. 그래서 백엔드 롤링 배포 중의 502 한 번, 잠깐 끊긴 네트워크 한 번에
 * **서버 세션과 Refresh 쿠키는 멀쩡한데 화면만 로그아웃됐다.**
 *
 * - `noSession` — 서버가 `AUTH_REFRESH_TOKEN_MISSING`·`AUTH_INVALID_TOKEN` 으로
 *   **명시적으로** 거절했다. 다시 물어도 답이 같으므로 로그아웃이 맞다
 * - `unavailable` — 네트워크·5xx·타임아웃·스키마 불일치. **지금 판단할 수 없다는
 *   뜻이지 세션이 없다는 뜻이 아니다.** 세션을 비우는 것은 사용자를 로그인 화면으로
 *   내보내는 되돌릴 수 없는 동작이라 모르는 쪽으로 기울 때는 유지가 기본이다 —
 *   비우지 않으면 다음 요청에서 다시 판정할 기회가 남지만, 비우면 그 기회가 없다
 */
export type SessionRefreshResult =
  | { status: 'renewed'; accessToken: string }
  | { status: 'noSession' }
  | { status: 'unavailable' };

export type AuthBridge = {
  getAccessToken: () => string | null;
  /** 동시에 여러 번 불려도 요청은 한 번만 나가야 한다. 보장은 구현 쪽 책임이다. */
  refreshSession: () => Promise<SessionRefreshResult>;
  /**
   * 화면 이동이 아니라 상태 정리만 한다.
   * **`noSession` 에서만 부른다** — `SessionRefreshResult` 주석 참고.
   */
  onSessionExpired: () => void;
};

let bridge: AuthBridge | null = null;

export function setAuthBridge(next: AuthBridge): void {
  bridge = next;
}

export function getAuthBridge(): AuthBridge | null {
  return bridge;
}
