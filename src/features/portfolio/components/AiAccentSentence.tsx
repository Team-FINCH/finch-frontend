import { type AiSection } from '@/shared/types/ai/envelope';

/**
 * 검정 AI 카드의 **결론 한 문장** (FINCH-341).
 *
 * 포트폴리오의 두 AI 카드(`DiagnosisAiCard`·`FinchReturnInsight`)가 같이 쓴다.
 * 전에는 둘이 서로 다른 방식으로 문장을 칠했다.
 *
 * | | 진단 카드 | FINCH 카드 |
 * | --- | --- | --- |
 * | 칠하는 것 | 첫 `metric` 조각 하나 | `direction` 이 있는 조각 **전부** |
 * | 화면에서 | 숫자 둘 중 하나만 금색 | 숫자 셋이 모두 금색 |
 *
 * 나란히 놓으면 같은 종류의 카드가 다른 규칙을 따르는 것으로 보였다(사용자 지적).
 * **`design.md` 가 적어 둔 한 줄 규칙이 「AI Accent = 검정 위 핵심 하나」다**
 * (§4 요약 박스 · §15 에 두 번). `최대 2~3곳` 은 상한이지 권장이 아니다.
 * 그래서 좁은 쪽(하나)으로 맞춘다.
 *
 * ## `AiSegmentText` 를 쓰지 않는 이유
 *
 * 그쪽은 `direction` 이 있는 조각만 칠한다. **진단 응답의 수치에는 `direction` 이
 * 없다** — 집중도 비중은 오른 것도 내린 것도 아니라서다. 그 컴포넌트를 쓰면 진단
 * 카드의 문장이 통째로 흰 글자가 된다.
 *
 * 여기는 `type === 'metric'` 으로 고른다. 조각이 스스로 "나는 수치다" 라고 말하는
 * 값이라 등락 여부와 무관하다.
 *
 * **`AiSegmentText` 는 그대로 둔다.** 종목 상세 AI 탭이 본문 여러 단락에서 쓰고
 * 있고, 그쪽은 결론 한 문장이 아니라 긴 서술이라 규칙이 같을 이유가 없다.
 *
 * ## 색을 바꾸지 않고 첫 조각만 고른다
 *
 * 첫 `metric` 이 그 문장이 말하려는 값이다. 뒤따르는 수치는 부연이라 같이 칠하면
 * 무엇이 결론인지 다시 흐려진다.
 *
 * 조각이 없으면(생성은 됐는데 `segments` 가 빈 경우) `text` 를 그대로 그린다 —
 * 이어 붙이면 `text` 와 일치한다는 보장(C55)의 반대 방향 폴백이다.
 */
export function AiAccentSentence({ summary }: { summary: AiSection }) {
  if (summary.segments.length === 0) {
    return <>{summary.text}</>;
  }

  const accentIndex = summary.segments.findIndex(
    (segment) => segment.type === 'metric',
  );

  return (
    <>
      {summary.segments.map((segment, index) =>
        index === accentIndex ? (
          <span key={index} className="font-bold text-ai-accent tabular-nums">
            {segment.value}
          </span>
        ) : (
          <span key={index}>{segment.value}</span>
        ),
      )}
    </>
  );
}
