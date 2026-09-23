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

/**
 * 요인 이름 (FINCH-341 에서 둘을 고쳤다).
 *
 * `시장 영향`·`업종 영향` 이었다. 프로토타입 원문이라 그대로 두고 있었는데,
 * **`영향` 이 셋 중 둘에만 붙어 있어 세 축이 같은 계열로 읽히지 않았다** —
 * `시장 영향`·`업종 영향`·`종목 선택` 은 앞의 둘이 결과, 뒤의 하나가 행동처럼
 * 보인다. 셋 다 "내가 무엇을 해서 생긴 몫" 이라 행동 쪽으로 맞췄다.
 *
 * `ATTRIBUTION_FACTOR_NOTE` 가 이미 `시장 흐름`·`업종 배분` 이라고 쓰고 있어서
 * 라벨과 문장이 서로 다른 말을 하던 것도 이번에 닫힌다.
 */
export const ATTRIBUTION_FACTOR_LABEL: Record<AttributionFactor, string> = {
  market: '시장 움직임',
  sector: '업종 배분',
  selection: '종목 선택',
};

/**
 * 요인이 무엇인지 한 줄로 푼 것. **기간마다 바뀌지 않는 정의다.**
 *
 * 부호·크기를 말하지 않는 이유가 있다 — 그것은 `ATTRIBUTION_FACTOR_NOTE` 한 줄이
 * 이미 하고 있고, 세 줄이 각자 "높였어요/낮췄어요" 를 말하면 **무엇을 먼저 읽어야
 * 하는지가 사라진다.** 여기는 축이 무엇인지만 말한다.
 *
 * 셋이 어떻게 더해지는지는 글이 아니라 워터폴이 말한다(`resolveWaterfall`).
 */
