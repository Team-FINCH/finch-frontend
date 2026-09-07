import { Link } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';

/**
 * 포트폴리오 화면 헤더 (프로토타입 `.nav` — `isPf` 블록).
 * 제목 "포트폴리오" + 알림함 뱃지 버튼(`mailico`). 이 뱃지는 홈·포트폴리오·내 정보
 * 세 화면의 헤더에서만 반복된다(ia.md §1 "알림함").
 *
 * TODO(계약): 미읽음 개수 뱃지 — 알림함 API 계약이 아직 없다(GitLab 이슈 #26 1번,
 * ia.md §1 "알림함"). 목록·미읽음 개수를 알 방법이 생기기 전까지 뱃지 숫자 없이
 * 버튼만 둔다.
 */
export function PortfolioHeader() {
  return (
    <div className="mb-1 flex items-center justify-between">
      <h1 className="text-title-3 text-text-primary">포트폴리오</h1>
      <Link
        to={ROUTES.inbox}
        aria-label="알림함"
        className="flex size-11 items-center justify-center rounded-full text-text-primary transition-colors duration-(--motion-fast) ease-standard active:bg-primary-soft"
      >
        <span
          aria-hidden="true"
          className="size-5.5 bg-current"
          style={{
            WebkitMaskImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M4 6h16v12H4z' fill='none' stroke='black' stroke-width='2'/%3E%3Cpath d='M4 7l8 6 8-6' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
            maskImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M4 6h16v12H4z' fill='none' stroke='black' stroke-width='2'/%3E%3Cpath d='M4 7l8 6 8-6' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
          }}
        />
      </Link>
    </div>
  );
}
