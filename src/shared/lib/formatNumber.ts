/**
 * 숫자 포매터 (컨벤션 §6).
 * toFixed / toLocaleString 이 컴포넌트 JSX 안에 보이면 규약 위반이다.
 * 같은 숫자가 화면마다 다르게 보이는 사고를 막으려고 여기 모은다.
 *
 * **비율 포매터가 둘이다. 계열을 확인하고 고른다** (`shared/types/primitives.ts`).
 * `Ratio` 계열(0~1 소수)은 `formatSignedPercent`, `Percent` 계열(이미 백분율)은
 * `formatSignedRate` 다. 둘을 바꿔 쓰면 등락률이 100배로 나오거나 100분의 1로 나온다.
 */

const KRW_FORMATTER = new Intl.NumberFormat('ko-KR');

/**
 * 원 단위 정수를 천 단위 구분 기호만 붙여 표시한다. `73,500`
 * 단위가 표에 이미 적혀 있거나(`… 원` 라벨) 폭이 좁은 목록 행에서 쓴다 —
 * 프로토타입의 종목 행이 `원` 없이 이 모양이다.
 */
export function formatAmount(amount: number): string {
  return KRW_FORMATTER.format(Math.round(amount));
}

/** 원 단위 정수를 천 단위 구분 기호와 함께 표시한다. `73,500원` */
export function formatKrw(amount: number): string {
  return `${formatAmount(amount)}원`;
}

/**
 * 금액에 부호를 붙인다. 등락액·평가손익처럼 방향이 뜻을 갖는 자리에 쓴다.
 * `1200` → `+1,200` · `-1200` → `-1,200` · `0` → `0`
 *
 * 0 에 부호를 붙이지 않는 것은 등락률 규약(`0.00%`)과 같은 이유다.
 * `Math.abs` 를 먼저 거는 이유는 `Intl` 이 붙이는 유니코드 빼기표(U+2212)가 아니라
 * 등락률과 같은 ASCII 하이픈을 쓰기 위해서다. 둘이 섞이면 자리폭이 어긋난다.
 */
export function formatSignedAmount(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : '';
  return `${sign}${formatAmount(Math.abs(rounded))}`;
}

/**
 * 0~1 사이 소수인 비율(`Ratio`)을 부호 붙은 퍼센트로 바꾼다 (컨벤션 §6).
 * 0.0123 → `+1.23%`
 *
 * **등락률·수익률에는 쓰지 않는다.** 그쪽은 `Percent` 계열이라 이미 백분율이다.
 */
export function formatSignedPercent(ratio: number, fractionDigits = 2): string {
  const percent = ratio * 100;
  const sign = percent > 0 ? '+' : percent < 0 ? '-' : '';
  return `${sign}${Math.abs(percent).toFixed(fractionDigits)}%`;
}

/**
 * 이미 백분율인 등락률·수익률(`Percent`)을 부호 붙여 표시한다 (컨벤션 §11).
 * **100 을 곱하지 않는다.** -1.21 → `-1.21%` · 0 → `0.00%`
 *
 * 서버가 `changeRate`·`evaluationProfitRate`·`realizedProfitRate` 를 이 계열로 준다
 * (apiSpec §1.1 등락률·수익률 · contracts C18).
 */
export function formatSignedRate(rate: number, fractionDigits = 2): string {
  const sign = rate > 0 ? '+' : rate < 0 ? '-' : '';
  return `${sign}${Math.abs(rate).toFixed(fractionDigits)}%`;
}

/** 등락 방향. 색은 이 값으로 의미 토큰을 고른다. 색 이름을 직접 쓰지 않는다. */
export type PriceDirection = 'rise' | 'fall' | 'flat';

export function getPriceDirection(changeRatio: number): PriceDirection {
  if (changeRatio > 0) {
    return 'rise';
  }
  if (changeRatio < 0) {
    return 'fall';
  }
  return 'flat';
}
