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
 * `TabBar`가 `fixed`로 뜨므로 본문 마지막 요소가 그 밑에 깔린다. 바깥 컨테이너에
 * 탭 바 높이(98px) + `env(safe-area-inset-bottom)` 만큼 하단 여백을 준다 —
 * `TabBar` 자신도 같은 safe-area 만큼 위로 띄우므로(`bottom: env(...)`) 이중으로
 * 차지하지 않는다. `Outlet`을 따로 감싸지 않고 이 div 에 바로 준 이유는 새 래퍼가
 * 하위 화면의 "내가 최상위 flex/grid 컨테이너다" 라는 가정을 깨지 않기 위해서다.
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
    <div className="min-h-dvh pb-[calc(98px+env(safe-area-inset-bottom))]">
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>

      <TabBar />
    </div>
  );
}
