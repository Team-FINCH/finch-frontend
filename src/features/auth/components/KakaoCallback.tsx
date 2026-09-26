import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { isHttpError } from '@/shared/api';
import { KAKAO_REDIRECT_URI } from '@/shared/config/env';
import { ROUTES } from '@/shared/config/routes';
import { LinkButton } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Skeleton } from '@/shared/ui/Skeleton';

import { useKakaoLogin } from '../api/useKakaoLogin';
import { clearOauthState } from '../lib/oauthState';
import {
  readCallbackPreflight,
  type CallbackFailure,
} from '../lib/readCallbackPreflight';

function describeFailure(failure: CallbackFailure): string {
  switch (failure.kind) {
    case 'kakaoRejected':
      return failure.isCancelled
        ? '카카오 로그인을 취소했어요'
        : '카카오 로그인을 마치지 못했어요';
    case 'missingCode':
      return '카카오에서 로그인 정보가 오지 않았어요. 처음부터 다시 시도해 주세요.';
    case 'stateMismatch':
      return '로그인 요청을 확인하지 못했어요. 처음부터 다시 시도해 주세요.';
    case 'exchangeFailed':
      return failure.message;
  }
}

type KakaoCallbackProps = {
  /**
   * 로그인 성공 후 갈 곳을 부르는 쪽이 고른다.
   *
   * **인증이 온보딩을 알지 않게 하는 자리다** (컨벤션 — feature 끼리 직접
   * import 하지 않고 `pages` 에서 조립한다). 넘기지 않으면 홈으로 간다.
   *
   * **로그인 전에 보려던 화면으로 돌아가지 않는다** (FINCH-295). 전에는
   * `redirectTo` 를 state 에 실어 왕복시켰는데, 착지가 언제나 홈으로 정해지면서
   * 운반할 값이 사라졌다 (`lib/oauthState.ts`).
   */
  resolveDestination?: (result: { isNewUser: boolean }) => string;
};

/**
 * 카카오가 되돌려보낸 인가 코드를 세션으로 바꾼다 (`/oauth/kakao`).
 * 대부분 즉시 지나가지만 라우트를 갖는 이유는 카카오에 등록한 redirect URI 가
 * 실제로 열리는 주소여야 하기 때문이다.
 *
 * **교환 결과를 뮤테이션 콜백이 아니라 `mutateAsync` 가 돌려주는 프로미스에서
 * 읽는다.** 전에는 `mutate(…, { onSuccess: navigate })` 였는데 화면이
 * `로그인 중입니다` 에서 영영 멈췄다. 원인은 **마운트 이펙트에서 시작한 뮤테이션이
 * `StrictMode` 에서 관측자를 잃는 것**이다.
 *
 *   1. 마운트 이펙트가 `mutate()` 를 부른다. `MutationObserver` 가 뮤테이션에 붙는다
 *   2. `StrictMode` 가 마운트를 한 번 되감는다 → `useSyncExternalStore` 구독 해제 →
 *      `MutationObserver.onUnsubscribe()` 가 `mutation.removeObserver(this)` 를 부른다
 *   3. 다시 마운트되며 재구독하지만 **`MutationObserver` 에는 `onSubscribe` 가 없어
 *      뮤테이션에 다시 붙지 않는다**(`@tanstack/query-core@5.101.4` `mutationObserver.js`)
 *   4. 응답이 와도 `Mutation.#dispatch` 가 도는 관측자 목록에 우리가 없다. 요청은
 *      `200` 으로 성공하는데 `onSuccess`·`onError` 가 불리지 않아 이동이 일어나지 않는다
 *
 * **로그인 자체는 되어 있었다.** 세션은 `useKakaoLogin` 의 뮤테이션 옵션 `onSuccess`
 * 가 세우는데, 그쪽은 관측자가 아니라 `Mutation.execute()` 가 직접 부르기 때문이다.
 * 끊긴 것은 이 화면이 넘긴 호출별 콜백뿐이라 이동만 빠졌다.
 *
 * 이벤트 핸들러에서 부르는 뮤테이션은 되감기가 끝난 뒤라 멀쩡하다. 마운트 이펙트에서
 * 시작하는 자리만 걸린다. 그래서 결과를 `mutateAsync` 의 프로미스에서 읽는다 — 그
 * 프로미스는 관측자와 무관하게 `Mutation.execute()` 가 그대로 돌려주는 값이라 구독이
 * 끊겨도 정상적으로 풀린다. 결제 복귀 화면(`DepositCompletePage`, 티켓 243)이 같은
 * 함정을 같은 방법으로 고쳤고, 모의 이체 화면(`DepositTransferPage`)은 원래 이
 * 모양이라 처음부터 멀쩡했다.
 */
