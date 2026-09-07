import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { BOTTOM_TAB_ROUTES, ROUTES } from '@/shared/config/routes';
import { useIsAnySheetOpen } from '@/shared/hooks/useSheetOverlayStore';

/**
 * 하단 탭 바 (ia.md §3 · FINCH-28).
 *
 * 근거는 프로토타입 `prototype/screen/finch-prototype.html`(c78163c 시점)의
 * `.tabbar` · `.tabpill` · `.tabpill.trade` 클래스다. 실측값 —
 * `.tabbar` 높이 98px · `.tabpill` 높이 58px 캡슐(안쪽 버튼 48px) ·
 * 선택된 탭 `flex:2.2`, 나머지 `flex:1`.
 *
 * **`.tabai`(AI 버튼, 58x58 · 배경 `--t1`)는 의도적으로 만들지 않는다. 확정된
 * 결정이다(감독관 확인, 2026-09-07).** 프로토타입은 `.tabbar` 안에
 * `.tabpill`(또는 `.tabpill.trade`)과 `.tabai`를 나란히 그리지만 —
 * - AI 진입점은 탭 바 안이 아니라 플로팅 버튼(`AiFloatingOverlay.tsx`)이다.
 *   근거는 `ia.md` §3("PRD 는 AI 를 탭에서 빼고 플로팅 버튼으로 옮겼다")
 * - **다만 `ia.md:295`(AI 플로팅 버튼 절)가 이 항목을 아직 미확정으로 적어
 *   둔다.** 프로토타입은 지금도 탭바 안 `.tabai`로 그리고 플로팅 버튼(`.fab`)은
 *   브리핑 화면에만 두어서, 문서(PRD·§1·§2)와 프로토타입 실제 구현이 다르다고
 *   기록돼 있다 — 어느 쪽을 따를지는 GitLab 이슈 #26 4번 회신 대기다
 *
 * 다음에 프로토타입만 보고 "AI 버튼이 빠졌다"며 조용히 넣지 않도록 이 코멘트를
 * 남긴다. 플로팅 버튼 UI 자체는 별도 티켓 범위라 이 파일이 그리지 않는다.
 *
 * 탭 목록은 새로 정의하지 않는다. `BOTTOM_TAB_ROUTES`(홈·탐색·포트폴리오·내 정보)
 * 를 그대로 쓴다. 아이콘은 그 배열에 없는 값이라 이 파일이 프로토타입 `.n1`~`.n4`
 * 실측 SVG 로 로컬 정의한다 — 잘못 짚으면 팀에 확인이 필요하다고 보고에 적었다.
 */

/** 프로토타입 `.n1`~`.n4::before`의 mask-image SVG 를 그대로 옮긴 값. */
const TAB_ICON_SVG: Record<string, string> = {
  [ROUTES.home]:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 11 12 4l8 7v9h-5.5v-6h-5v6H4z"/></svg>',
  [ROUTES.search]:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.4" fill="none" stroke="black" stroke-width="2"/><path d="M15.8 15.8 20 20" stroke="black" stroke-width="2.2" stroke-linecap="round"/></svg>',
  [ROUTES.portfolio]:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="4" y="12" width="4" height="8" rx="1"/><rect x="10" y="6" width="4" height="14" rx="1"/><rect x="16" y="9" width="4" height="11" rx="1"/></svg>',
  [ROUTES.my]:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.7"/><path d="M4.6 20a7.4 7.4 0 0 1 14.8 0z"/></svg>',
};

/**
 * mask-image 는 색·패딩이 얽혀 있는 arbitrary 클래스 문자열로 적으면 읽기 어렵고
 * URL 인코딩이 클래스 이름 문법과 부딪힌다. 아이콘 한정으로 style 속성을 쓴다.
 * 색 자체는 `background-color: currentColor` 라 버튼 글자색을 그대로 따라간다.
 */
function tabIconMaskStyle(path: string) {
  const svg = TAB_ICON_SVG[path];
  if (svg === undefined) {
    return undefined;
  }
  const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  return { WebkitMaskImage: url, maskImage: url };
}

/**
 * `.tabbar` 셸. 고정 높이 98px + 반투명 그라디언트 + 블러(프로토타입 `.tabbar::before`).
 * 나브 변형(`TabBar`)과 매수/매도 변형(`TradeTabBar`)이 이 셸을 공유한다 —
 * 프로토타입에서 두 화면이 같은 `.tabbar` 컨테이너에 내용만 다르게 넣는 구조다
 * (`ActionBar.tsx`의 "종목 상세는 하단 탭바가 그대로 매수/매도 바로 바뀐다" 참고).
 *
 * safe-area 처리 — 프로토타입은 고정 크기 기기 프레임이라 `env()`를 안 쓴다.
 * 실 기기에서 캡슐이 홈 인디케이터 밑에 깔리지 않도록 `bottom`에 safe-area 만큼
 * 더 띄운다. `TabBarLayout`이 본문에 두는 여백(`98px + safe-area`)과 같은 셈이라
 * 이중으로 차지하지 않는다.
 *
 * **바텀시트가 하나라도 열려 있으면 렌더 자체에서 빠진다** — 프로토타입의
 * `showTabs: !s.sheet`와 같다. `opacity:0`/`visibility:hidden`이 아니라 `null`을
 * 반환한다. 두 변형(`TabBar`·`TradeTabBar`)이 이 셸을 통해 같이 적용받는다.
 */
