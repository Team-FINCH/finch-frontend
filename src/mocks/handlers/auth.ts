import { http, HttpResponse } from 'msw';

import { API_PATHS } from '@/shared/config/apiContract';
import {
  AUTH_ERROR_CODES,
  COMMON_ERROR_CODES,
} from '@/shared/types/errorCodes';

import { mockPath } from '../lib/http';
import {
  ACCESS_TOKEN_EXPIRED,
  ACCESS_TOKEN_FRESH,
  clearMockRefreshToken,
  readBearerToken,
  readMockRefreshToken,
  rotateMockRefreshToken,
} from '../lib/session';

/**
 * 인증 4종 (apiSpec §2). **`handlers.ts` 에 있던 것을 동작 그대로 옮겼다.**
 * 공용 도구만 `lib/` 로 빠졌고 응답 값과 갈래는 바뀌지 않았다.
 *
 * 상태 유지 범위 — Refresh 쿠키만 새로고침을 견딘다 (`lib/session.ts`).
 */

/**
 * 인가 코드 접두사로 응답을 고른다. 백엔드 없이 네 갈래를 다 확인할 수 있다.
 * fail(인증 실패) · expire(만료 토큰 발급) · new(최초 로그인) · 그 밖(기존 회원)
 */
const KAKAO_FAIL_CODE_PREFIX = 'fail';
const KAKAO_EXPIRED_CODE_PREFIX = 'expire';
const KAKAO_NEW_USER_CODE_PREFIX = 'new';

/**
 * 목 프로필 사진. **외부를 부르지 않는다** (FINCH-306).
 *
 * 전에는 `https://placehold.co/96x96` 이었다. **MSW 는 `/api/*` 만 가로채므로 그
 * 요청은 진짜로 인터넷에 나갔다.** 오프라인이거나 망이 막으면 `onError` 가 떠서
 * 이니셜 배지로 내려앉는다 — 같은 코드가 망 상태에 따라 다른 화면을 냈고, 화면을
 * 보는 사람마다 다른 것을 봤다. 목은 재현 가능해야 한다.
 *
 * **`null` 로 두는 편이 더 간단하지만 그러지 않았다.** 그러면 `<img>` 경로를 개발
 * 중에 한 번도 보지 않게 되고, 사진이 있는 사용자에서만 나는 문제(원형 크롭 ·
 * `object-cover` · 세로로 긴 사진)를 놓친다. 아래 최초 로그인 분기가 이미 `null`
 * 이라 두 경로가 다 살아 있는 편이 낫다.
 *
 * base64 로 박지 않은 것은 다음 사람이 무엇이 들었는지 읽을 수 있게 하려는 것이다.
 * 96×96 은 전 자리표시자와 같은 크기다 — 화면에서는 56px(`size-14`) 원에 들어가므로
 * 원본이 그보다 크기만 하면 된다.
 */
const MOCK_PROFILE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">' +
  '<rect width="96" height="96" fill="#dde2e8"/>' +
  '<circle cx="48" cy="38" r="16" fill="#aeb6c0"/>' +
  '<path d="M16 88a32 32 0 0 1 64 0z" fill="#aeb6c0"/>' +
  '</svg>';

const MOCK_PROFILE_IMAGE_URL = `data:image/svg+xml,${encodeURIComponent(MOCK_PROFILE_SVG)}`;

export const authHandlers = [
  http.post(mockPath(API_PATHS.auth.kakao), async ({ request }) => {
    const body = (await request.json()) as { authorizationCode?: unknown };
    const authorizationCode = body.authorizationCode;

    if (typeof authorizationCode !== 'string' || authorizationCode === '') {
      return HttpResponse.json(
        {
          code: COMMON_ERROR_CODES.INVALID_REQUEST,
          message: '요청 값이 올바르지 않습니다',
          detail: { authorizationCode: '필수입니다' },
        },
        { status: 400 },
      );
    }

    if (authorizationCode.startsWith(KAKAO_FAIL_CODE_PREFIX)) {
      return HttpResponse.json(
        {
          code: AUTH_ERROR_CODES.KAKAO_FAILED,
          message: '카카오 인증에 실패했습니다',
        },
        { status: 401 },
      );
    }

    const isNewUser = authorizationCode.startsWith(KAKAO_NEW_USER_CODE_PREFIX);
    const accessToken = authorizationCode.startsWith(KAKAO_EXPIRED_CODE_PREFIX)
      ? ACCESS_TOKEN_EXPIRED
      : ACCESS_TOKEN_FRESH;

    rotateMockRefreshToken();

    return HttpResponse.json({
      accessToken,
      isNewUser,
      user: {
        userId: isNewUser ? 2 : 1,
        nickname: isNewUser ? '새로운핀치' : '홍길동',
        // 신규 유저는 프로필 사진 미동의 상태로 둔다. null 이 실제로 내려오는 경로라
        // (카카오 선택 동의 항목) 목에서도 노출시켜 화면이 그 값을 견디는지 개발 중에 드러나게 한다.
        profileImageUrl: isNewUser ? null : MOCK_PROFILE_IMAGE_URL,
      },
    });
  }),

  http.post(mockPath(API_PATHS.auth.refresh), () => {
    // 쿠키가 없는 것과 무효한 것을 나눈다. 최초 방문자는 반드시 이 경로다 (apiSpec §2.2).
    if (readMockRefreshToken() === null) {
      return HttpResponse.json(
        {
          code: AUTH_ERROR_CODES.REFRESH_TOKEN_MISSING,
          message: '로그인이 필요합니다',
        },
        { status: 401 },
      );
    }

    rotateMockRefreshToken();

    return HttpResponse.json({ accessToken: ACCESS_TOKEN_FRESH });
  }),

  http.post(mockPath(API_PATHS.auth.logout), () => {
    clearMockRefreshToken();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(mockPath(API_PATHS.users.me), ({ request }) => {
    const accessToken = readBearerToken(request);

    if (accessToken === null) {
      return HttpResponse.json(
        {
          code: AUTH_ERROR_CODES.INVALID_TOKEN,
          message: '로그인이 필요합니다',
        },
        { status: 401 },
      );
    }

    if (accessToken === ACCESS_TOKEN_EXPIRED) {
      return HttpResponse.json(
        {
          code: AUTH_ERROR_CODES.TOKEN_EXPIRED,
          message: '로그인이 만료되었습니다',
        },
        { status: 401 },
      );
    }

    return HttpResponse.json({
      userId: 1,
      nickname: '홍길동',
      profileImageUrl: MOCK_PROFILE_IMAGE_URL,
      joinedAt: '2026-08-25T10:00:00+09:00',
    });
  }),
];
