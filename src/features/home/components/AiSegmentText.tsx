import type { AiSegment } from '@/shared/types/ai/envelope';

const DIRECTION_CLASS: Record<'up' | 'down', string> = {
  up: 'text-stock-up',
  down: 'text-stock-down',
};

/**
 * AI 서술 조각 렌더러 (ia.md §4 슬롯 공통 규약 — "문장은 `text` 하나면 렌더된다.
 * 같이 오는 `segments[]`는 `text` 를 잘라 놓은 것일 뿐 […] 등락 색·강조가 필요할
 * 때만 순회한다").
 *
 * 이어 붙이면 `text` 와 정확히 일치한다는 보장이 있어 숫자를 정규식으로 찾아
 * 칠하지 않고 이 컴포넌트가 대신 순회한다.
 */
export function AiSegmentText({ segments }: { segments: AiSegment[] }) {
  return (
    <>
      {segments.map((segment, index) => {
        if (segment.direction === null) {
          return <span key={index}>{segment.value}</span>;
        }
        return (
          <span
            key={index}
            className={`font-semibold tabular-nums ${DIRECTION_CLASS[segment.direction]}`}
          >
            {segment.value}
          </span>
        );
      })}
    </>
  );
}
