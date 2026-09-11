import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';

/**
 * 하단 탭 네 화면(홈·탐색·포트폴리오·내 정보)이 공유하는 상단 헤더.
 * 제목만 화면마다 다르고 마크업은 하나다.
 *
 * **알림함 뱃지는 그중 셋에만 있다** (ia.md §1 "알림함" — "실제 진입점은 상단
 * 네비게이션 바의 뱃지 버튼[…] 홈·포트폴리오·내 정보 세 화면의 헤더에서만
 * 반복된다"). 프로토타입 탐색의 `.nav` 는 제목뿐이다.
 *
 * 그래서 `unreadCount` 를 **선택 인자**로 두고, 넘기지 않으면 뱃지 버튼 자체를
 * 그리지 않는다. 제목만 있는 얇은 컴포넌트를 따로 두는 쪽도 생각했지만 같은
 * 높이(56px)·같은 좌우 여백(26px)·같은 제목 토큰을 두 곳에서 관리하게 된다 —
 * 세 화면의 헤더가 서로 어긋났던 것을 여기로 합친 것이 이 파일의 출발점이라
 * 다시 가르는 것은 같은 실수다. `unreadCount={0}` 은 뱃지 없는 버튼이고
 * `undefined` 는 버튼 없음이라, 둘을 `undefined` 판정으로 가른다.
 *
 * **원래 세 번 따로 만들어졌던 것을 여기로 올렸다.** `features/home/components/
 * HomeHeader.tsx`(뱃지 카운트까지 연결된 판)와 `features/portfolio/components/
 * PortfolioHeader.tsx`(카운트 없이 버튼만 두던 판, 아이콘 모양도 서로 달랐다)가
 * 각자 미리 남겨 둔 주석대로("세 화면이 실제로 같은 마크업이 필요해지면 이 컴포넌트를
 * shared/ui 로 옮기는 게 맞다") 내 정보 화면이 세 번째로 이 마크업을 필요로 하는 시점에
 * 합쳤다. 아이콘·뱃지는 실제 데이터(미읽음 개수)가 연결돼 있던 `HomeHeader` 쪽을
 * 기준으로 삼았다 — `PortfolioHeader` 는 그 시점에 알림함 API 계약이 없어 카운트를
 * 못 붙였을 뿐, 지금은 `useInboxItems` 가 이미 있다.
 *
 * ## 스크롤 밖에 선다 — `PageMain` 의 형제다
 *
 * **이 헤더는 `PageMain` 안에 넣지 않는다. 바로 앞 형제로 둔다.**
 * 프로토타입이 `.nav` 를 `.sc` 밖에 `flex:none` 으로 두고 본문 `.sc` 만 굴리는
 * 구조 그대로다(`template.html` L1038·L1043 · `TabBarLayout` 주석).
 *
 * ```
 * TabBarLayout   h-dvh flex flex-col overflow-hidden
 *   PageHeader   flex-none  h-56px          <- 굴러가지 않는다
 *   PageMain     flex-1 overflow-y-auto     <- 본문만 굴러간다
 * ```
 *
 * 그래서 좌우 26px·최대 너비·가운데 정렬을 `PageMain` 과 같은 값으로 직접 갖는다
 * (`mx-auto w-full max-w-md px-6.5`). 넓은 화면에서 본문만 가운데로 모이면
 * 헤더가 혼자 왼쪽에 남는다.
 *
 * **배경(`bg-bg`)이 필요 없다.** 본문이 헤더 아래로 지나가지 않고 스크롤
 * 컨테이너의 위 경계에서 잘린다. `z-index` 도 필요 없다 — 겹치는 면이 없다.
 *
 * 전에는 헤더가 `PageMain` 안에 있고 `sticky top-0 -mx-6.5 -mt-6 bg-bg` 로 같은
 * 결과를 흉내 냈다. **그 조합이 어긋나서 이 구조로 되돌렸다**(FINCH-231) —
 * `sticky` 의 `top` 은 마진 박스 기준이라 `-mt-6`(−24px)이 있으면 테두리 박스가
 * −24px 에 서고, 헤더 위 24px 이 화면 밖으로 나간 채 그 아래 sticky 줄(포트폴리오
 * 4탭)은 `top:56px` 에 그대로 서서 둘 사이 24px 이 벌어졌다. 그 틈으로 본문이
 * 지나갔다. `sticky` 와 음수 마진을 같은 요소에 함께 쓰지 않는다.
 *
 * 아래 여백은 컴포넌트가 갖지 않는다. 화면마다 다음 요소와의 간격이 달라서
 * 호출부가 정하는데, **그 간격은 `PageMain` 의 `pt-*` 로 준다.** 헤더의
 * `margin-bottom` 이 아니다 — 프로토타입도 그 14px 을 `.sc` 안의 첫 요소로 두어
 * (`template.html` L1365 `<div style="height:14px">`) 본문과 함께 굴러가게 한다.
 * 헤더 밖에 두면 그 띠만 늘 비어 있다. 홈·마이페이지는 `pt-3.5`(14px), 포트폴리오는
 * 4탭 줄이 헤더에 바로 붙어야 해서 `pt-0` 이다.
 *
 * ## 높이
 *
 * 높이는 `--page-header-height`(56px, 프로토타입 `.nav` 실측)로 고정한다.
 * 전에는 `pt-6` + 40px 아이콘으로 우연히 정해졌고, 거기에 호출부가 준
 * `pb-3.5` 가 더해져 홈·마이페이지 78px, 포트폴리오 64px 로 화면마다 달랐다.
 * 세 화면의 헤더가 서로 다른 높이인 것 자체가 프로토타입과 어긋난다.
 *
 * 값을 고정하면서 `pt-6` 을 뺐다 — 56px 안에 24px 짜리 위 여백을 넣으면 40px
 * 아이콘이 들어가지 않는다. 프로토타입도 `.nav` 는 56px 안에 44px 아이콘을
 * 세로 가운데 두고 위아래 6px 만 남기는 구조다.
 *
 * **토큰으로 두는 이유는 `SubPageHeader` 가 같은 높이를 쓰기 때문이다.** 한때는
 * 헤더 밖에서 읽을 값이기도 했다 — 헤더가 스크롤 안에 있던 시절 포트폴리오 4탭
 * 줄이 `top: var(--page-header-height)` 로 그 아래에 섰다. 지금은 그 줄이
 * `top-0` 이라 밖에서 높이를 읽는 곳이 없다. **그래도 아래 여백을 `padding` 으로
 * 주면 안 된다** — 그만큼 헤더 높이가 늘어 세 화면이 다시 어긋난다.
 *
 * 미읽음 개수는 이 컴포넌트가 직접 조회하지 않는다 — `features/mypage` 가
 * `features/inbox` 를 부르는 것은 페이지 계층에서 하고, 여기는 숫자만 받는다
 * (컨벤션 §2, feature 끼리 서로 import 할 수 없다).
 *
 * 제목은 `text-section-title`(18px/700/-.01em, 프로토타입 `.navt`)이다. 1회차에
 * 이 자리에서만 `text-title-3 font-bold tracking-[-0.01em]` 로 굵기를 올려 뒀던 것을
 * 토큰으로 걷어냈다 — 같은 위계가 화면·섹션 제목 여러 곳에 반복되기 때문이다.
 *
 * 뱃지 색은 `--color-notify`(design.md §4·§7.11 "미확인 알림은 --notify 의 작은
 * Dot/Badge 만 사용") 다. `InboxItemRow` 의 미확인 점과 같은 토큰이다.
 */
