import { useEffect, useRef } from 'react';

import { refreshSession } from '../model/refreshSession';
import { useAuthSession } from '../model/useAuthSession';

/** 카카오 콜백 라우트 (ia.md §1). KAKAO_REDIRECT_URI 의 경로 부분과 같다. */
const OAUTH_CALLBACK_PATH = '/oauth/kakao';

/**
 * 판단이 서지 않을 때만(`unavailable`) 다시 물어보는 간격 (FINCH-302).
 *
 * **두 번이면 충분하다.** 노리는 것은 배포 중 순단이나 잠깐 끊긴 네트워크이고 그 창은
 * 보통 1~2초다. 더 늘리면 서버가 정말로 죽었을 때 로그인 화면에 닿지 못한 채
 * 스켈레톤만 오래 보여 준다 — 되살릴 수 없는 세션을 기다리는 시간은 사용자에게
 * 고장과 구분되지 않는다.
 *
 * 재시도가 상황을 더 나쁘게 만들지는 않는다. 회전 충돌을 만난 서버는 거절만 하고
 * 저장된 토큰을 지우지는 않으므로(`AuthService.refresh`), 살아나면 세션을 건지고
 * 끝내 실패하면 원래 가던 결말로 간다.
 */
const RETRY_DELAYS_MS = [400, 1200];

/**
 * 부팅 시 세션을 한 번 복구한다. 이 호출이 없으면 새로고침할 때마다 로그아웃된다 —
 * 로그인은 살아 있는데(Refresh 쿠키가 남아 있다) 프론트만 모르는 상태가 된다.
 *
 * 최초 방문자에게 실패하는 것은 정상이라 조용히 넘긴다. 백엔드가
 * AUTH_REFRESH_TOKEN_MISSING 을 따로 주는 이유도 이것이다 (apiSpec §2.2).
 */
export function useRestoreSession(): void {
  // 회전 방식이라 StrictMode 의 두 번째 실행이 첫 번째가 버린 토큰을 쓰게 된다.
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;

    /**
     * 콜백 화면에서는 복구하지 않는다. 지금 로그인 교환이 진행 중이라 복구할 세션이
     * 따로 없고, 두 요청이 병렬로 Refresh Token 을 회전시키면 서로를 무효화한다.
     * 늦게 끝난 쪽이 먼저 끝난 쪽의 토큰을 덮어쓰는 경쟁도 여기서 생긴다.
     */
    if (window.location.pathname === OAUTH_CALLBACK_PATH) {
      return;
    }

    /**
     * `async`/`await` 가 아니라 프로미스 콜백으로 쓴다 — 이펙트에서 시작하는 자리라
     * `KakaoCallback` 과 같은 이유다(그 주석 참고).
     */
    function attempt(retryIndex: number): void {
      void refreshSession().then((result) => {
        /**
         * 복구에 성공했거나 그 사이 다른 경로로 세션이 정해졌으면 여기서 끝이다.
         * 재시도가 예약된 동안 로그인이 설 수 있으므로 **매 회차 다시 확인한다** —
         * 뒤늦게 도착한 타이머가 방금 선 세션을 비우면 로그인 직후에 튕긴다.
         */
        if (useAuthSession.getState().status !== 'unknown') {
          return;
        }

        const delayMs = RETRY_DELAYS_MS[retryIndex];
        if (result.status === 'unavailable' && delayMs !== undefined) {
          window.setTimeout(() => {
            attempt(retryIndex + 1);
          }, delayMs);
          return;
        }

        /**
         * 여기 닿는 경우는 둘뿐이다. 서버가 세션 없음을 확정했거나(`noSession`),
         * 재시도를 다 썼는데도 판단이 서지 않거나. 어느 쪽이든 지금 보여 줄 수 있는
         * 것은 로그인 화면뿐이다.
         *
         * 사유를 적지 않아 기본값 `expired` 가 쓰인다 — 사용자가 떠난 것이 아니라
         * 중간에 끊긴 것이므로 보려던 화면을 기억했다가 로그인 뒤 그곳으로 되돌린다
         * (`SessionEndReason` 주석).
         */
        useAuthSession.getState().clearSession();
      });
    }

    attempt(0);
  }, []);
}
