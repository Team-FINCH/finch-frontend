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
 *
 * **원래 `shared/ui/AiSegmentText.tsx` 안에 있었다** (FINCH-315). 종목 분석·
 * 수익률 분석·진단 세 슬롯이 그 컴포넌트로 각주를 지워 왔는데, 채팅 답변 말풍선도
 * 같은 표기를 그대로 노출하는 문제(FINCH-315)가 나서 여기로 옮겨 둘이
 * 공유한다. 새로 짜지 않고 옮긴 것이라 이 세 함수의 동작은 옮기기 전과 한 글자도
 * 다르지 않다.
 */
const CITATION_MARKER = /\[\^cit_[A-Za-z0-9_-]+\]|\^cit_[A-Za-z0-9_-]+/g;

/**
 * 각주를 지운 뒤 그 자리에 남는 군더더기 공백을 함께 걷어낼지 판단하는 문자들.
 * 각주 앞이 공백이고 뒤가 이것들(또는 문장 끝)이면 앞 공백까지 지운다 —
 * `…이에요 [^cit_1].` → `…이에요.`, `…이에요 [^cit_1] 그리고` → `…이에요 그리고`.
 */
const MARKER_TRAILING = /[\s.,;:!?)\]}」』”'"·…]/;

/** 지울 구간 `[start, end)`. `full` 문자열 기준 오프셋이다. */
export type MarkerRange = readonly [start: number, end: number];

/**
 * 문자열 안의 각주 구간을 앞에서 뒤로 훑어 모은다. 구간은 정렬돼 있고 겹치지 않는다.
 *
 * 공백 흡수는 뒤가 아니라 **앞**을 먹는다. 뒤를 먹으면 `…이에요[^cit_1] 그리고` 가
 * `…이에요그리고` 로 붙는다. 각주가 문장 맨 앞에 온 때만 먹을 앞이 없어 뒤를 먹는다 —
 * 안 그러면 서술이 공백으로 시작한다.
 */
export function citationMarkerRanges(full: string): MarkerRange[] {
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
export function cutRanges(
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
 * 문자열 하나에서 근거 각주 표기를 통째로 걷어낸다. 조각(`segments`) 없이 문자열
 * 하나만 다루는 자리에서 쓴다 — `AiSegmentText` 의 `text` 폴백, 채팅 답변 본문
 * (`features/chat/model/chatMessages.ts`, `pages/ChatPage.tsx`)이 그 자리다.
 */
export function stripCitationMarkers(value: string): string {
  const ranges = citationMarkerRanges(value);

  return ranges.length === 0 ? value : cutRanges(value, 0, ranges);
}
