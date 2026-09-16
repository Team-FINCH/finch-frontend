/**
 * 종목 이니셜 뱃지 (FINCH-261). 종목명 첫 글자를 종목마다 다른 색 사각형에
 * 넣는다. 프로토타입 `.th` 다.
 *
 * ## 지금은 폴백이다 — 화면이 직접 쓰지 않는다
 *
 * 서비스 종목이 30개로 닫히면서 종목 자리에는 기업 로고가 들어간다. 화면은
 * `StockLogo` 를 쓰고, 이 뱃지는 **로고가 없는 종목에만** 나온다 — 보유·거래내역에
 * 남은 목록 밖 코드이거나, 로고 파일을 못 불러왔을 때다. 자세한 사정은
 * `StockLogo` 와 `shared/config/stockLogos.ts` 주석에 있다.
 *
 * 아래 해시·틴트 이야기는 그 폴백에 그대로 유효하다. 목록 밖 종목이 여럿 섞여도
 * 서로 구분되어야 하고, 그 자리엔 여전히 업종 정보가 없다.
 *
 * ## 왜 공용으로 모았나
 *
 * 같은 뱃지가 네 곳에 각자 적혀 있었다 — `StockRow` · `BriefingFullList` ·
 * `HoldingsTab` · `OrderStockHeader`. 색을 넣으려면 네 곳을 똑같이 고쳐야 하고,
 * 한 곳을 빠뜨리면 **같은 종목이 화면마다 다른 색으로 보인다.** 그게 이 뱃지의
 * 유일한 쓸모(훑을 때 같은 종목을 알아보는 것)를 정확히 깨뜨린다.
 *
 * ## 색을 종목코드에서 뽑는 이유
 *
 * **응답에 업종·섹터 필드가 없다.** `shared/types/stock.ts`·`portfolio.ts` 어디에도
 * 없고 apiSpec 에도 없다. 그래서 "카테고리별 색" 은 지금 만들 수 없다.
 *
 * 프로토타입은 종목 데이터에 색 쌍을 손으로 박아 뒀다(`S["307220"].tint`). 그 방식을
 * 그대로 옮기면 프로토타입에 있는 여섯 종목만 색이 붙고 나머지는 회색이라 목록이
 * 얼룩덜룩해진다 — 시드가 300종목이다.
 *
 * 그래서 **종목코드를 해시해 다섯 쌍 중 하나를 고른다.** 순수 함수라
 *
 * - 같은 종목은 홈·포트폴리오·브리핑·주문 어디서나 같은 색이고
 * - 새로고침하거나 다른 기기에서 열어도 같은 색이며
 * - 서버가 내려줄 것이 없다.
 *
 * ## 색만으로 뜻을 전하지 않는다
 *
 * 뱃지는 `aria-hidden` 이다. 안에 든 한 글자는 바로 옆 종목명의 첫 글자를 되풀이할
 * 뿐이라 화면 낭독기에는 같은 말이 두 번 들릴 이유가 없다. **색은 훑을 때 눈이
 * 걸리게 하는 장식이고, 종목을 가리는 정보는 언제나 옆의 글자다.** 틴트 다섯 쌍 중
 * 셋이 AA 에 못 미치는데도 값을 그대로 쓰는 근거가 이것이다 —
 * `styles/index.css` 의 틴트 블록 주석에 실측 대비와 함께 적어 두었다.
 */

import { STOCK_BADGE_BOX_CLASS, type StockBadgeSize } from './stockBadgeSize';

/**
 * 틴트 다섯 쌍. 값은 `styles/index.css` 에 있고 여기는 유틸리티 이름만 늘어놓는다.
 *
 * **문자열을 조립하지 않고 통째로 적는다.** Tailwind 는 소스에 그대로 적힌 글자만
 * 찾아 클래스를 만들어서, `` `bg-stock-tint-${n}` `` 처럼 만들면 빌드에서 그 클래스가
 * 아예 나오지 않는다 — 개발 서버에서는 되고 배포본에서만 색이 빠진다.
 */
const TINT_CLASS = [
  'bg-stock-tint-1 text-stock-tint-1-fg',
  'bg-stock-tint-2 text-stock-tint-2-fg',
  'bg-stock-tint-3 text-stock-tint-3-fg',
  'bg-stock-tint-4 text-stock-tint-4-fg',
  'bg-stock-tint-5 text-stock-tint-5-fg',
] as const;

