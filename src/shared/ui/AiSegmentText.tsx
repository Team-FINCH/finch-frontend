import { type AiSegment } from '@/shared/types/ai/envelope';

/** 등락색. `direction` 이 `up`/`down` 일 때만 쓴다 (국내 관례 — 상승 적색·하락 청색). */
const DIRECTION_CLASS: Record<'up' | 'down', string> = {
  up: 'text-stock-up',
  down: 'text-stock-down',
};

/**
 * 서술 안의 근거 각주 표기 (AI 명세 §2.4 · §12 Citation, `envelope.ts` 의
 * `AiCitationSchema` 주석 — "서술 안에서 `[^cit_2]` 형태로 참조한다").
 *
 * **두 형태를 다 받는다.** 정본은 대괄호가 있는 `[^cit_2]` 이고, 맨몸 `^cit_2` 는
 * 관대하게 받아만 준다. 실제 응답 로그에 대괄호가 빠진 것이 섞여 나오는데 AI 쪽이
 * 고치는 중이라(인프라 실측, 2026-09-10) 어느 쪽이 오든 화면에 문자 그대로 새지
 * 않게 하는 것이 지금 필요한 것이다. 정본만 받으면 고쳐지기 전까지 `^cit_5` 가
 * 그대로 보이고, 맨몸만 받으면 정본이 왔을 때 대괄호 껍데기 `[]` 가 남는다.
 * **AI 쪽이 정본으로 통일한 것이 확인되면 뒤쪽 갈래를 지운다** — 관대한 쪽을
 * 오래 두면 서버가 어긋난 것을 아무도 눈치채지 못한다.
 *
 * 대괄호 갈래를 먼저 둔 것이 중요하다. `[^cit_2]` 는 맨몸 갈래도 부분으로 맞으므로
 * 순서가 바뀌면 대괄호만 남는다.
 */
const CITATION_MARKER = /\[\^cit_[A-Za-z0-9_-]+\]|\^cit_[A-Za-z0-9_-]+/g;

/**
 * 각주를 지운 뒤 그 자리에 남는 군더더기 공백을 함께 걷어낼지 판단하는 문자들.
 * 각주 앞이 공백이고 뒤가 이것들(또는 문장 끝)이면 앞 공백까지 지운다 —
 * `…이에요 [^cit_1].` → `…이에요.`, `…이에요 [^cit_1] 그리고` → `…이에요 그리고`.
 */
const MARKER_TRAILING = /[\s.,;:!?)\]}」』”'"·…]/;

/** 지울 구간 `[start, end)`. `full` 문자열 기준 오프셋이다. */
type MarkerRange = readonly [start: number, end: number];

/**
 * 문자열 안의 각주 구간을 앞에서 뒤로 훑어 모은다. 구간은 정렬돼 있고 겹치지 않는다.
 *
 * 공백 흡수는 뒤가 아니라 **앞**을 먹는다. 뒤를 먹으면 `…이에요[^cit_1] 그리고` 가
 * `…이에요그리고` 로 붙는다. 각주가 문장 맨 앞에 온 때만 먹을 앞이 없어 뒤를 먹는다 —
 * 안 그러면 서술이 공백으로 시작한다.
 */
function citationMarkerRanges(full: string): MarkerRange[] {
  const ranges: MarkerRange[] = [];

  for (const match of full.matchAll(CITATION_MARKER)) {
    const start = match.index;
    const end = start + match[0].length;
    const previous = full[start - 1] ?? '';
    const next = full[end] ?? '';

    if (/\s/.test(previous) && (next === '' || MARKER_TRAILING.test(next))) {
      ranges.push([start - 1, end]);
      continue;
    }

    ranges.push([start, start === 0 && /\s/.test(next) ? end + 1 : end]);
  }

  return ranges;
}

/**
 * `value` 에서 구간들과 겹치는 부분을 잘라낸다. `offset` 은 `value` 가 원본 문자열의
 * 몇 번째 글자에서 시작하는지다.
 *
 * **조각 하나가 아니라 이어 붙인 문자열을 기준으로 구간을 잡는 이유**는, 각주가
 * 조각 경계에 걸쳐 들어올 수 있기 때문이다. 조각마다 따로 정규식을 돌리면 `[^cit_`
 * 와 `1]` 로 갈린 각주를 양쪽 다 놓쳐 화면에 그대로 샌다.
 */
function cutRanges(
  value: string,
  offset: number,
  ranges: readonly MarkerRange[],
): string {
  let result = '';
  let cursor = 0;

  for (const [start, end] of ranges) {
    const from = Math.max(0, start - offset);
    const to = Math.min(value.length, end - offset);

    // 이 조각과 겹치지 않는 구간이다.
    if (to <= from) {
      continue;
    }

    result += value.slice(cursor, from);
    cursor = to;
  }

  return result + value.slice(cursor);
}

