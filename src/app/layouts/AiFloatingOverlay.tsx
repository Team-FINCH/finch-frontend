import { matchPath, useLocation } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';
import { useIsAnySheetOpen } from '@/shared/hooks/useSheetOverlayStore';
import { AiEntryButton } from '@/shared/ui/AiEntryButton';

/**
 * **AI 플로팅 버튼(`.fab`)이 보일 화면을 판정하는 자리.** 판정은 이 파일 한
 * 곳에만 있다.
 *
 * ## 프로토타입 재실측으로 좁혔다 (FINCH-28-ai-entry, 2026-09-07)
 *
 * 전에는 여기 종목 상세·포트폴리오·브리핑 세 화면을 넣어 뒀었다(PRD v1.0 문구를
 * 그대로 옮긴 값, ia.md §1·§2). **직접 프로토타입(`finch-prototype.html`)의
 * 상태 계산을 다시 읽은 결과 그 값이 틀렸다:**
 *
 * ```
 * showTabs: !s.sheet && ["home","search","portfolio","mypage","detail"].includes(s.screen)
 * showFab:  !s.sheet && ["briefing"].includes(s.screen)
 * ```
 *
 * `.fab`(플로팅)는 **브리핑 하나뿐**이다. 종목 상세·포트폴리오는 `showTabs`
 * 목록에 있어서 `.tabai`(탭 바 줄의 AI 버튼, `shared/ui/TabBar.tsx`)로 이미
 * 버튼이 뜬다 — 종목 상세는 `TradeTabBar`, 포트폴리오는 `TabBar`(`TabBarLayout`
 * 아래)를 통해서다. 옛 배열대로 두면 그 두 화면에 버튼이 **둘** 뜬다.
 *
 * **확인한 근거** — `pages/StockDetailPage.tsx`가 `TradeTabBar`를 페이지 안에서
 * 직접 렌더한다(레이아웃이 아니라 페이지가 그린다, 그 파일 머리 주석 참고).
 * `pages/PortfolioPage.tsx`는 `app/router.tsx`에서 `TabBarLayout`의 자식이라
 * `TabBar`를 물려받는다. 두 화면 다 `.tabai`를 이미 갖고 있다는 뜻이라 여기서는
 * 뺀다.
 *
 * 뉴스 상세는 대응하는 화면 자체가 없어서 전부터 빠져 있었고 지금도 넣지 않는다.
 * 종목 코드 맥락 전달 범위(`context.screen` 등)는 여전히 GitLab 이슈 #26 4번
 * 회신 대기다 — `AiEntryButton`이 지금 `/chat`으로만 이동하고 쿼리를 만들지
 * 않는 이유이기도 하다.
 */
const AI_FLOATING_PATTERNS: readonly string[] = [ROUTES.briefing];

/** 브리핑 화면 진입 시 라벨이 펼쳐진다(프로토타입 `fabLabel`). */
const AI_FLOATING_EXPANDED_LABEL = '브리핑 물어보기';

/**
 * 지금은 `AI_FLOATING_PATTERNS`에 파라미터 있는 패턴(`/stocks/:stockCode` 같은)이
 * 없다 — 브리핑 하나뿐인 정적 경로다. 그래도 `matchPath`로 판정하는 이유는
 * 나중에 이 배열이 다시 늘어나도(예: 종목 상세가 도로 들어오는 회신이 오면)
 * 이 함수를 고칠 필요가 없게 하기 위해서다.
 */
function showsAiFloatingButton(pathname: string) {
  return AI_FLOATING_PATTERNS.some(
    (pattern) => matchPath(pattern, pathname) !== null,
  );
}

/**
 * 전역 오버레이 레이어. **`RootLayout` 이 `Outlet` 위에 항상 렌더한다.**
 *
 * 지금은 `showsAiFloatingButton`이 브리핑(탭 없는 화면) 하나만 참이라 실제로는
 * `TabBarLayout` 안에 둬도 동작할 자리지만, 배열이 다시 늘어 하단 탭이 있는
 * 화면이 들어와도 이 레이어를 옮기지 않아도 되도록 라우트 트리 최상단에 둔다.
 * `TabBarLayout` 안에 두면 그 레이아웃 밖 화면(브리핑 포함)에서 사라진다.
 *
 * **바텀시트가 하나라도 열려 있으면 이 레이어도 렌더에서 빠진다**
 * (`useIsAnySheetOpen`, FINCH-28) — 프로토타입의 `showFab: !s.sheet`와 같다.
 * `TabBar`(`shared/ui/TabBar.tsx`)도 같은 스토어를 보고 같은 규칙으로 빠진다.
 * `opacity:0`이 아니라 `null`을 반환한다 — 시트 위에 눌리지 않는 빈 자리조차
 * 남기지 않는다.
 *
 * **버튼은 `AiEntryButton`(`shared/ui/AiEntryButton.tsx`) 하나다.** `TabBar.tsx`의
 * `.tabai` 자리와 컴포넌트를 공유하고 여기서는 `.fab` 위치만 만든다 — 프로토타입
 * `.fab{position:absolute;right:16px;bottom:16px}`을 이 컨테이너의 우측·하단
 * 여백으로 옮겼다(버튼 자신은 크기·색만 갖고 위치는 갖지 않는다, 탭 바 줄
 * 안에서도 같은 컴포넌트를 써야 해서다). 브리핑은 탭 바가 없는 화면이라
 * safe-area 만 더하면 된다 — 탭 바가 있는 화면(포트폴리오)은 애초에 `.fab`가
 * 아니라 `.tabai`로 뜨므로(`AI_FLOATING_PATTERNS` 주석 참고) 이 오버레이가
 * 탭 바 높이를 신경 쓸 화면이 지금은 없다.
 *
 * 컨테이너가 `pointer-events-none`이라 빈 자리가 본문 터치를 막지 않는다 —
 * `AiEntryButton`은 일반 `<button>`이라 자기 영역에서만 클릭을 받는다.
 */
export function AiFloatingOverlay() {
  const location = useLocation();
  const isAnySheetOpen = useIsAnySheetOpen();

  if (!showsAiFloatingButton(location.pathname) || isAnySheetOpen) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-md justify-end pr-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      data-testid="ai-floating-slot"
    >
      <AiEntryButton expandedLabel={AI_FLOATING_EXPANDED_LABEL} />
    </div>
  );
}
