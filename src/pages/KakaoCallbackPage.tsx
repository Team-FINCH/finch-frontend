import { KakaoCallback } from '@/features/auth';
import { isOnboardingDone } from '@/features/onboarding/lib/onboardingDone';
import { ROUTES } from '@/shared/config/routes';
import { PageMain } from '@/shared/ui/PageMain';

/**
 * 로그인 직후 갈 곳을 정한다. **홈 아니면 온보딩 둘뿐이다** (FINCH-295).
 *
 * **신규 사용자는 온보딩으로 보낸다** (design.md §7.16). 다만 `isNewUser` 만으로는
 * 부족하다 — 온보딩을 건너뛴 사람이 다시 로그인하면 `isNewUser` 가 `false` 라 두 번
 * 보내지 않지만, 반대로 가입 직후 화면을 닫았다 다시 들어오면 `isNewUser` 가 `false`
 * 인데도 온보딩을 한 번은 보여주는 편이 맞다. 그 판정을 로컬 완료 표시가 맡는다
 * (`features/onboarding/lib/onboardingDone`).
 *
 * **로그인 전에 보려던 화면은 더 이상 고려하지 않는다.** 전에는 `redirectTo` 가
 * 홈이 아니면 온보딩보다 그쪽을 우선했는데, 착지가 언제나 홈으로 정해지면서
 * 그 갈래가 통째로 사라졌다 (`app/bootLanding.ts`).
 */
function resolveDestination({ isNewUser }: { isNewUser: boolean }): string {
  if (!isNewUser || isOnboardingDone()) {
    return ROUTES.home;
  }
  return ROUTES.onboarding;
}

/** 카카오 콘솔에 등록한 redirect URI 와 같은 경로여야 한다 (ia.md §1). */
export function KakaoCallbackPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* 앱 셸 — 본문만 이 안에서 굴러간다 (FINCH-297, `shared/ui/PageMain` 주석). */}
      <PageMain className="pt-6">
        <KakaoCallback resolveDestination={resolveDestination} />
      </PageMain>
    </div>
  );
}
