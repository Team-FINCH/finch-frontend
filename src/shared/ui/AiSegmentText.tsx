import { type AiSegment } from '@/shared/types/ai/envelope';

/** 등락색. `direction` 이 `up`/`down` 일 때만 쓴다 (국내 관례 — 상승 적색·하락 청색). */
const DIRECTION_CLASS: Record<'up' | 'down', string> = {
  up: 'text-stock-up',
  down: 'text-stock-down',
};

type AiSegmentTextProps = {
  segments: readonly AiSegment[];
  /**
   * 조각이 비어 있을 때 대신 그릴 문장. `segments` 를 이어 붙이면 `text` 와 정확히
   * 일치하므로(C55) 둘 다 그리지 않고, 조각이 없을 때만 이 값으로 떨어진다.
   * 넘기지 않으면 조각이 없을 때 아무것도 그리지 않는다.
   */
  text?: string;
  /**
   * 검정 면(`--color-ai-surface`) 위에 그릴 때 켠다. 등락색 대신 AI 강조색을 쓴다.
   */
  onDark?: boolean;
};

/**
 * AI 서술 조각 렌더러 (ia.md §4 슬롯 공통 규약 — "문장은 `text` 하나면 렌더된다.
 * 같이 오는 `segments[]`는 `text` 를 잘라 놓은 것일 뿐 […] 등락 색·강조가 필요할
 * 때만 순회한다", contracts C55).
 *
 * 이어 붙이면 `text` 와 정확히 일치한다는 보장이 있어 숫자를 정규식으로 찾아
 * 칠하지 않고 이 컴포넌트가 대신 순회한다.
 *
 * **`features/home` 의 `AiSegmentText` 와 `features/stocks` 의 `AnalysisSentence` 를
 * 여기로 합쳤다** (frontConvention §2). 둘은 같은 순회였고 stocks 판에만 있던 것이
 * 둘이다 — 조각이 없을 때의 `text` 폴백과 검정 면용 `onDark`. 둘 다 선택 props 로
 * 두어 브리핑(home)은 이전과 같이 조각만 그린다.
 *
 * **검정 면에서는 등락색을 쓰지 않는다.** `--color-stock-up`(#c93b3b) ·
 * `-down`(#2258c9)은 `--color-ai-surface`(#24272c) 위에서 대비가 3.0 · 2.4 로 AA 에
 * 못 미친다. 그 자리는 design.md §8.1 "AI Accent는 핵심 결과에만" 에 따라
 * `--color-ai-accent` 로 강조만 한다. 색만으로 등락을 말하지 않는다는 규약
 * (frontConvention §11)은 `value` 문자열에 부호가 이미 들어 있어 유지된다.
 */
export function AiSegmentText({
  segments,
  text,
  onDark = false,
}: AiSegmentTextProps) {
  if (segments.length === 0) {
    return text === undefined ? null : <>{text}</>;
  }

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.direction === null) {
          return <span key={index}>{segment.value}</span>;
        }

        const emphasis = onDark
          ? 'text-ai-accent'
          : DIRECTION_CLASS[segment.direction];

        return (
          <span
            key={index}
            className={`font-semibold tabular-nums ${emphasis}`}
          >
            {segment.value}
          </span>
        );
      })}
    </>
  );
}
