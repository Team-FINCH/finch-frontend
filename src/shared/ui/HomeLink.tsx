import { Link } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';

/**
 * 헤더 오른쪽 끝의 홈 버튼 (FINCH-269).
 *
 * ## 왜 필요한가
 *
 * **하단 탭 바는 탭 화면 넷(홈·탐색·포트폴리오·내 정보)에만 있다.** 나머지 화면
 * — 주문 · 입금 · 출금 · 매매 내역 · 알림함 · 브리핑 · 채팅 · 종목 상세 — 에서
 * 홈으로 가려면 **뒤로가기를 온 만큼 눌러야 했다.** 알림함에서 종목 상세로 들어간
 * 뒤라면 두 번, 브리핑을 거쳤으면 세 번이다.
 *
 * 뒤로가기가 **한 칸**이라면 이것은 **끝까지**다. 둘은 역할이 다르므로 나란히 둔다.
 *
 * ## `button` 이 아니라 `Link` 인 이유
 *
 * 뒤로가기는 "스택을 몇 칸 되돌릴까 · 되돌릴 것이 있나" 를 판정해야 해서
 * `navigate` 를 쓰지만(`SubPageHeader.handleBack`), 이쪽은 판정이 없다 — 언제나
 * 홈 한 곳이다. 링크로 두면 새 탭으로 열거나 주소를 복사하는 것도 된다.
 *
 * ## 아이콘
 *
 * `PageHeader` 의 알림함 아이콘과 같은 방식이다 — SVG 를 마스크로 깔고 색은
 * `background` 로 준다. 그래야 아이콘 색이 글자색 토큰을 그대로 따라가고, 색을
 * 바꿀 때 SVG 안의 `fill` 을 고치러 들어갈 일이 없다.
 *
 * 마스크를 두 번 적는 것은 `-webkit-` 접두 때문이다. 사파리가 아직 접두 없는
 * `mask` 를 단축 속성으로 받지 않는다.
 *
 * **프로토타입에 없는 요소다.** 프로토타입은 화면 스택을 자기가 들고 있어
 * `back()` 하나로 어디서든 홈까지 되감기지만(`app-logic.js`), 우리는 브라우저
 * 히스토리를 쓰므로 그 되감기가 사용자의 손가락 몫이 된다. 그래서 우리가 더했다.
 */
export function HomeLink() {
  return (
    <Link
      to={ROUTES.home}
      aria-label="홈으로"
      className="flex size-11 flex-none items-center justify-center rounded-12 transition-colors duration-(--motion-fast) active:bg-primary-soft"
    >
      <span
        aria-hidden="true"
        className="size-5.5 bg-text-primary"
        style={{ mask: HOME_MASK, WebkitMask: HOME_MASK }}
      />
    </Link>
  );
}

const HOME_MASK =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M3 11.5 12 3.5l9 8M5 10v10.5h5.2v-6h3.6v6H19V10' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>\") center / 21px no-repeat";