type PageHeaderProps = {
  title: string;
  /**
   * 알림함 뱃지에 표시할 미읽음 개수. **넘기지 않으면 뱃지 버튼을 그리지 않는다**
   * — 탐색 화면이 그렇다(위 주석). `0` 은 "버튼은 있고 뱃지만 없다" 로 다르다.
   */
  unreadCount?: number;
  /**
   * 제목 오른쪽 같은 줄에 붙는 보조 정보. 지금 쓰는 곳은 홈의 시장 지수
   * 롤링(`features/home/components/MarketIndexRoller`) 하나다.
   *
   * 프로토타입은 `.navt` 안에 제목과 `.mkroll` 을 `display:flex;
   * align-items:baseline;gap:10px` 로 나란히 둔다. 우리는 그 배치를 그대로
   * 옮기되 **`<h1>` 안에 넣지 않는다** — 제목 요소 안에 두면 낭독기가 화면
   * 이름을 "홈 코스피 2,600.54 …" 로 읽는다. 제목과 형제로 둔다.
   */
  titleSuffix?: ReactNode;
  /**
   * 남겨 둔 여유 구멍이다. 아래 여백은 여기 주지 않는다 — 위 "스크롤 밖에 선다"
   * 절에 적은 대로 `PageMain` 의 `pt-*` 가 그 자리다.
   */
  className?: string;
};

export function PageHeader({
  title,
  unreadCount,
  titleSuffix,
  className = '',
}: PageHeaderProps) {
  return (
    <div
      className={`mx-auto flex h-(--page-header-height) w-full max-w-md flex-none items-center justify-between gap-3 px-6.5 ${className}`}
    >
      <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
        <h1 className="flex-none text-section-title text-text-primary">
          {title}
        </h1>
        {titleSuffix}
      </div>
      {unreadCount === undefined ? null : (
        <Link
          to={ROUTES.inbox}
          aria-label={
            unreadCount > 0 ? `알림함, 안 읽은 알림 ${unreadCount}건` : '알림함'
          }
          className="relative flex size-10 flex-none items-center justify-center"
        >
          <span
            aria-hidden="true"
            className="size-6.75 bg-text-primary"
            style={{
              mask: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M2.5 8.1 12 14.2l9.5-6.1V17a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 17z'/><path d='M21.2 6.2 12 12.1 2.8 6.2A2.5 2.5 0 0 1 5 4.5h14a2.5 2.5 0 0 1 2.2 1.7z'/></svg>\") center / 27px no-repeat",
              WebkitMask:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M2.5 8.1 12 14.2l9.5-6.1V17a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 17z'/><path d='M21.2 6.2 12 12.1 2.8 6.2A2.5 2.5 0 0 1 5 4.5h14a2.5 2.5 0 0 1 2.2 1.7z'/></svg>\") center / 27px no-repeat",
            }}
          />
          {unreadCount > 0 ? (
            <span className="border-1.5 absolute top-0.5 right-0 flex h-3.75 min-w-3.75 items-center justify-center rounded-full border-bg bg-notify px-1 text-[9.5px] font-bold text-surface">
              {unreadCount}
            </span>
          ) : null}
        </Link>
      )}
    </div>
  );
}
