import { useMutation, useQueryClient } from '@tanstack/react-query';

import { clearStoredConversationId } from '@/shared/lib/chatConversationId';

import { useAuthSession } from '../model/useAuthSession';

import { postLogout } from './postLogout';

/**
 * 로그아웃. 서버의 Refresh Token, 메모리의 Access Token, 쿼리 캐시를 함께 버린다.
 * 쿠키를 남기면 다음 부팅 복구가 그대로 다시 로그인시키고, 캐시를 남기면 다음 로그인
 * 사용자에게 이전 사용자의 데이터가 잠깐 보인다 — 캐시를 먼저 그리기 때문이다.
 *
 * onSuccess 가 아니라 onSettled 인 이유 — 서버 호출이 실패해도 로컬은 비운다.
 * 네트워크가 끊겼다고 로그아웃 버튼이 아무 일도 안 하면 사용자는 로그인 상태로 남는다.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const clearSession = useAuthSession((state) => state.clearSession);

  return useMutation({
    mutationFn: () => postLogout(),
    onSettled: () => {
      // 세션을 먼저 비운다. 순서가 반대면 캐시를 지우는 순간 아직 로그인 상태로
      // 판단한 쿼리들이 다시 요청을 날린다.
      //
      // 사유를 밝히는 유일한 호출자다 (FINCH-260). 이것을 빠뜨리면 로그아웃이
      // 세션 만료와 구별되지 않아, `RequireAuth` 가 방금 떠난 화면을 "돌아갈 곳"
      // 으로 기억한다 — 다시 로그인했을 때 홈이 아니라 그 화면이 열린다.
      clearSession('signedOut');

      // queryClient.clear() 가 아니다. 그쪽은 mutation 캐시까지 비우는데 지금 실행
      // 중인 이 로그아웃이 거기 들어 있다. 지울 대상은 쿼리 캐시뿐이다.
      queryClient.getQueryCache().clear();

      // 채팅 대화 id 는 쿼리 캐시가 아니라 `localStorage` 에 있어 위 두 줄로는
      // 지워지지 않는다 (FINCH-278). **만료를 두지 않기로 했으므로 지우는
      // 자리는 여기 하나뿐이다** — 지우지 않으면 다음 로그인 사용자(같은 기기)의
      // 채팅에 이전 사용자의 대화가 복원된다.
      clearStoredConversationId();
    },
  });
}
