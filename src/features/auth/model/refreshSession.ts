import { isHttpError, type SessionRefreshResult } from '@/shared/api';
import { AUTH_ERROR_CODES } from '@/shared/types/errorCodes';

import { postTokenRefresh } from '../api/postTokenRefresh';

import { useAuthSession } from './useAuthSession';

/**
 * 진행 중인 재발급. 동시에 두 번 나가지 않게 붙잡아 둔다.
 *
 * 서버가 회전 방식이라 재발급마다 옛 Refresh Token 을 버린다. 만료된 요청 여러 개가
 * 각자 재발급을 부르면 두 번째가 첫 번째가 방금 버린 토큰을 들고 가서 실패한다.
 * 병렬로 부르면 자기 세션을 자기가 끊는다.
 */
let inFlightRefresh: Promise<SessionRefreshResult> | null = null;

/**
 * 서버가 "이 세션은 없다" 고 **말한** 경우만 확정으로 본다 (apiSpec §2.2).
 *
 * 화이트리스트로 두는 것이 핵심이다. 목록 밖의 실패는 전부 `unavailable` 로 떨어진다 —
 * 반대로 두면(모르는 것을 확정으로) 새 실패 경로가 생길 때마다 조용히 로그아웃이
 * 하나씩 늘고, 그게 FINCH-302 에서 고치는 고장의 모양이었다.
 */
function classifyFailure(error: unknown): SessionRefreshResult {
  if (!isHttpError(error)) {
    // 타임아웃·요청 취소는 AbortError 이고 응답이 명세와 다르면 SchemaError 다.
    // 어느 쪽도 세션에 대한 판정이 아니다.
    return { status: 'unavailable' };
  }

  // 네트워크가 닿지 못한 실패는 status 0 인 HttpError 로 오는데(httpClient),
  // code 가 없으므로 아래 대조에 걸리지 않아 자연히 unavailable 이 된다.
  const isRejectedByServer =
    error.code === AUTH_ERROR_CODES.REFRESH_TOKEN_MISSING ||
    error.code === AUTH_ERROR_CODES.INVALID_TOKEN;

  return isRejectedByServer
    ? { status: 'noSession' }
    : { status: 'unavailable' };
}

async function runRefresh(): Promise<SessionRefreshResult> {
  try {
    const { accessToken } = await postTokenRefresh();
    useAuthSession.getState().renewAccessToken(accessToken);
    return { status: 'renewed', accessToken };
  } catch (error) {
    /**
     * 실패해도 여기서 세션을 비우지 않는다. 무엇을 할지는 부른 쪽이 정한다.
     * 부팅 복구는 콜백 화면에서 로그인 교환과 병렬로 도는데, 여기서 비우면
     * 순서가 뒤집혔을 때 방금 성공한 로그인을 덮어쓴다.
     *
     * 다만 **왜 실패했는지는 여기서 가린다.** 그 판단에 필요한 에러 코드가 여기까지만
     * 올라오기 때문이다 — 부르는 쪽은 `HttpError` 를 보지 않는다 (컨벤션 §5).
     */
    return classifyFailure(error);
  }
}

/** 여러 번 불러도 요청은 한 번만 나간다. */
export function refreshSession(): Promise<SessionRefreshResult> {
  inFlightRefresh ??= runRefresh().finally(() => {
    inFlightRefresh = null;
  });

  return inFlightRefresh;
}