export function KakaoCallback({ resolveDestination }: KakaoCallbackProps = {}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { mutateAsync } = useKakaoLogin();

  // 초기화 함수로 한 번만 계산한다. 매 렌더 다시 읽으면 교환이 시작되면서 지워진
  // state 때문에 진행 중인 화면이 확인 실패로 뒤집힌다.
  const [preflight] = useState(() => readCallbackPreflight(searchParams));
  const [exchangeFailure, setExchangeFailure] =
    useState<CallbackFailure | null>(null);

  // 인가 코드는 한 번만 쓸 수 있다. StrictMode 의 두 번째 실행이 반드시 실패해
  // 성공한 로그인을 에러 화면으로 덮으므로 의존성 배열로는 막을 수 없다.
  const hasStartedRef = useRef(false);

  /**
   * 교환을 한 번 보내고 결과를 이 화면에서 처리한다.
   *
   * **`async`/`await` 가 아니라 프로미스 콜백으로 쓴다.** 이 함수를 마운트 이펙트가
   * 부르는데, `await` 뒤의 `setState` 는 `react-hooks/set-state-in-effect` 가 이펙트
   * 본문의 동기 `setState` 와 같이 본다. 콜백 안의 `setState` 는 그 규칙이 명시적으로
   * 허용하는 모양이다.
   *
   * 성공 갈래에서 세션이 이미 서 있는 것에 기대도 된다 — `useKakaoLogin` 의 뮤테이션
   * 옵션 `onSuccess` 를 `Mutation.execute()` 가 **프로미스를 풀기 전에** 부르기
   * 때문이다. 이동하는 곳이 `RequireAuth` 뒤라도 로그인 화면으로 튕기지 않는다.
   */
  function runExchange(authorizationCode: string): void {
    void mutateAsync({
      authorizationCode,
      // 인가 때 쓴 값과 같아야 카카오가 토큰으로 바꿔 준다 (apiSpec §2.1).
      redirectUri: KAKAO_REDIRECT_URI,
    })
      .then((data) => {
        // replace 로 이동한다. 기록에 남기면 뒤로가기로 이미 소진된 코드가 붙은
        // URL 로 되돌아와 실패 화면을 본다.
        navigate(
          resolveDestination?.({ isNewUser: data.isNewUser }) ?? ROUTES.home,
          {
            replace: true,
          },
        );
      })
      .catch((caught: unknown) => {
        setExchangeFailure({
          kind: 'exchangeFailed',
          message: isHttpError(caught)
            ? caught.message
            : '로그인을 마치지 못했어요',
        });
      });
  }

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;

    // 대조가 끝났으므로 성공·실패와 무관하게 버린다. 난수는 일회용이다.
    clearOauthState();

    if (preflight.kind !== 'ready') {
      return;
    }

    runExchange(preflight.authorizationCode);
    // runExchange 는 매 렌더 새 참조라 의존성에서 뺀다 — preflight 만 본다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preflight]);

  const failure =
    preflight.kind === 'failed' ? preflight.failure : exchangeFailure;

  if (failure === null) {
    return (
      <Card aria-busy="true">
        <p className="text-sm text-text-secondary">로그인하고 있어요</p>
        <Skeleton className="mt-3 h-4 w-40" />
        <Skeleton className="mt-2 h-4 w-24" />
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-sm text-text-primary">{describeFailure(failure)}</p>
      <LinkButton to={ROUTES.login} replace className="mt-3">
        로그인 화면으로
      </LinkButton>
    </Card>
  );
}
