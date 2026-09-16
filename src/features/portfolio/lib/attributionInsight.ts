import {
  type AiAttributionContent,
  type AiAttributionPeriod,
  type AiAttributionRow,
} from '@/shared/types/ai/attribution';

/**
 * 수익률 분석 화면이 쓰는 **파생값과 표시 규칙**. 전부 엔진 계산값에서만 끌어낸다
 * (FINCH-308).
 *
 * ## 왜 이 파일이 따로 있는가
 *
 * "어느 요인이 가장 컸는가" 는 질문처럼 들리지만 **계산이다.** `breakdown` 세 값의
 * 절댓값 비교 하나로 답이 정해진다.
 *
 * 그래서 이 값을 AI 에게 묻지 않는다. 물으면 차트는 `selection` 을 가리키는데 문장은
 * `market` 을 가리키는 어긋남이 언젠가 나오고, 그때 화면에서는 어느 쪽이 맞는지 가릴
 * 수 없다. **AI 가 만든 값과 엔진이 만든 값이 같은 사실을 두 번 말하게 두지 않는다.**
 */

// ── 단위 ──────────────────────────────────────────────────────────────────────
/**
 * 수익률을 구성하는 **조각**을 퍼센트포인트로 적는다.
 *
 * `%` 와 `%p` 를 가르는 기준은 "그 값이 무엇의 비율인가" 다.
 *
 * | 값 | 단위 | 왜 |
 * | --- | --- | --- |
 * | `portfolioReturn` · `benchmarkReturn` · 종목 `return` | `%` | 원금 대비 비율이다 |
 * | `breakdown.market/sector/selection` | `%p` | 셋을 더하면 `portfolioReturn` 이다 |
 * | `contributors[].contribution` | `%p` | 모두 더하면 `portfolioReturn` 이다 (Carino 링킹) |
 * | `excessReturn` | `%p` | 두 퍼센트의 차다 |
 *
 * **`formatSignedPercent` 를 쓰면 안 되는 자리가 이것이다.** 종목 기여 `+2.02%p` 와
 * 그 종목 수익률 `+9.12%` 가 같은 행에 붙는데 단위 표기가 같으면 둘 중 무엇이
 * 포트폴리오 이야기인지 읽는 사람이 가를 수 없다.
 *
 * 소수 둘째 자리는 `formatSignedPercent` 와 맞춘다 — 같은 화면에서 자릿수가 갈리면
 * 값이 다른 정밀도로 계산된 것처럼 보인다.
 */
export function formatSignedPercentPoint(ratio: number, digits = 2): string {
  const points = ratio * 100;
  const sign = points > 0 ? '+' : points < 0 ? '-' : '';
  return `${sign}${Math.abs(points).toFixed(digits)}%p`;
}

// ── 기간 ──────────────────────────────────────────────────────────────────────
/**
 * 기간 선택지. **AI 서버가 실제로 처리하는 다섯 개만 둔다** —
 * `Period` enum(`1d`·`1w`·`1m`·`3m`·`ytd`)과 `_period_start()` 가 근거이고,
 * 목록에 없는 값은 서버가 `INVALID_REQUEST` 로 돌려준다.
 *
 * `1d` 만 아침 배치가 미리 만들어 둔다. 나머지는 첫 요청 때 생성되므로 처음 고르면
 * 느리고, 그날 안에서는 캐시된다. 그래서 기본값은 `1d` 다.
 */
export const ATTRIBUTION_PERIODS: readonly {
  value: AiAttributionPeriod;
  label: string;
}[] = [
  { value: '1d', label: '1일' },
  { value: '1w', label: '1주' },
  { value: '1m', label: '1개월' },
  { value: '3m', label: '3개월' },
  { value: 'ytd', label: '올해' },
] as const;

export const DEFAULT_ATTRIBUTION_PERIOD: AiAttributionPeriod = '1d';

// ── 요인 ──────────────────────────────────────────────────────────────────────
export type AttributionFactor = 'market' | 'sector' | 'selection';

export const ATTRIBUTION_FACTOR_LABEL: Record<AttributionFactor, string> = {
  market: '시장 영향',
  sector: '업종 영향',
  selection: '종목 선택',
};

/**
 * 가장 큰 요인 한 줄. **argmax 를 말로 옮긴 것뿐이고 인과를 말하지 않는다.**
 *
 * "종목 선택이 수익률을 끌어올렸어요" 가 아니라 "영향이 가장 컸어요" 다 — 앞엣것은
 * 해석이라 AI 몫이고, 뒤엣것은 세 값을 비교하면 누구나 같은 답을 내는 사실이다.
 * 부호를 말하지 않으므로 가장 크게 *깎은* 요인에도 같은 문장이 맞는다.
 */
