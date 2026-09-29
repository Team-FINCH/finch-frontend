import { useNavigate } from 'react-router-dom';

import { IS_MOCK_MODE, KAKAO_REST_API_KEY } from '@/shared/config/env';
import { ROUTES } from '@/shared/config/routes';
import { Button } from '@/shared/ui/Button';

import { buildKakaoAuthorizeUrl } from '../lib/buildKakaoAuthorizeUrl';
import { createOauthState } from '../lib/oauthState';

/**
 * 목 모드에서 콜백에 실어 보내는 인가 코드.
 *
 * 목은 비어 있지 않은 코드면 정상 토큰을 준다(`mocks/handlers/auth.ts`). 다만
 * `fail`·`expire`·`new` 로 시작하는 값은 각각 실패·만료·신규 사용자 시나리오라
 * 그 셋을 비껴가는 값이어야 한다.
 */
const MOCK_AUTHORIZATION_CODE = 'mock_authorization_code';

/**
 * **되돌아갈 경로를 받지 않는다** (FINCH-295). 로그인 착지는 언제나 홈이라
 * 고를 것이 없다 — 이 버튼이 경로를 받으면 "언제나 홈" 을 비껴갈 구멍이 생긴다.
 */
export function KakaoLoginButton() {
  const navigate = useNavigate();
  /*
   * 목 모드에서는 카카오 키가 없어도 눌린다. 실제 카카오로 나가지 않기 때문이다.
   */
  const isConfigured = IS_MOCK_MODE || KAKAO_REST_API_KEY !== '';

  const handleClick = () => {
    const state = createOauthState();

    /*
     * **목 모드는 카카오를 거치지 않고 앱 안에서 콜백으로 간다.**
     *
     * 실제 카카오가 필요한 구간은 인가 코드를 받아 오는 것 하나뿐이고, 그 뒤
     * 토큰 교환(`POST /auth/kakao`)은 목이 이미 가로챈다. 목 배포에는 칠 백엔드가
     * 없으므로 바깥까지 다녀올 이유가 없다.
     *
     * **토큰을 직접 심지 않는다.** 콜백으로 보내면 `state` 대조 · 토큰 교환 ·
     * 세션 수립 · 온보딩 분기가 실제와 **같은 코드**를 탄다. 토큰을 심으면 그
     * 경로를 통째로 건너뛰어, 목 배포에서 본 화면이 실제와 다른 길로 만들어진다.
     *
     * 개인정보 측면의 이점도 있다 — 보는 사람이 자기 카카오 계정으로 로그인하지
     * 않아도 된다. 목이 고정 사용자(`홍길동`)로 답한다.
     *
     * 여기만 `location.assign` 이 아니라 라우터다. 우리 라우트라서 문서를 새로
     * 받을 이유가 없고, 새로 받으면 방금 켠 MSW 워커와 첫 요청이 경합한다.
     */
    if (IS_MOCK_MODE) {
      const query = new URLSearchParams({
        code: MOCK_AUTHORIZATION_CODE,
        state,
      });
      void navigate(`${ROUTES.oauthKakao}?${query.toString()}`, {
        replace: true,
      });
      return;
    }

    // navigate 가 아니라 location.assign 이다. 카카오는 우리 앱의 라우트가 아니라
    // 다른 오리진이라 라우터가 다룰 수 있는 대상이 아니다.
    window.location.assign(buildKakaoAuthorizeUrl(state));
  };

  return (
    <div>
      <Button variant="kakao" onClick={handleClick} disabled={!isConfigured}>
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.76 1.83 5.18 4.59 6.56l-1.16 4.26a.3.3 0 0 0 .46.33l5.11-3.38c.33.03.66.05.99.05 5.52 0 10-3.48 10-7.82S17.52 3 12 3Z" />
        </svg>
        카카오로 시작하기
      </Button>
      {isConfigured ? null : (
        <p className="mt-2 text-center text-xs text-text-secondary">
          카카오 REST API 키가 설정되지 않았습니다 (
          <code>VITE_KAKAO_REST_API_KEY</code>)
        </p>
      )}
    </div>
  );
}
