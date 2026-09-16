import { Suspense, useEffect } from 'react';
import {
  Navigate,
  Outlet,
  ScrollRestoration,
  useLocation,
} from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';
import { ToastViewport } from '@/shared/ui/Toast';

import { needsBootLanding } from '../bootLanding';
import { RouteFallback } from '../RouteFallback';

import { AiFloatingOverlay } from './AiFloatingOverlay';

/**
 * 이 문서에서 재진입 착지를 이미 처리했는지 (FINCH-295).
 *
 * **모듈 스코프에 둔다.** "문서 하나에 한 번" 이 정확히 이 모듈의 수명이다.
 * 컴포넌트 상태에 두면 StrictMode 의 이중 마운트에서 초기화되고, ref 에 두면
 * 렌더 중에 값을 바꾸게 되어 렌더가 순수하지 않게 된다.
 */
let hasHandledBootLanding = false;

/**
 * 모든 라우트의 바깥 레이아웃. 화면을 그리지 않고 두 가지만 한다.
 *
 * 1. **스크롤 복원.** `ScrollRestoration` 은 react-router 가 이미 주는 것이라
 *    라이브러리를 더하지 않는다. 이동할 때 맨 위로 올리고, 뒤로가기(POP)에서는
 *    직전 위치를 되돌린다. 목록에서 상세로 갔다 돌아왔을 때 보던 자리로 돌아오는
 *    동작이 여기서 나온다. **앱 전체에 하나만 둔다** — 여러 개 두면 서로 덮어쓴다.
 * 2. **lazy 청크의 Suspense 경계.** 여기 두면 어느 화면을 lazy 로 바꾸든
 *    각 화면이 자기 경계를 따로 만들지 않아도 된다.
 * 3. **전역 오버레이 레이어.** AI 플로팅 버튼이 들어갈 자리다 (ia.md §3).
 *    하단 탭이 있는 화면과 없는 화면 양쪽에 떠야 해서 `TabBarLayout` 안이 아니라
 *    여기 둔다. 어느 화면에서 보일지는 `AiFloatingOverlay` 가 혼자 판정한다 —
 *    배치가 아직 미확정이므로(ia.md §7) 고칠 자리를 한 곳으로 모아 둔 것이다.
 * 4. **토스트 레이어** (FINCH-232). **앱 전체에 하나만 둔다.**
 *    화면마다 두면 문구가 겹쳐 뜨고, 화면을 옮기며 띄운 토스트(출금 완료처럼
 *    `navigate` 와 함께 뜨는 것)가 전환 도중 사라진다. `Outlet` 바깥이라
 *    라우트가 바뀌어도 이 요소는 언마운트되지 않는다.
 * 5. **모바일 폭 기둥** (FINCH-269). 아래 주석을 본다.
 * 6. **재진입 착지** (FINCH-295). 아래 주석을 본다.
 */
export function RootLayout() {
  const { pathname } = useLocation();

  /*
   * 문서를 새로 받은 첫 렌더에서만 판정한다. 판정이 서는 순간 `<Navigate>` 를
   * 대신 그리므로 **원래 주소의 화면은 마운트되지 않는다** — 뜬 뒤에 쫓아내면
   * 그 화면의 쿼리가 한 번 나갔다 버려진다.
   *
   * 표식은 렌더가 아니라 이펙트에서 세운다. 렌더 중에 세우면 StrictMode 의 이중
   * 렌더에서 두 번째 호출이 이미 처리된 것으로 보고 착지를 건너뛴다.
   */
  const shouldLandOnHome = !hasHandledBootLanding && needsBootLanding(pathname);

  useEffect(() => {
    hasHandledBootLanding = true;
  }, []);

  if (shouldLandOnHome) {
    return <Navigate to={ROUTES.home} replace />;
  }

  return (
    <>
      <ScrollRestoration />
      {/*
        데스크톱에서 앱이 어디까지인지 보이게 하는 기둥이다 (FINCH-269).
        전에는 `body` 도 앱도 --color-bg 라 넓은 화면에서 경계가 없었다.

        **여기 하나로 끝난다.** 모든 라우트가 이 아래라 화면마다 손댈 필요가 없다.
        화면들이 이미 각자 `max-w-md mx-auto` 를 쓰고 있어 폭이 겹쳐도 무해하다 —
        안쪽이 이미 최대라 더 좁아지지 않는다.

        **`min-h-dvh` 다.** `h-dvh` 로 못 박으면 창이 굴러가는 화면(입금·주문·브리핑)
        에서 내용이 기둥 밖으로 넘쳐 그 아래가 바깥 색으로 남는다. `TabBarLayout` 의
        `h-dvh overflow-hidden` 은 이 안에서 그대로 돈다.

        **전역 오버레이 셋은 이 밖이다.** `AiFloatingOverlay`·`ToastViewport` 와
        Radix 포털을 타는 시트·모달은 `fixed` 라 조상이 아니라 뷰포트를 기준으로
        놓인다. 안에 넣어도 자리가 같고, 밖에 두는 편이 "기둥은 본문만 감싼다" 가
        분명하다. 셋 다 이미 같은 `max-w-md` 가운데 정렬이라 기둥 폭에 정확히 든다.

        **그림자에 미디어 쿼리가 없다.** 모바일에서는 기둥이 화면 폭과 같아져
        가장자리가 화면 밖으로 떨어진다 — 저절로 안 보인다 (컨벤션 §8 이 커스텀
        브레이크포인트를 금지하므로 이 성질에 기댄다).
      */}
      <div className="mx-auto min-h-dvh w-full max-w-md bg-bg shadow-page-column">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </div>
      <AiFloatingOverlay />
      <ToastViewport />
    </>
  );
}
