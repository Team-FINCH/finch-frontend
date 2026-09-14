/**
 * 종목 이니셜 뱃지 (FINCH-261). 종목명 첫 글자를 종목마다 다른 색 사각형에
 * 넣는다. 프로토타입 `.th` 이고 홈 · 포트폴리오 · 브리핑 · 주문이 같은 것을 쓴다.
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
 * 치수 두 벌. 프로토타입 실측이다.
 *
 * - `md` — 목록 행의 44x44 (`.th`, 반경 14px = `rounded-md`). 홈·포트폴리오·주문
 * - `sm` — 브리핑 행 머리의 22x22. 한 줄 안에 이름·등락률과 나란히 서는 자리라
 *   목록 행 것을 줄여 쓸 수 없다
 */
const SIZE_CLASS = {
  md: 'size-11 rounded-md text-body-1',
  sm: 'size-5.5 rounded-xs text-[11px]',
} as const;

export type StockInitialBadgeSize = keyof typeof SIZE_CLASS;

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
   * 첫 글자를 뱃지에 넣는다. 아직 모르면 `null` — 그때는 중립색에 종목코드
   * 첫 글자를 넣는다. 이름이 도착하면 색이 붙지만 **자리와 크기는 그대로**라
   * 목록이 밀리지 않는다.
   */
  stockName: string | null;
  size?: StockInitialBadgeSize;
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
      className={`flex flex-none items-center justify-center font-bold ${SIZE_CLASS[size]} ${toneClass} ${className}`}
    >
      {(stockName ?? stockCode).slice(0, 1)}
    </span>
  );
}
