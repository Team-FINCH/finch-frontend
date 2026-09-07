import { Link } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';

/**
 * 홈 상단 네비게이션 바 (ia.md §1 "알림함" — "실제 진입점은 상단 네비게이션 바의
 * 뱃지 버튼[…] 홈·포트폴리오·내 정보 세 화면의 헤더에서만 반복된다").
 *
 * **포트폴리오·내 정보 화면은 이 티켓 범위가 아니다.** 그 두 화면도 같은 뱃지
 * 버튼을 반복해야 하지만(다른 워커 소관), 이 컴포넌트는 홈 전용으로 `features/home`
 * 안에 둔다 — `shared/ui` 는 건드리지 말라는 지시가 있어 지금은 올리지 않는다.
 * 세 화면이 실제로 같은 마크업이 필요해지면 이 컴포넌트를 `shared/ui` 로
 * 옮기는 게 맞다(보고에 남긴다).
 *
 * **미읽음 개수를 이 컴포넌트가 직접 조회하지 않는다.** `features/home` 이
 * `features/inbox` 를 import 하면 컨벤션 §2 "feature 끼리 서로 import 할 수
 * 없다"에 걸린다(ESLint `import-x/no-restricted-paths`). 조합은 페이지 계층의
 * 몫이라 `HomePage.tsx` 가 `useInboxItems` 를 불러 `unreadCount` 를 props 로
 * 내려준다.
 *
 * 시장 지수 마퀴(`.mkroll`, 프로토타입 헤더 안의 코스피·코스닥 롤링 텍스트)는
 * 만들지 않는다 — `ia.md` "필요한 API" 목록에 시장 지수 API 가 없다. 없는 데이터를
 * 보여줄 수 없어 자리 자체를 비운다.
 *
 * 뱃지 색 — **`--notify` 토큰이 아직 `styles/index.css` 에 없다.** `InboxItemRow`
 * 와 같은 이유로 기존 `--color-danger` 를 임시로 쓴다(TODO(계약): 토큰 생기면 교체).
 */
type HomeHeaderProps = {
  unreadCount: number;
};

export function HomeHeader({ unreadCount }: HomeHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 pb-3.5">
      <h1 className="text-title-3 text-text-primary">홈</h1>
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
          <span className="border-1.5 absolute top-0.5 right-0 flex h-3.75 min-w-3.75 items-center justify-center rounded-full border-bg bg-danger px-1 text-[9.5px] font-bold text-surface">
            {unreadCount}
          </span>
        ) : null}
      </Link>
    </div>
  );
}