/**
 * 서술 문자열에서 근거 각주 표기를 걷어낸다.
 *
 * 조각(`segments`)이 아닌 **한 덩어리 문자열**을 그리는 자리에서 쓴다. 지금은 조각이
 * 없을 때의 `text` 폴백 하나뿐이라 이 파일 안에 둔다. AI 서술은 섹션 본문 말고도 여러
 * 곳에 문자열로 오므로(섹션 제목·채팅 답변 등) 그쪽까지 각주를 걷어내기로 하면 그때
 * `shared/lib` 로 옮긴다 — 컴포넌트 파일에서 함수를 내보내면 `react-refresh` 가 막는다.
 */
function stripCitationMarkers(value: string): string {
  const ranges = citationMarkerRanges(value);

  return ranges.length === 0 ? value : cutRanges(value, 0, ranges);
}

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
 *
 * ## 근거 각주는 지운다
 *
 * 서술 안의 `[^cit_2]` 를 화면에 내지 않는다. **번호로도 뱃지로도 그리지 않고
 * 지우는 것이 지금의 기본값이다.** 근거가 남지 않는 것이 아니다 — 근거는 응답
 * 블록 최하단 캡션 한 줄(`… 기준 · 공시 · 뉴스 · 자체계산`)이 이미 지고 있다.
 *
 * 이유는 셋이다.
 *
 * - **가리킬 곳이 없다.** ia.md §4 는 "각주를 눌러 목록으로 보내는 것까지만 한다"
 *   고 적었지만, 그 뒤 근거 표기가 개별 출처 줄에서 **종류 이름만 나열하는 캡션
 *   한 줄**로 바뀌었다(design.md §9 · `StockAiTab` 의 `citationTypeLabels`).
 *   `cit_2` 한 건에 대응하는 줄이 화면에 더는 없으므로 각주 번호는 아무 데도 닿지
 *   못한다. 닿지 않는 번호는 없는 편이 낫다
 * - **design.md §9 가 막는 쪽에 가깝다.** "뱃지 · 링크 아이콘(↗) · 점선 테두리 ·
 *   개별 출처 링크를 쓰지 않는다. 종류를 나열만 하고 개별 출처로 링크하지 않는다."
 *   위 첨자 번호는 링크가 아니어도 개별 출처를 가리키는 표기다
 * - **모르는 id 를 가를 필요가 없어진다.** 가드레일의 반려 사유가 `used_citations
 *   에 존재하지 않는 근거` 라, `citations[]` 에 없는 id 가 화면까지 올라올 수 있다.
 *   번호를 그리기로 하면 그때 "몇 번으로 셀지" 를 정해야 하고 답이 없다. 전부
 *   지우면 아는 id 와 모르는 id 가 같은 결과가 되어 이 갈래 자체가 사라진다.
 *   사용자에게 `[^cit_5]` 는 어차피 뜻이 없다
 *
 * **모양은 아직 정해지지 않았다.** 위 첨자 번호 · 작은 뱃지 · 지우기 중 어느 것이
 * 될지는 시안이 필요하고, 정해지면 이 자리에 얹는다. 그때 번호를 그리기로 하면
 * `citations[]` 를 함께 받아 아는 id 만 번호를 매기고 모르는 id 는 지운다.
 */
export function AiSegmentText({
  segments,
  text,
  onDark = false,
}: AiSegmentTextProps) {
  if (segments.length === 0) {
    return text === undefined ? null : <>{stripCitationMarkers(text)}</>;
  }

  // 각주 구간은 조각 하나가 아니라 이어 붙인 문자열에서 잡는다 (cutRanges 주석).
  const full = segments.map((segment) => segment.value).join('');
  const ranges = citationMarkerRanges(full);
  const values: string[] = [];
  let at = 0;

  for (const segment of segments) {
    values.push(
      ranges.length === 0
        ? segment.value
        : cutRanges(segment.value, at, ranges),
    );
    at += segment.value.length;
  }

  return (
    <>
      {segments.map((segment, index) => {
        const value = values[index] ?? '';

        // 각주만 있던 조각은 그리지 않는다. 빈 <span> 이 남으면 뒤 조각과의 간격이
        // 틀어질 수 있다.
        if (value === '') {
          return null;
        }

        if (segment.direction === null) {
          return <span key={index}>{value}</span>;
        }

        const emphasis = onDark
          ? 'text-ai-accent'
          : DIRECTION_CLASS[segment.direction];

        return (
          <span
            key={index}
            className={`font-semibold tabular-nums ${emphasis}`}
          >
            {value}
          </span>
        );
      })}
    </>
  );
}
