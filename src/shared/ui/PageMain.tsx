import { type ComponentProps } from 'react';

/**
 * 페이지 골격. 모바일 우선으로 만들고 넓은 화면은 중앙 정렬 + 최대 너비 제한으로만
 * 대응한다 (컨벤션 §9).
 *
 * 좌우 여백 26px 은 프로토타입 `.sc`·`.tabs` 의 화면 여백이다 (px-6.5 = 26px).
 * design.md §5 는 20px 이라고 적었지만 프로토타입이 1차 근거다.
 * Tailwind v4 는 간격 스케일에 소수 배수를 허용해 6.5 = 26px 로 나온다.
 *
 * ## 스크롤 경계
 *
 * 프로토타입은 화면을 세로 flex 로 쌓고 `.nav`·`.tabbar` 를 `flex:none` 으로 고정한
 * 뒤 **본문 `.sc` 만 `overflow-y:auto`** 로 굴린다. 우리는 문서 전체가 함께
 * 굴러서, 하단 탭 바가 있는 화면에서 유리 탭 바 아래로 본문이 지나가지 않고
 * 화면 전체가 밀렸다.
 *
 * 그래서 이 요소가 `.sc` 자리를 맡는다 — `flex-1 min-h-0 overflow-y-auto`.
 * **바깥이 높이가 고정된 세로 flex 컨테이너일 때만 실제로 스크롤 컨테이너가 된다**
 * (`app/layouts/TabBarLayout.tsx`). 그런 껍데기가 없는 화면(입금·주문·브리핑 등
 * `RootLayout` 바로 아래)에서는 높이가 내용만큼 늘어나므로 `overflow-y:auto` 가
 * 아무것도 자르지 않고 지금처럼 문서가 굴러간다. 그래서 화면마다 다른 골격을
 * 쓰지 않고 이 한 컴포넌트로 둘 다 감당한다.
 *
 * ## 하단 여백
 *
 * 프로토타입은 `.sc` 의 아래 여백을 화면 종류로 가른다 —
 * 기본 28px · 탭 바가 있으면 `.hastab .sc{padding-bottom:132px}` ·
 * 플로팅 버튼이 있으면 `.hasfab .sc{padding-bottom:96px}`.
 *
 * 값을 컴포넌트가 알 수 없어서(같은 `PageMain` 이 세 경우에 다 쓰인다) 껍데기가
 * `--page-bottom-space` 로 내려 준다. 기본값은 1.5rem(24px)이고 `TabBarLayout` 이
 * 132px 로 덮는다. 호출부가 `className` 으로 `pb-*` 를 덮어쓰던 방식은 그대로
 * 살아 있다 — 주문·입금처럼 하단 고정 바를 가진 화면이 그렇게 쓰고 있다.
 *
 * safe-area 를 더하는 이유 — 홈 인디케이터가 있는 기기에서 마지막 요소가 그 밑에
 * 깔린다. 페이지마다 손으로 적으면 빠뜨린 화면에서만 조용히 어긋난다.
 */
export function PageMain({ className = '', ...props }: ComponentProps<'main'>) {
  return (
    <main
      {...props}
      className={`mx-auto min-h-0 w-full max-w-md flex-1 overflow-y-auto overscroll-contain px-6.5 pt-6 pb-[calc(var(--page-bottom-space,1.5rem)+env(safe-area-inset-bottom))] ${className}`}
    />
  );
}
