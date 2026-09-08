import { KakaoCallback } from '@/features/auth';
import { isOnboardingDone } from '@/features/onboarding/lib/onboardingDone';
import { ROUTES } from '@/shared/config/routes';
import { PageMain } from '@/shared/ui/PageMain';

/**
 * 로그인 직후 갈 곳을 정한다.
 *
 * **신규 사용자는 온보딩으로 보낸다** (design.md §7.16). 다만 `isNewUser` 만으로는
 * 부족하다 — 온보딩을 건너뛴 사람이 다시 로그인하면 `isNewUser` 가 `false` 라 두 번
 * 보내지 않지만, 반대로 가입 직후 화면을 닫았다 다시 들어오면 `isNewUser` 가 `false`
 * 인데도 온보딩을 한 번은 보여주는 편이 맞다. 그 판정을 로컬 완료 표시가 맡는다
 * (`features/onboarding/lib/onboardingDone`).
 *
 * **로그인 전에 보려던 화면이 있으면 그곳이 우선이다.** 링크를 눌러 들어온 사람을
 * 온보딩으로 끌고 가면 원래 보려던 것을 잃는다.
 */
function resolveDestination({
  isNewUser,
  redirectTo,
}: {
  isNewUser: boolean;
  redirectTo: string;
}): string {
  const wantsSpecificScreen = redirectTo !== ROUTES.home;
  if (wantsSpecificScreen || !isNewUser || isOnboardingDone()) {
    return redirectTo;
  }
  return ROUTES.onboarding;
}

/** 카카오 콘솔에 등록한 redirect URI 와 같은 경로여야 한다 (ia.md §1). */
export function KakaoCallbackPage() {
  return (
    <PageMain>
      <KakaoCallback resolveDestination={resolveDestination} />
    </PageMain>
  );
}