function TabBarShell({ children }: { children: ReactNode }) {
  const isAnySheetOpen = useIsAnySheetOpen();
  if (isAnySheetOpen) {
    return null;
  }

  return (
    // 가로 폭을 PageMain·ActionBar 와 같은 max-w-md 로 맞춘다. 이유는 ActionBar 주석에 있다 —
    // 넓은 화면에서 본문은 가운데 정렬인데 바만 화면 끝까지 가면 둘이 어긋나 보인다.
    <nav
      className="fixed inset-x-0 bottom-[env(safe-area-inset-bottom)] z-30 mx-auto flex h-[98px] w-full max-w-md items-end gap-2.5 px-4 pb-4"
      aria-label="주요 화면 전환"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/70 to-bg/0 [mask-image:linear-gradient(to_top,#000_58%,transparent)] [backdrop-filter:blur(14px)] [-webkit-backdrop-filter:blur(14px)] [-webkit-mask-image:linear-gradient(to_top,#000_58%,transparent)]"
      />
      {children}
    </nav>
  );
}

/** 캡슐 컨테이너 클래스. 나브 pill 과 trade pill 이 공유한다(`.tabpill` 공통부). */
const PILL_BASE_CLASS =
  'relative z-[1] flex h-[58px] flex-1 items-center rounded-full border border-text-primary/7 ' +
  'bg-surface/72 p-[5px] shadow-[0_8px_24px_rgba(31,35,40,0.1)] ' +
  '[-webkit-backdrop-filter:blur(18px)_saturate(1.6)] [backdrop-filter:blur(18px)_saturate(1.6)]';

function navButtonClass(isActive: boolean) {
  return [
    'flex h-12 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full text-label',
    'transition-[flex,background-color,color] duration-(--motion-normal) ease-standard',
    isActive
      ? 'flex-[2.2] bg-primary-soft text-text-primary'
      : 'flex-1 text-text-muted',
  ].join(' ');
}

function navLabelClass(isActive: boolean) {
  return [
    'overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-(--motion-normal) ease-standard',
    isActive ? 'max-w-20 opacity-100' : 'max-w-0 opacity-0',
  ].join(' ');
}

/** 상시 화면(홈·탐색·포트폴리오·내 정보)의 하단 탭 바. `TabBarLayout`이 쓴다. */
export function TabBar() {
  return (
    <TabBarShell>
      <div className={`${PILL_BASE_CLASS} gap-1`}>
        {BOTTOM_TAB_ROUTES.map((tab) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end
            className={({ isActive }) => navButtonClass(isActive)}
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden
                  className="h-6 w-6 flex-none bg-current [mask-size:24px] [mask-position:center] [mask-repeat:no-repeat] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:24px]"
                  style={tabIconMaskStyle(tab.path)}
                />
                <span className={navLabelClass(isActive)}>{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </TabBarShell>
  );
}

type TradeTabBarProps = {
  onBuy: () => void;
  onSell: () => void;
};

/**
 * 종목 상세용 매수/매도 변형(`.tabpill.trade`). 나브 탭 바 대신 이 자리에 들어간다
 * — 두 화면이 동시에 뜨지 않는다(`ActionBar.tsx` 참고).
 *
 * **함정 확인 결과** — 프로토타입 `.tbuy`/`.tsell`은 글자색만 신 팔레트
 * (`var(--up)`/`var(--down)`)를 쓰고 테두리색은 낡은 등락색의 알파값
 * (`rgba(226,85,85,.4)` · `rgba(59,130,246,.35)`, 구 `#E25555`/`#3B82F6`)에
 * 그대로 남아 있다. 여기서는 테두리도 신 팔레트로 맞춘다 —
 * `border-stock-up/40` · `border-stock-down/35`
 * (`--color-stock-up:#C93B3B` · `--color-stock-down:#2258C9`, design.md §4).
 * 같은 이유로 `:active` 배경 틴트(`rgba(226,85,85,.08)`/`rgba(59,130,246,.08)`)도
 * 낡은 팔레트라 `bg-stock-up/8` · `bg-stock-down/8`로 함께 옮겼다 — 프로토타입이
 * 테두리만 지적한 것과 별개로 같은 잔재라고 판단했다.
 *
 * `.tstop`(거래정지·주문 불가) 변형은 만들지 않는다. 티켓이 요청한 것은
 * 매수/매도 둘뿐이다.
 */
export function TradeTabBar({ onBuy, onSell }: TradeTabBarProps) {
  return (
    <TabBarShell>
      <div className={`${PILL_BASE_CLASS} gap-1.5`}>
        <button
          type="button"
          onClick={onBuy}
          className="h-12 flex-1 rounded-full border border-stock-up/40 text-[16px] font-bold text-stock-up transition-colors duration-(--motion-fast) ease-standard active:bg-stock-up/8"
        >
          매수
        </button>
        <button
          type="button"
          onClick={onSell}
          className="h-12 flex-1 rounded-full border border-stock-down/35 text-[16px] font-bold text-stock-down transition-colors duration-(--motion-fast) ease-standard active:bg-stock-down/8"
        >
          매도
        </button>
      </div>
    </TabBarShell>
  );
}
