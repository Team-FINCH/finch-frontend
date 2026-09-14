import { create } from 'zustand';

/**
 * 세 상태인 이유. 앱이 뜨는 순간 Access Token 은 반드시 없고(메모리라서)
 * 부팅 복구 응답은 그 뒤에 온다. 그 구간을 unauthenticated 로 두면 가드가 즉시
 * 로그인 화면으로 보냈다가 복구 성공에 되돌아와 화면이 번쩍인다 (컨벤션 §4).
 */
export type AuthStatus = 'unknown' | 'unauthenticated' | 'authenticated';

/**
 * 세션이 왜 비었는지 (FINCH-260).
 *
 * `status: 'unauthenticated'` 하나로는 부족하다. **가드가 비로그인 사용자를 어디로
 * 보낼지가 여기서 갈린다.**
 *
 * - `expired` — 부팅 복구 실패 · 재발급 실패. 사용자가 원한 것이 아니라 중간에
 *   끊긴 것이므로 **보려던 화면을 기억했다가 로그인 뒤 그곳으로 되돌린다.**
 *   알림·브리핑 링크로 종목 상세를 열었다가 튕긴 경우가 이것이다
 * - `signedOut` — 사용자가 로그아웃 버튼을 눌렀다. **기억할 "보려던 화면"이 없다.**
 *   방금 있던 자리는 떠나려고 누른 자리다
 *
 * 전에는 이 둘이 갈리지 않아 마이페이지에서 로그아웃하면 `RequireAuth` 가
 * `/login?redirect=%2Fmy` 로 보냈고, 다시 로그인하면 홈이 아니라 마이페이지가
 * 열렸다. 딥링크 복귀 기능이 로그아웃에도 걸린 것이었다.
 */
export type SessionEndReason = 'signedOut' | 'expired';

type AuthSessionState = {
  status: AuthStatus;
  /**
   * 마지막으로 세션이 비워진 사유. 아직 한 번도 비워지지 않았으면 `null` 이다.
   * 읽는 곳은 `RequireAuth` 하나다.
   */
  sessionEndReason: SessionEndReason | null;
  /**
   * 메모리에만 둔다 (컨벤션 §4). 스토리지에 두면 XSS 로 들어온 스크립트가
   * 한 줄로 가져간다. Refresh Token 은 HttpOnly 쿠키라 여기 자리가 없다.
   */
  accessToken: string | null;
  /** 최초 로그인이면 서버가 계좌·예수금을 함께 만든 것이다 (apiSpec §2.1). */
  isNewUser: boolean;
  setSession: (session: { accessToken: string; isNewUser: boolean }) => void;
  /** 재발급 성공. isNewUser 는 건드리지 않는다 — 재발급은 가입이 아니다. */
  renewAccessToken: (accessToken: string) => void;
  /**
   * 로그아웃과 세션 만료가 함께 쓴다. 결과는 둘 다 "세션 없음이 확인된 상태"지만
   * **그 뒤에 갈 곳이 다르므로 사유를 함께 받는다** (`SessionEndReason` 주석).
   *
   * 기본값이 `expired` 인 이유 — 사유를 적지 않은 호출은 사용자가 원해서 끊긴
   * 것이 아니다. 로그아웃만이 자기 사유를 명시적으로 밝힌다. 반대로 두면
   * 새로 생긴 만료 경로가 사유를 빠뜨렸을 때 조용히 로그아웃처럼 굴어
   * 보려던 화면을 잃는다.
   */
  clearSession: (reason?: SessionEndReason) => void;
};

/**
 * 사용자 정보는 여기 없다. 닉네임·프로필은 서버가 원본을 갖는 서버 상태라
 * GET /users/me 쿼리가 유일한 출처다 (컨벤션 §4).
 */
export const useAuthSession = create<AuthSessionState>((set) => ({
  status: 'unknown',
  sessionEndReason: null,
  accessToken: null,
  isNewUser: false,
  // 로그인에 성공했으므로 지난 사유를 버린다. 남기면 로그아웃한 뒤 다시 로그인해
  // 세션이 또 만료됐을 때 그 만료가 로그아웃으로 읽힌다.
  setSession: ({ accessToken, isNewUser }) =>
    set({
      status: 'authenticated',
      sessionEndReason: null,
      accessToken,
      isNewUser,
    }),
  renewAccessToken: (accessToken) =>
    set({ status: 'authenticated', sessionEndReason: null, accessToken }),
  clearSession: (reason = 'expired') =>
    set({
      status: 'unauthenticated',
      sessionEndReason: reason,
      accessToken: null,
      isNewUser: false,
    }),
}));
