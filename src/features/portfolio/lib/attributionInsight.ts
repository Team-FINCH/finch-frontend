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
 * 요인 이름 (FINCH-341 · 345).
 *
 * `시장 영향`·`업종 영향`·`종목 선택` 이 프로토타입 원문이었다. 341 이 **`영향`
 * 이 셋 중 둘에만 붙어 세 축이 같은 계열로 읽히지 않는다**는 이유로 셋을 행동
 * 쪽(`시장 움직임`)으로 맞췄다.
 *
 * **345 에서 `market` 만 되돌렸다.** 그 판단은 셋의 *꼴*만 보고 내린 것이라,
 * 각 이름이 무엇을 가리키는지는 보지 않았다 — `시장 움직임` 은 **시장이 얼마나
 * 움직였나**(시장 수익률)로 읽히는데 이 값은 그게 아니라 **그 움직임이 내
 * 수익률을 얼마나 밀고 당겼나**(기여도)다. 사용자가 실제로 물은 것이
 * *"이 숫자가 시장 수익률인가?"* 였다.
 *
 * `영향` 이 그 구분을 진다. 나머지 둘은 `배분`·`선택` 이 이미 "내가 한 일"을
 * 말하고 있어 `영향` 을 붙이면 오히려 겹친다.
 *
 * **셋 다 받침으로 끝난다**(ㅇ·ㄴ·ㄱ). `resolveAttributionVerdict` 가 조사를
 * `이`·`을`·`과` 로 고정해 쓰므로, 라벨을 받침 없는 말로 바꾸면 그 문장이 깨진다.
 */
export const ATTRIBUTION_FACTOR_LABEL: Record<AttributionFactor, string> = {
  market: '시장 영향',
  sector: '업종 배분',
  selection: '종목 선택',
};

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

// ── 해석 ────────────────────────────────────────────────────────────────────
/**
 * 이번 기간에 무슨 일이 있었는지 **한 문장** (FINCH-345).
 *
 * ## 이 탭에서 산문은 이 한 줄뿐이다
 *
 * 한때 여기에 글이 넷 더 있었다 — 제목 아래 설명 줄, 이 문장의 보조 줄(깎은 쪽과
 * 올린 쪽의 합), 막대 읽는 법 한 줄, 그리고 요인마다 붙는 설명 셋. **설명이
 * 많아져서 오히려 안 보였다**(사용자 지적).
 *
 * 그것들이 말하던 것을 차트가 대신한다 — 방향과 단위는 **축 라벨**
 * (`수익률을 낮춤 · 0 · 수익률을 높임`)이 한 번에 말하고, 덧셈은 최종 행이
 * 같은 차트 안에 들어오면서 보인다. **같은 말을 세 줄로 반복하던 것을 축 하나로
 * 옮긴 것**이 이 화면의 요점이다.
 *
 * 그래도 이 한 줄은 남는다. 축이 말할 수 없는 것이 하나 있어서다 — **방향이 다른
 * 요인들이 서로 어떻게 됐는가.** 막대 셋을 보고 "둘이 깎고 하나가 거의 되돌렸다"
 * 에 닿으려면 세 길이를 머릿속에서 견줘야 한다.
 *
 * 더 풀어 쓰고 싶으면 `AttributionGuideSheet` 로 보낸다. 시트는 묻는 사람만 읽고
 * 본문은 모두가 읽는다.
 *
 * ## 보조 줄을 걷으면서 사라진 문제
 *
 * 전 판은 `수익률을 깎은 쪽이 -0.46%p` 처럼 **프론트가 더한 값**을 적었고, 그것이
 * 이 화면에서 유일하게 엔진이 내지 않은 수치였다. 줄이 없어지면서 그 예외도
 * 없어진다 — 화면의 모든 숫자가 다시 응답 값 그대로다.
 *
 * ## 여전히 AI 가 쓰지 않는다
 *
 * 부호별로 묶고 두 쪽의 합을 견주는 것이 전부다. 같은 `breakdown` 이면 언제나
 * 같은 문장이 나온다. AI 에게 맡기면 차트는 `selection` 을 가리키는데 문장은
 * `market` 을 가리키는 어긋남이 언젠가 나오고, 화면에서는 어느 쪽이 맞는지 가릴
 * 수 없다 — 이 파일이 존재하는 이유 그대로다.
 *
 * **인과와 가치 판단을 말하지 않는다.** `만회했어요` 는 두 방향의 크기를 견준
 * 산술이고 `잘 골랐어요`·`시장이 나빴어요` 는 아니다. 그쪽은 `요약` 탭의
 * FINCH 카드 몫이다.
 */