export const ATTRIBUTION_FACTOR_NOTE: Record<AttributionFactor, string> = {
  market: '시장 흐름의 영향이 가장 컸어요.',
  sector: '업종 배분의 영향이 가장 컸어요.',
  selection: '종목 선택의 영향이 가장 컸어요.',
};

/** 화면에 그리는 순서. `breakdown` 객체의 키 순서에 기대지 않는다. */
export const ATTRIBUTION_FACTOR_ORDER: readonly AttributionFactor[] = [
  'market',
  'sector',
  'selection',
] as const;

/**
 * 이번 기간을 가장 크게 가른 축.
 *
 * **부호가 아니라 절댓값으로 고른다.** 가장 크게 *깎은* 요인도 "영향이 가장 큰
 * 요인" 이다 — 시장이 -2%p 로 끌어내리고 선택이 +0.3%p 로 받친 기간의 주인공은
 * 시장이다.
 *
 * 값이 정확히 같으면 `ATTRIBUTION_FACTOR_ORDER` 의 앞쪽이 이긴다.
 */
export function resolveMainFactor(
  breakdown: AiAttributionContent['breakdown'],
): AttributionFactor {
  return ATTRIBUTION_FACTOR_ORDER.reduce((champion, factor) =>
    Math.abs(breakdown[factor]) > Math.abs(breakdown[champion])
      ? factor
      : champion,
  );
}

// ── 막대 ──────────────────────────────────────────────────────────────────────
/**
 * 발산 막대의 기준 길이. 절댓값이 가장 큰 값이 한쪽 절반을 다 차지한다.
 *
 * **고정 축(예: 항상 ±5%p)을 쓰지 않는다.** 하루 구간은 세 값이 전부 0.2%p 안쪽이라
 * 고정 축이면 막대가 셋 다 보이지 않고, 3개월 구간은 축을 넘겨 잘린다.
 *
 * 스케일이 기간마다 달라지므로 **막대 옆에는 항상 값을 적는다.** 그리고 요인 차트와
 * 종목 차트가 각자 스케일을 잡으므로 **두 차트의 막대 길이를 서로 비교하면 안 된다** —
 * 값의 범위가 달라서 축을 공유하면 종목 막대가 실오라기로 눌린다.
 *
 * 전부 0 이면 `1` 을 돌려준다 — 호출부가 0 으로 나누지 않게 한다.
 */
export function divergingScale(values: readonly number[]): number {
  const peak = Math.max(...values.map(Math.abs), 0);
  return peak === 0 ? 1 : peak;
}

/**
 * 0 을 가운데 둔 막대 한 칸의 폭(%). 절반이 양수 쪽, 절반이 음수 쪽이다.
 *
 * 값이 0 이 아닌데 막대가 눈에 안 띄면 "값이 없다" 로 읽힌다. 그래서 하한을 둔다 —
 * 부호가 있다는 사실은 길이보다 먼저 보여야 한다.
 */
const MIN_VISIBLE_WIDTH = 1.5;

export function divergingWidth(value: number, scale: number): number {
  if (value === 0) {
    return 0;
  }
  return Math.max((Math.abs(value) / scale) * 50, MIN_VISIBLE_WIDTH);
}

// ── 종목 ──────────────────────────────────────────────────────────────────────
/**
 * 기여가 큰 순으로 종목을 늘어놓는다. **절댓값 기준이다.**
 *
 * 응답의 `contributors`(기여도 ≥ 0)와 `detractors`(< 0)를 그대로 이어 붙이면
 * `[+0.05, +0.02, -0.03, -0.01]` 처럼 **부호별로 묶인 두 덩어리**가 된다. 하나의
 * 순위가 아니다 — `detractors` 는 서버가 `reversed()` 로 만들어 가장 많이 깎은 것이
 * 앞이다.
 *
 * 이 화면이 답하는 질문은 "어떤 종목이 가장 크게 움직였나" 이므로 **크기 하나로 줄을
 * 세운다.** 그래야 막대가 위에서 아래로 짧아지는 하나의 그림이 되고, 상위 N 개를
 * 자를 때도 양쪽 방향의 큰 종목이 함께 남는다. 부호는 막대 방향과 색이 말한다.
 *
 * **값을 만들지 않는다 — 순서만 정한다.** 기여도 자체는 엔진이 Carino 링킹까지
 * 끝낸 값 그대로다.
 */
export function sortByImpact(
  content: Pick<AiAttributionContent, 'contributors' | 'detractors'>,
): AiAttributionRow[] {
  return [...content.contributors, ...content.detractors].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution),
  );
}

/**
 * 접었을 때 보여 줄 종목 수. 이보다 적으면 `전체 보기` 를 만들지 않는다 —
 * 여섯 줄을 다섯 줄로 줄이자고 누를 것을 만들면 상호작용만 늘고 얻는 것이 없다.
 */
export const CONTRIBUTION_COLLAPSED_COUNT = 5;
