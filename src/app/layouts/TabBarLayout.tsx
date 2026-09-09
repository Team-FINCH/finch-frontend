import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

import { TabBar } from '@/shared/ui/TabBar';

import { RouteFallback } from '../RouteFallback';

/**
 * 하단 탭 바를 항상 달고 있는 상시 화면의 레이아웃 (ia.md §3).
 * 들어가는 화면은 홈 · 탐색 · 포트폴리오 · 내 정보 넷이다.
 * (2026-09-03 개정 전에는 4번째가 AI 채팅이었다. ia.md §3 을 본다.)
 *
 * 탭 바(`TabBar`, FINCH-28)를 렌더한다. 목록은 `shared/config/routes.ts`의
 * `BOTTOM_TAB_ROUTES`(ia.md §3 의 4개 그대로) — `TabBar` 내부가 그 배열을 그대로
 * 쓰고 여기서 다시 정의하지 않는다.
 *
 * **이 요소가 프로토타입 `.ph` 자리다.** 높이를 화면에 고정한 세로 flex 컨테이너로
 * 두고 자신은 스크롤하지 않는다(`h-dvh overflow-hidden`). 그래야 본문(`PageMain`)이
 * `flex-1 overflow-y-auto` 로 혼자 굴러가고 탭 바가 스크롤 밖에 남는다 —
 * 프로토타입이 `.nav`·`.tabbar` 를 `flex:none` 으로 두고 `.sc` 만 굴리는 구조다.
 *
 * `--page-bottom-space` 는 본문 아래 여백이다. 프로토타입 `.hastab .sc` 의
 * 132px 을 그대로 내려 준다 — 탭 바(98px)보다 34px 넉넉한 값이라 마지막 행이
 * 유리 면 뒤로 반쯤 잠기지 않는다. `TabBar` 자신은 safe-area 만큼 위로 떠 있고
 * (`bottom: env(...)`) `PageMain` 이 같은 safe-area 를 다시 더하므로 두 값이
 * 겹치지 않는다.
 *
 * **`ScrollRestoration` 은 이 안쪽 스크롤을 되돌리지 못한다.** react-router 의
 * 복원은 창(window) 스크롤만 본다. 목록에서 상세로 갔다 뒤로 왔을 때 보던 자리로
 * 돌아오는 동작이 탭 바 화면 넷에서는 동작하지 않는다 — 안쪽 스크롤 컨테이너의
 * 위치를 따로 기억하는 것은 이 티켓의 범위가 아니라 남긴다.
 *
 * **바텀시트가 열렸을 때 탭 바(와 AI 플로팅 버튼)를 렌더에서 빼는 연결은 아직
 * 하지 않는다.** 그 상태를 어디에 둘지(Zustand·Context·라우트 상태)는 감독관
 * 확인 대기 항목이라 이 커밋에는 포함하지 않았다. `TabBar` 자체는 그 결정과
 * 무관하게 먼저 만들 수 있어 여기서는 항상 렌더한다.
 *
 * Suspense 를 RootLayout 과 별개로 한 번 더 두는 이유 — 탭 바가 들어온 뒤
 * 탭을 옮길 때 바깥 경계가 잡으면 탭 바까지 폴백으로 사라져 화면이 깜빡인다.
 */
export function TabBarLayout() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden [--page-bottom-space:132px]">
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>

      <TabBar />
    </div>
  );
}