export const ATTRIBUTION_FACTOR_DESCRIPTION: Record<AttributionFactor, string> =
  {
    market: '시장 전체가 움직인 만큼이에요.',
    sector: '어떤 업종에 얼마나 담았는지의 몫이에요.',
    selection: '업종 안에서 어떤 종목을 골랐는지의 몫이에요.',
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

// ── 워터폴 ────────────────────────────────────────────────────────────────────
/**
 * 세 요인을 **누적 흐름**으로 놓는다 (FINCH-341).
 *
 * ## 왜 필요했나
 *
 * 전에는 요인 셋이 각자 0 을 가운데 둔 막대였다. 세 막대의 길이는 서로 견줄 수
 * 있었지만 **셋을 더하면 기간 수익률이 된다는 사실은 화면에 없었다** — 사용자가
 * `+0.89`, `-0.18`, `+1.42` 를 보고 머릿속으로 더해야 `+2.13` 에 닿았다.
 *
 * 워터폴은 각 막대를 **앞 요인이 끝난 자리에서 시작**시켜 그 덧셈을 그림으로
 * 만든다. 0 에서 출발해 시장이 밀고, 업종이 조금 당기고, 선택이 다시 밀어
 * 최종에 닿는 한 줄기다.
 *
 * ## 값을 만들지 않는다 — 자리만 잡는다
 *
 * `start`·`end` 는 `breakdown` 값을 순서대로 누적한 것이고, 새 수치가 아니다.
 * 화면에 글자로 나가는 것은 여전히 `value`(각 요인)와 호출부가 넘기는
 * `portfolioReturn`(최종)뿐이다. **누적 중간값은 막대의 왼쪽 끝을 정하는 데만
 * 쓰이고 숫자로 그려지지 않는다** — 엔진이 내지 않은 값을 화면에 적지 않는다.
 *
 * 마지막 `end` 는 항등식상 `portfolioReturn` 과 같지만(엔진이 §6.3 에서 검증한다)
 * **최종 줄에는 그 누적값이 아니라 응답의 `portfolioReturn` 을 적는다.** 부동소수
 * 덧셈으로 만든 값과 엔진이 준 값이 끝자리에서 갈릴 수 있고, 갈리면 화면이
 * 자기 자신과 어긋난다.
 *
 * ## 범위에 0 을 반드시 넣는다
 *
 * `min`·`max` 후보에 `0` 을 끼운다. 세 요인이 모두 양수면 누적이 0 밑으로
 * 내려가지 않는데, 그때도 **0 기준선이 막대 영역 안에 서야** 어디가 출발점인지
 * 보인다. 0 이 범위 밖이면 기준선이 트랙 밖으로 나가 그려지지 않는다.
 */
export type WaterfallStep = {
  factor: AttributionFactor;
  value: number;
  /** 이 요인 직전까지의 누적 */
  start: number;
  /** 이 요인까지의 누적 */
  end: number;
};

export type Waterfall = {
  steps: readonly WaterfallStep[];
  min: number;
  max: number;
};

export function resolveWaterfall(
  breakdown: Record<AttributionFactor, number>,
): Waterfall {
  let running = 0;
  const steps = ATTRIBUTION_FACTOR_ORDER.map((factor) => {
    const value = breakdown[factor];
    const start = running;
    running += value;
    return { factor, value, start, end: running };
  });

  const points = [0, ...steps.flatMap((step) => [step.start, step.end])];
  return { steps, min: Math.min(...points), max: Math.max(...points) };
}

/**
 * 막대 한 칸의 왼쪽 끝과 폭(%). 트랙 전체가 `min ~ max` 를 덮는다.
 *
 * `divergingWidth` 와 같은 이유로 하한(`MIN_VISIBLE_WIDTH`)을 둔다 — 값이 0 이
 * 아닌데 막대가 보이지 않으면 "그 요인은 없었다" 로 읽힌다. 하한 때문에 막대가
 * 오른쪽 끝을 넘지 않도록 `left` 를 뒤에서 당긴다.
 */
export function waterfallBar(
  step: WaterfallStep,
  { min, max }: Pick<Waterfall, 'min' | 'max'>,
): { left: number; width: number } {
  const span = max - min || 1;
  const low = Math.min(step.start, step.end);
  const high = Math.max(step.start, step.end);

  const width = Math.max(((high - low) / span) * 100, MIN_VISIBLE_WIDTH);
  const left = Math.min(((low - min) / span) * 100, 100 - width);
  return { left: Math.max(left, 0), width };
}

/** 0 기준선의 왼쪽 위치(%). */
export function waterfallZero({
  min,
  max,
}: Pick<Waterfall, 'min' | 'max'>): number {
  const span = max - min || 1;
  return ((0 - min) / span) * 100;
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
 * 네 줄을 세 줄로 줄이자고 누를 것을 만들면 상호작용만 늘고 얻는 것이 없다.
 *
 * **다섯에서 셋으로 내렸다** (FINCH-327). 기본 화면이 보유 종목 수에 끌려
 * 길어지던 것을 막는다. 셋이면 `sortByImpact` 의 절댓값 정렬 덕에 가장 크게 올린
 * 종목과 가장 크게 깎은 종목이 보통 함께 남는다 — 위에서부터 부호가 섞여 있기
 * 때문이다. 둘로 내리면 한쪽 방향만 남는 기간이 생긴다.
 */
export const CONTRIBUTION_COLLAPSED_COUNT = 3;

// ── 2차 탭 ────────────────────────────────────────────────────────────────────
/**
 * 수익률 분석 탭 **안**의 2차 탭 (FINCH-333).
 *
 * ## 왜 갈랐는가
 *
 * 전에는 `성과 카드 → 수익률 기여 → 종목별 기여 → FINCH 해석` 이 한 줄로 이어져
 * 있었다. 셋이 답하는 질문이 서로 다른데 세로로 붙어 있어서, **요인 막대와 종목
 * 막대가 한 화면에 같이 잡혔다.** 둘은 `divergingScale` 을 각자 잡으므로 길이를
 * 서로 비교하면 안 되는 차트인데(그 함수 주석), 나란히 서 있으면 비교하게 된다.
 * 탭으로 가르면 그 오독이 구조적으로 막힌다.
 *
 * ## 순서가 곧 읽기 깊이다
 *
 * `요약`(결론) → `기여 분석`(무엇이) → `종목별`(어느 종목이). 왼쪽일수록 덜
 * 파고든다. 기본값이 `summary` 인 이유도 이것이다 — 처음 여는 사람은 결론부터
 * 본다.
 *
 * **URL 에 싣지 않는다.** 기간(`period`)과 같은 취급이다. `?tab=` 넷은 화면이
 * 갈리는 단위라 공유·복귀 대상이지만, 이 셋은 같은 화면을 읽는 깊이라
 * 주소를 늘릴 값이 아니다 (`usePortfolioTabState` 는 `tab`·`sort` 만 든다).
 */
export type CauseView = 'summary' | 'factor' | 'stock';

export const CAUSE_VIEWS: readonly { value: CauseView; label: string }[] = [
  { value: 'summary', label: '요약' },
  { value: 'factor', label: '기여 분석' },
  { value: 'stock', label: '종목별' },
] as const;

export const DEFAULT_CAUSE_VIEW: CauseView = 'summary';

/**
 * 탭 버튼과 패널을 `aria-controls` / `aria-labelledby` 로 잇는 id.
 *
 * **컴포넌트 파일이 아니라 여기 있다.** `CauseViewTabs.tsx` 에 두면 ESLint
 * `react-refresh/only-export-components` 가 잡는다 — 컴포넌트 파일이 컴포넌트가
 * 아닌 것을 함께 내보내면 Fast Refresh 가 모듈 전체를 갈아 끼우면서 상태를
 * 잃는다. 값 목록(`CAUSE_VIEWS`)이 이미 여기 있으니 짝이 맞는다.
 *
 * 한 화면에 이 탭 줄은 하나뿐이라 id 를 고정 문자열로 만든다.
 */
export const CAUSE_VIEW_PANEL_ID = 'cause-view-panel';

export function causeViewTabId(view: CauseView): string {
  return `cause-view-tab-${view}`;
}

// ── 요약 탭 ───────────────────────────────────────────────────────────────────
/**
 * 성과를 가장 많이 올린 종목과 가장 많이 깎은 종목 한 쌍 (FINCH-333).
 *
 * `요약` 탭이 답하는 네 질문 중 마지막 — "어떤 종목이 가장 영향을 줬나" 는
 * **방향별로 하나씩**일 때 가장 빨리 읽힌다. 절댓값 상위 둘(`sortByImpact` 의 앞
 * 두 개)을 그냥 쓰면 오른 종목 둘이 나오는 날이 있어서 "무엇이 깎았나" 에 답을
 * 못 한다.
 *
 * **값을 만들지 않는다 — 고르기만 한다.** 기여도는 엔진이 Carino 링킹까지 끝낸
 * 값 그대로이고, 입력이 이미 절댓값 내림차순이라 각 방향의 첫 항목이 곧 그 방향의
 * 1위다.
 *
 * 한쪽이 없는 기간이 있다(전 종목이 오른 날은 `worst` 가 `undefined`). 호출부가
 * 그 줄을 빼고 그린다 — 자리를 `--` 로 채우면 없는 값이 있는 것처럼 읽힌다.
 */
export function resolveTopContributors(rows: readonly AiAttributionRow[]): {
  best: AiAttributionRow | undefined;
  worst: AiAttributionRow | undefined;
} {
  return {
    best: rows.find((row) => row.contribution > 0),
    worst: rows.find((row) => row.contribution < 0),
  };
}

/**
 * 요인 셋을 기여도 절댓값 내림차순으로 (FINCH-333).
 *
 * `요약` 탭의 `초과 성과는 어디서 왔나요?` 가 1위를 크게 세우고 나머지를 작게
 * 깔기 때문에 순서가 필요하다. **`ATTRIBUTION_FACTOR_ORDER`(시장→업종→선택)를
 * 대신하지 않는다** — 그쪽은 `기여 분석` 탭이 쓰는 고정 표시 순서이고, 세 요인을
 * 나란히 견주는 화면에서는 순위로 줄을 세우면 기간마다 행이 움직여 비교가 어렵다.
 * 요약은 반대로 순위가 곧 내용이라 정렬한다.
 */
export function sortFactorsByImpact(
  breakdown: AiAttributionContent['breakdown'],
): readonly { factor: AttributionFactor; value: number }[] {
  return ATTRIBUTION_FACTOR_ORDER.map((factor) => ({
    factor,
    value: breakdown[factor],
  })).sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}