/**
 * `거의 만회` 와 `일부 만회` 를 가르는 선.
 *
 * 올린 쪽이 깎은 쪽의 80% 이상이면 `거의` 다. **눈금이 아니라 말의 경계라 정확한
 * 값이 있을 수 없다** — 화면에 두 숫자가 함께 서 있으므로 읽는 사람이 스스로
 * 가늠할 수 있고, 이 말은 그 가늠을 거드는 것이지 대신하는 것이 아니다.
 */
const NEARLY_OFFSET_RATIO = 0.8;

/**
 * 라벨 여럿을 한 덩어리로. **조사 `과` 가 고정이다** — 라벨 셋이 모두 받침으로
 * 끝난다(`ATTRIBUTION_FACTOR_LABEL` 주석).
 *
 * 셋이 한꺼번에 들어오는 일은 없다. 한 방향에 셋이 다 모이면 반대쪽이 비어서
 * 호출부가 `세 요인이 모두` 로 갈라지기 때문이다 — `시장 영향과 업종 배분과
 * 종목 선택` 은 읽히지 않는다.
 */
function joinFactorLabels(
  items: readonly { factor: AttributionFactor }[],
): string {
  return items.map((item) => ATTRIBUTION_FACTOR_LABEL[item.factor]).join('과 ');
}

export function resolveAttributionVerdict(
  breakdown: AiAttributionContent['breakdown'],
): string {
  const entries = ATTRIBUTION_FACTOR_ORDER.map((factor) => ({
    factor,
    value: breakdown[factor],
  }));
  const gains = entries.filter((entry) => entry.value > 0);
  const losses = entries.filter((entry) => entry.value < 0);
  const total = ATTRIBUTION_FACTOR_ORDER.length;

  // 거래가 없던 날이 실제로 있다. 견줄 두 쪽이 없다.
  if (gains.length === 0 && losses.length === 0) {
    return '이번 기간에는 세 요인 모두 수익률을 움직이지 않았어요.';
  }

  if (losses.length === 0) {
    return gains.length === total
      ? '세 요인이 모두 수익률을 밀어올렸어요.'
      : `${joinFactorLabels(gains)}이 수익률을 밀어올렸어요.`;
  }

  if (gains.length === 0) {
    return losses.length === total
      ? '세 요인이 모두 수익률을 끌어내렸어요.'
      : `${joinFactorLabels(losses)}이 수익률을 끌어내렸어요.`;
  }

  const up = gains.reduce((sum, entry) => sum + entry.value, 0);
  const down = losses.reduce((sum, entry) => sum + entry.value, 0);
  const gainLabels = joinFactorLabels(gains);
  const lossLabels = joinFactorLabels(losses);

  // `up + down` 은 항등식상 `portfolioReturn` 이다. **그 값을 돌려주지는 않는다** —
  // 화면에 적는 최종 수익률은 언제나 응답의 `portfolioReturn` 이고, 여기서는
  // 어느 쪽이 이겼는지를 고르는 데만 쓴다.
  const net = up + down;

  if (net > 0) {
    return `${gainLabels}이 ${lossLabels}을 넘어섰어요.`;
  }

  if (net === 0) {
    return `${gainLabels}과 ${lossLabels}이 서로 상쇄됐어요.`;
  }

  return up / -down >= NEARLY_OFFSET_RATIO
    ? `${gainLabels}이 ${lossLabels}을 거의 만회했어요.`
    : `${gainLabels}이 ${lossLabels}을 일부 만회했어요.`;
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
  /* `기여 분석` 이었다 (FINCH-341 에서 고쳤다).

     **옆 칸과 짝이 맞지 않았다** — 하나는 무엇을 *하는지*(분석), 하나는 무엇
     *단위*인지(종목별)라 둘이 같은 층의 선택지로 읽히지 않았다. `요인별 / 종목별`
     이면 같은 질문(수익률이 어디서 왔나)을 **쪼개는 두 가지 방식**이 된다.

     `기여` 는 contribution 의 번역어다. 화면에서 처음 만나는 사람에게 와닿지
     않는데, 탭을 누르면 `시장 움직임 · 업종 배분 · 종목 선택` 셋이 나와서
     `요인` 이 무엇인지 그 자리에서 정의된다. */
  { value: 'factor', label: '요인별' },
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