/** 종목명을 아직 모를 때. 색을 고를 근거가 없으니 중립으로 둔다. */
const NEUTRAL_CLASS = 'bg-surface-soft text-text-secondary';

/**
 * 뱃지에만 있는 것 — 모서리와 글자 크기. 자리 크기는 `stockBadgeSize` 가 갖는다
 * (로고와 나눠 쓰는 값이라 컴포넌트 밖에 있다). 로고는 SVG 가 이미 원형이라
 * 모서리를 줄 일이 없다.
 */
const SIZE_CLASS = {
  md: 'rounded-md text-body-1',
  /**
   * 36px·32px 은 FINCH-299 가 더했다. 전에 손으로 그리던 값이
   * `rounded-[11px]`·`text-[14px]`·`text-[13px]` 이었는데, 같은 36px 자리인데도
   * `CauseTab` 은 11px, `StockPickRow` 는 `rounded-md`(14px)라 둘로 갈려 있었다.
   * 임의값을 버리고 계단 토큰으로 맞춘다 — 11px 은 `--radius-sm`(10px)과
   * `--radius-12`(12px) 사이라 계단에 자리가 없는 값이었다.
   */
  sub: 'rounded-md text-label',
  dense: 'rounded-12 text-caption',
  sm: 'rounded-xs text-[11px]',
} as const;

/**
 * 종목코드를 0~4 로 접는다. FNV-1a 32비트다.
 *
 * **글자 코드 합(`% 5`)을 쓰지 않았다.** 종목코드는 연속으로 발급되는 구간이 많아
 * (`005930`·`005935` 처럼 한 자리만 다른 것도 흔하다) 합으로 접으면 이웃한 코드가
 * 이웃한 버킷으로 줄줄이 몰린다. 목록은 대체로 코드 순이라 그 편향이 **화면에서
 * 색 줄무늬로 그대로 보인다.** FNV-1a 는 한 글자만 달라도 결과가 흩어진다.
 *
 * `Math.imul` 을 쓰는 이유 — 32비트 곱을 그냥 `*` 로 하면 배정밀도 부동소수 범위를
 * 넘겨 하위 비트가 잘린다. 잘린 비트가 곧 섞임이라 분포가 무너진다.
 * `>>> 0` 은 부호 비트를 떨어내 결과를 음수 아닌 값으로 만든다.
 *
 * **6자리 문자열 그대로 읽는다.** 숫자로 바꾸면 `005930` 의 앞 `0` 이 사라져
 * `5930` 과 같은 색이 된다.
 */
function hashStockCode(stockCode: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < stockCode.length; index += 1) {
    hash ^= stockCode.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % TINT_CLASS.length;
}

type StockInitialBadgeProps = {
  /** 6자리 문자열. **색을 고르는 값이다** — 이름이 아니라 코드로 고른다 */
  stockCode: string;
  /**
   * 첫 글자를 뱃지에 넣는다. 아직 모르면 `null` — 그때는 중립색에 **종목코드 앞
   * 두 자리**를 넣는다. 이름이 도착하면 색이 붙지만 **자리와 크기는 그대로**라
   * 목록이 밀리지 않는다.
   *
   * **한 글자가 아니라 두 자리인 이유** (GitLab 이슈 #42 표시 규칙, 위키 테제에서
   * 올라왔다 — FINCH-299). 종목코드는 `005930` 처럼 앞자리가 `0` 인 것이
   * 많아 첫 글자만 넣으면 뱃지가 죄다 `0` 이 된다. 어느 종목인지 못 읽는다.
   */
  stockName: string | null;
  size?: StockBadgeSize;
  className?: string;
};

export function StockInitialBadge({
  stockCode,
  stockName,
  size = 'md',
  className = '',
}: StockInitialBadgeProps) {
  const toneClass =
    stockName === null ? NEUTRAL_CLASS : TINT_CLASS[hashStockCode(stockCode)];

  return (
    <span
      aria-hidden="true"
      className={`flex flex-none items-center justify-center font-bold ${STOCK_BADGE_BOX_CLASS[size]} ${SIZE_CLASS[size]} ${toneClass} ${className}`}
    >
      {stockName === null ? stockCode.slice(0, 2) : stockName.slice(0, 1)}
    </span>
  );
}
