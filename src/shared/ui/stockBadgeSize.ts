/**
 * 종목 자리의 치수. `StockLogo` 와 `StockInitialBadge` 가 같이 쓴다.
 *
 * **두 컴포넌트가 같은 자리를 번갈아 쓴다.** 로고가 있는 종목이면 로고가, 없으면
 * 이니셜 뱃지가 그 자리에 선다. 크기가 어긋나면 폴백되는 행만 목록에서
 * 들쭉날쭉해지므로 값은 한 곳에 있어야 한다.
 *
 * 컴포넌트 파일이 아니라 여기 있는 이유는 린트 규약이다 —
 * `react-refresh/only-export-components` 가 컴포넌트 파일에서 상수를 내보내지
 * 못하게 한다(HMR 이 깨진다).
 *
 * 치수 두 벌은 프로토타입 실측이다.
 *
 * - `md` — 목록 행의 44x44 (`.th`). 홈 · 포트폴리오 · 주문
 * - `sm` — 브리핑 행 머리의 22x22. 한 줄 안에 이름 · 등락률과 나란히 서는 자리라
 *   목록 행 것을 줄여 쓸 수 없다
 */
export const STOCK_BADGE_BOX_CLASS = {
  md: 'size-11',
  sm: 'size-5.5',
} as const;

export type StockBadgeSize = keyof typeof STOCK_BADGE_BOX_CLASS;
