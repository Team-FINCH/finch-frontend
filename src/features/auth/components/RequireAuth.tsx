import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';
import { PageMain } from '@/shared/ui/PageMain';
import { Skeleton } from '@/shared/ui/Skeleton';

import { useAuthSession } from '../model/useAuthSession';

/**
 * 인증이 필요한 라우트를 감싸는 레이아웃 라우트. 보호할 화면은 children 으로 넣는다.
 * 화면마다 검사를 심으면 새 화면을 추가할 때 빠뜨리는 자리가 생기고, 빠뜨린 화면은
 * 아무 일도 안 일어난 것처럼 보여서 리뷰에서도 안 걸린다.
 *
 * **비로그인 사용자를 어디로 보낼지 정하는 곳은 여기 하나다** (FINCH-260).
 * `LogoutButton` 이 스스로 이동하지 않는 이유가 이것이다 — 두 곳이 각자 판단하면
 * 한쪽만 고쳐 두고 다른 쪽에서 어긋난다.
 */
export function RequireAuth() {
  const status = useAuthSession((state) => state.status);
  const sessionEndReason = useAuthSession((state) => state.sessionEndReason);
  const location = useLocation();

  // unknown 을 unauthenticated 로 합치면 새로고침할 때마다 로그인 화면이 번쩍인다.
  if (status === 'unknown') {
    return (
      <PageMain aria-busy="true" aria-label="세션 확인 중">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-4 h-24 w-full" />
      </PageMain>
    );
  }

  if (status === 'unauthenticated') {
    /**
     * 스스로 로그아웃했으면 돌아갈 곳을 기억하지 않는다 (FINCH-260).
     * 지금 서 있는 자리는 "보려다 못 본 화면" 이 아니라 **떠나려고 버튼을 누른
     * 자리**다. 이것을 기억하면 마이페이지에서 로그아웃한 사람이 다시 로그인했을 때
     * 홈이 아니라 마이페이지로 떨어진다.
     *
     * 홈이 아니라 `/login` 으로 보낸다. 로그인 화면은 착지점을 `redirect` 로 정하고
     * 그것이 없으면 `toSafeRedirectPath` 가 홈(`DEFAULT_REDIRECT_TO`)을 준다 —
     * 여기서 홈을 한 번 더 적으면 기본 착지점이 두 파일에 갈려 적힌다.
     */
    if (sessionEndReason === 'signedOut') {
      return <Navigate to={ROUTES.login} replace />;
    }

    // 세션이 끊긴 것이지 떠난 것이 아니다. 원래 가려던 곳을 들고 간다. 이 값은
    // 카카오 왕복 동안 state 에 실려 살아남는다.
    // hash 까지 붙이는 이유 — 빼면 앵커나 딥링크로 들어온 사람만 다른 곳에 떨어진다.
    const requestedPath = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Navigate
        to={`${ROUTES.login}?redirect=${encodeURIComponent(requestedPath)}`}
        replace
      />
    );
  }

  return <Outlet />;
}
