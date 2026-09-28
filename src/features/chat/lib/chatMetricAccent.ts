import { type AiSegment } from '@/shared/types/ai/envelope';

/**
 * 채팅 답변이 첫 `metric` 조각에 쓰는 강조 클래스 (FINCH-358).
 *
 * 같은 검정 면(`bg-ai-surface`)을 쓰는 `features/portfolio/components/
 * AiAccentSentence` 와 **같은 값**이어야 한다 — 나란히 보면 같은 면인데 강조
 * 규칙이 갈려 있던 것이 이 티켓의 배경이다. `ChatBubble`(타자 경로)과
 * `ChatMarkdown`(완료 경로)이 입력이 달라 구현은 둘로 갈리지만, 클래스 문자열은
 * 여기 하나로 모아 둘이 함께 쓴다 — 갈라두면 나중에 한쪽만 고쳐진다.
 */
export const CHAT_METRIC_ACCENT_CLASS = 'font-bold text-ai-accent tabular-nums';

export type MetricAccentRange = {
  /** `section.text` 기준 시작 오프셋. */
  start: number;
  /** `section.text` 기준 끝 오프셋(포함하지 않음). */
  end: number;
  /** 강조할 값 자체. `ChatMarkdown` 은 오프셋 대신 이 값으로 찾는다. */
  value: string;
};

/**
 * 첫 `metric` 조각의 오프셋을 구한다.
 *
 * `segments` 를 이어 붙이면 `section.text` 와 정확히 일치한다는 보장이 있어
 * (contracts C55) 앞선 조각들의 `value` 길이 합이 그대로 `section.text` 안에서의
 * 오프셋이 된다. `useTypewriter` 가 돌려주는 `visibleText` 도 `text` 의 순수한
 * 접두사라 이 오프셋을 그대로 잘라 쓸 수 있다.
 *
 * `metric` 조각이 없으면(복원된 이력 — `segments: []` — 이거나 애초에 수치가
 * 없는 답변) `null` 이다. 강조할 것이 없다는 뜻이라 호출부가 원문을 그대로 그린다.
 */
export function findFirstMetricRange(
  segments: readonly AiSegment[],
): MetricAccentRange | null {
  let start = 0;
  for (const segment of segments) {
    if (segment.type === 'metric') {
      return { start, end: start + segment.value.length, value: segment.value };
    }
    start += segment.value.length;
  }
  return null;
}
