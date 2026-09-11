import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';

/**
 * 홈·포트폴리오·내 정보 세 화면이 공유하는 상단 헤더 (ia.md §1 "알림함" —
 * "실제 진입점은 상단 네비게이션 바의 뱃지 버튼[…] 홈·포트폴리오·내 정보 세 화면의
 * 헤더에서만 반복된다"). 제목만 화면마다 다르고 마크업은 하나다.
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
 * 아래 여백은 컴포넌트가 갖지 않는다. 화면마다 다음 요소와의 간격이 달라서(홈·
 * 마이페이지는 14px, 포트폴리오는 4px) 호출부가 `className` 으로 정한다.
 * **호출부는 그 간격을 `margin` 으로 준다. `padding` 으로 주면 안 된다** — 아래
 * "높이" 절에 적은 대로 이 요소의 높이가 곧 다른 화면의 sticky 기준점이라,
 * padding 은 그 기준점을 화면마다 다르게 밀어 버린다.
 *
 * **위·좌우 여백과 배경은 컴포넌트가 갖는다.** 프로토타입은 `.nav` 를 `.sc` 밖에
 * `flex:none` 으로 두어 본문만 굴러가게 한다(`TabBarLayout` 주석). 우리는 헤더가
 * `PageMain` 안에 있어서 같은 결과를 `sticky top-0` 로 만든다 — `PageMain` 의
 * 좌우 26px·위 24px 여백을 음수 마진으로 끌어와 헤더 자신이 갖고, 배경을 깔아
 * 본문이 그 아래로 지나가게 한다. 배경이 없으면 글자가 겹쳐 읽힌다.
 *
 * ## 높이
 *
 * 높이는 `--page-header-height`(56px, 프로토타입 `.nav` 실측)로 고정한다.
 * 전에는 `pt-6` + 40px 아이콘으로 우연히 정해졌고, 거기에 호출부가 준
 * `pb-3.5` 가 더해져 홈·마이페이지 78px, 포트폴리오 64px 로 화면마다 달랐다.
 * 그래서 헤더 아래에 sticky 로 붙어야 하는 줄(포트폴리오 4탭)이 `top` 에 적을
 * 값을 갖지 못했다. 이제 세 화면 모두 56px 이고 아래처럼 쓸 수 있다.
 *
 * ```
 * top: var(--page-header-height)
 * ```
 *
 * 값을 고정하면서 `pt-6` 을 뺐다 — 56px 안에 24px 짜리 위 여백을 넣으면 40px
 * 아이콘이 들어가지 않는다. 프로토타입도 `.nav` 는 56px 안에 44px 아이콘을
 * 세로 가운데 두고 위아래 6px 만 남기는 구조다. `-mt-6` 는 그대로 둔다 —
 * `PageMain` 의 위 여백 24px 을 헤더가 삼켜 스크롤 컨테이너 맨 위(0)부터
 * 56px 까지를 헤더가 차지하게 하는 것이 `top` 계산의 전제다.
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
  unreadCount: number;
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
      className={`sticky top-0 z-10 -mx-6.5 -mt-6 flex h-(--page-header-height) items-center justify-between gap-3 bg-bg px-6.5 ${className}`}
    >
      <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
        <h1 className="flex-none text-section-title text-text-primary">
          {title}
        </h1>
        {titleSuffix}
      </div>
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
    </div>
  );
}
