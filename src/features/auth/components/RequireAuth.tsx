import { Navigate, Outlet } from 'react-router-dom';

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
     * **보려던 화면을 기억하지 않는다** (FINCH-295). 스스로 로그아웃했든
     * 세션이 끊겼든 `/login` 하나로 보내고, 로그인하면 홈에서 시작한다.
     *
     * 전에는 세션이 끊긴 갈래만 `?redirect=` 에 지금 경로를 실어 보냈다
     * (FINCH-260 이 로그아웃 갈래를 그 대상에서 뺐다). 착지가 갈래마다
     * 다르면 같은 로그인 화면이 어디서 왔는지에 따라 다른 곳으로 떨어지는데,
     * 이제 그 규칙 자체를 없앴다 — 재진입은 언제나 홈이다
     * (`app/bootLanding.ts`).
     */
    return <Navigate to={ROUTES.login} replace />;
  }

  return <Outlet />;
}
