import { Navigate } from 'react-router-dom';

import { KakaoLoginButton, LoginHero, useAuthSession } from '@/features/auth';
import { ROUTES } from '@/shared/config/routes';

/**
 * 로그인 화면 (`/login`, 프로토타입 `isLanding`). 자체 회원가입 폼은 없다 —
 * 인증 수단은 카카오 OAuth 하나이고 최초 로그인이면 서버가 계정과 함께 가상
 * 계좌·예수금을 만든다 (apiSpec §2.1).
 *
 * ## 골격
 *
 * `PageMain` 을 쓰지 않는다. 그쪽은 헤더 아래에서 굴러가는 본문을 위한 것이고,
 * 이 화면은 프로토타입대로 본문이 세로 가운데에 놓이고 버튼이 바닥에 붙는
 * 한 장짜리다. `OnboardingPage` 가 같은 이유로 같은 골격을 쓴다.
 *
 * 높이는 `h-dvh` 가 아니라 `min-h-dvh` 다. 화면이 짧은 기기에서 히어로가
 * 뷰포트보다 길어지는데, 높이를 못 박으면 약관 문구가 잘린 채 스크롤도 되지
 * 않는다.
 *
 * ## 착지는 언제나 홈이다
 *
 * **`?redirect=` 를 읽지 않는다** (FINCH-295). 전에는 이 화면이 그 값으로
 * 착지점을 정했고 `RequireAuth` 가 값을 실어 보냈다. 이제 보내는 쪽이 없고,
 * 주소창에 손으로 붙여도 무시한다 — 읽는 자리를 남겨 두면 "언제나 홈" 을 비껴갈
 * 구멍이 그대로 남는다.
 */
export function LoginPage() {
  const status = useAuthSession((state) => state.status);

  // 이미 로그인한 사람에게 버튼을 보여 주지 않는다. 눌러도 카카오가 곧바로
  // 되돌려보내지만 그 사이 화면이 두 번 깜빡인다.
  // unknown 일 때는 판단하지 않는다. 아직 모르는 것이지 비로그인이 아니다.
  if (status === 'authenticated') {
    return <Navigate to={ROUTES.home} replace />;
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-bg">
      <LoginHero />

      <div className="flex-none px-6.5 pb-[calc(1.625rem+env(safe-area-inset-bottom))]">
        <KakaoLoginButton />

        {/*
          약관 페이지는 이번 범위에 없다. 그래서 밑줄 표기는 프로토타입대로
          두되 누를 수 없는 글자로 둔다 — 갈 곳 없는 링크를 눌러 보고 아무 일도
          일어나지 않는 쪽이, 눌리지 않는 글자보다 나쁘다.
          약관 화면이 생기면 이 두 `span` 을 `Link` 로 바꾼다.
        */}
        <p className="mt-3.5 text-center text-caption leading-[19px] text-text-muted">
          시작하면{' '}
          <span className="text-text-secondary underline underline-offset-2">
            이용약관
          </span>
          과{' '}
          <span className="text-text-secondary underline underline-offset-2">
            개인정보 처리방침
          </span>
          에 동의하게 됩니다.
        </p>
      </div>
    </div>
  );
}
