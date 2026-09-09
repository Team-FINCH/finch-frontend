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
 * 아래 여백은 컴포넌트가 갖지 않는다. 화면마다 다음 요소와의 간격이 달라서(홈은
 * 14px, 포트폴리오는 4px) 호출부가 `className` 으로 정한다.
 *
 * **위·좌우 여백과 배경은 컴포넌트가 갖는다.** 프로토타입은 `.nav` 를 `.sc` 밖에
 * `flex:none` 으로 두어 본문만 굴러가게 한다(`TabBarLayout` 주석). 우리는 헤더가
 * `PageMain` 안에 있어서 같은 결과를 `sticky top-0` 로 만든다 — `PageMain` 의
 * 좌우 26px·위 24px 여백을 음수 마진으로 끌어와 헤더 자신이 갖고, 배경을 깔아
 * 본문이 그 아래로 지나가게 한다. 배경이 없으면 글자가 겹쳐 읽힌다.
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
  className?: string;
};

export function PageHeader({
  title,
  unreadCount,
  className = '',
}: PageHeaderProps) {
  return (
    <div
      className={`sticky top-0 z-10 -mx-6.5 -mt-6 flex items-center justify-between gap-3 bg-bg px-6.5 pt-6 ${className}`}
    >
      <h1 className="text-section-title text-text-primary">{title}</h1>
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
