import { type AiAttributionContent } from '@/shared/types/ai/attribution';

/**
 * 수익률 분석 화면이 쓰는 **파생값**. 전부 엔진 계산값에서만 끌어낸다
 * (FINCH-308).
 *
 * ## 왜 이 파일이 따로 있는가
 *
 * "어느 요인이 가장 컸는가" · "어느 종목이 가장 크게 기여했는가" 는 **질문처럼
 * 들리지만 계산이다.** `breakdown` 세 값의 절댓값 비교, `contributors` 의 첫 줄
 * 하나면 끝나고 답이 하나로 정해진다.
 *
 * 그래서 이 값들을 AI 에게 묻지 않는다. 물으면 차트는 `selection` 이 가장 큰데
 * 문장은 `market` 을 가리키는 어긋남이 언젠가 나오고, 그때 어느 쪽이 맞는지
 * 화면에서는 가릴 수 없다. **AI 가 만든 값과 엔진이 만든 값이 같은 사실을 두 번
 * 말하게 두지 않는다** — 한쪽이 틀릴 자리를 아예 없앤다.
 *
 * 반대로 여기서 **문구를 지어내지도 않는다.** `CauseTab` 이 이미 그 선을 그어
 * 뒀다(응답에 항목별 설명 필드가 없으므로 값과 라벨만 표시한다). 이 파일이 내는
 * 것은 강조할 대상과 막대 길이뿐이고, 해석하는 문장은 전부 AI 응답에서 온다.
 */

/** `breakdown` 의 세 축. 라벨과 강조 대상을 고를 때 쓴다. */
export type AttributionFactor = 'market' | 'sector' | 'selection';

export const ATTRIBUTION_FACTOR_LABEL: Record<AttributionFactor, string> = {
  market: '시장 영향',
  sector: '업종 영향',
  selection: '종목 선택',
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
 * **부호가 아니라 절댓값으로 고른다.** 가장 크게 *깎은* 요인도 "가장 영향이 큰
 * 요인" 이다 — 시장이 -2% 로 끌어내리고 선택이 +0.3% 로 받친 기간의 주인공은
 * 시장이다.
 *
 * 값이 정확히 같으면 `ATTRIBUTION_FACTOR_ORDER` 의 앞쪽이 이긴다. 셋이 모두 0 인
 * 기간(거래일에 아무 움직임이 없던 날)이면 `market` 이 나오는데, 그 화면은 막대가
 * 전부 비어 있어 강조가 눈에 띄지 않으므로 따로 가르지 않는다.
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

/**
 * 발산 막대의 기준 길이. 값들 중 절댓값이 가장 큰 것이 막대 폭 100% 를 차지한다.
 *
 * **고정 축(예: 항상 ±5%)을 쓰지 않는다.** 하루 구간은 세 값이 전부 0.2% 안쪽인데
 * 고정 축이면 막대가 셋 다 보이지 않고, 3개월 구간은 축을 넘겨 잘린다. 기간마다
 * 스케일이 달라지므로 막대 옆의 숫자를 항상 함께 읽어야 하고, 그래서 화면은
 * 막대만 두지 않고 값을 같이 적는다.
 *
 * 전부 0 이면 `0` 이 아니라 `1` 을 돌려준다 — 호출부가 0 으로 나누지 않게 한다.
 */
export function divergingScale(values: readonly number[]): number {
  const peak = Math.max(...values.map(Math.abs), 0);
  return peak === 0 ? 1 : peak;
}

/**
 * 0 을 가운데 둔 막대 한 칸의 폭(%). 절반이 양수 쪽, 절반이 음수 쪽이다.
 *
 * 값이 0 이 아닌데 막대가 0.5% 도 안 되면 화면에서 사라져 "값이 없다" 로 읽힌다.
 * 그래서 하한을 둔다 — 부호가 있다는 사실은 길이보다 먼저 보여야 한다.
 */
const MIN_VISIBLE_WIDTH = 1.5;

export function divergingWidth(value: number, scale: number): number {
  if (value === 0) {
    return 0;
  }
  return Math.max((Math.abs(value) / scale) * 50, MIN_VISIBLE_WIDTH);
}

/**
 * 기여·감소 종목을 한 목록으로 합친다. 기여도 내림차순이다.
 *
 * 응답은 `contributors`(기여도 ≥ 0)와 `detractors`(< 0)로 이미 갈라져 있고 각각
 * 정렬돼 있다. 둘을 이어 붙이면 그대로 내림차순이라 다시 정렬하지 않는다 —
 * 엔진이 Carino 링킹까지 끝낸 순서이므로 화면이 기준을 새로 만들지 않는다.
 */
export function mergeContributionRows(
  content: Pick<AiAttributionContent, 'contributors' | 'detractors'>,
): AiAttributionContent['contributors'] {
  return [...content.contributors, ...content.detractors];
}
