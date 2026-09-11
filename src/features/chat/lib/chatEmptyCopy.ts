/**
 * 빈 상태의 보조 문구와 추천 질문 넷. 프로토타입 `chatEmpty` 의 `chatContext` ·
 * `suggestions` 를 그대로 옮긴 것이다.
 *
 * **추천 질문의 근거는 프로토타입뿐이다.** design.md §7.15 는 초기 카피 두 줄만
 * 적고 추천 질문을 적지 않았다.
 *
 * ## 첫 추천(`… 지금 사도 괜찮을까요?`)을 그대로 둔 이유
 *
 * 프로토타입은 자기 가드레일 정규식(스크립트의 `GUARD` — `사도 괜|괜찮을까` 를
 * 포함한다)으로 이 문장을 막는다. 가드레일 응답을 시연하려고 일부러 넣은 추천으로 보인다.
 *
 * **우리 AI 는 이 질문을 막지 않는다.** 확인한 것 셋이다.
 *
 * - 입력단 가드(`ai/app/llm/guard/input.py`)는 프롬프트 인젝션 패턴 열 개뿐이고
 *   매매 조언 표현이 없다. 추천 넷을 `injection_hit` 에 그대로 넣어 전부 `None`
 *   (통과)인 것을 확인했다
 * - `ai/app/api/routes/chat.py` 가 422 `GUARDRAIL_BLOCKED` 를 내는 자리는
 *   `injection_hit` 하나다
 * - `ai/docs/prompt-policy.md` §5 는 이런 질문을 `advice_seeking` 으로 분류하고
 *   **"거절이 아니라 재구성"** 으로 처리한다고 못박았다. 그 절의 예시 질문이
 *   `지금 삼성전자 더 사야 할까?` 로 이 추천과 같은 꼴이고, 올바른 응답으로
 *   "매수 여부는 말씀드릴 수 없습니다" + 판단 재료를 제시하는 답을 든다.
 *   네 갈래 입력 분류 자체는 아직 구현 전이다(`advice_seeking` 참조 0건)
 *
 * 막히는 것이 아니라 재구성되는 질문이라 프로토타입 문구를 바꾸지 않았다.
 * 출력단 가드(`guard/output.py` 7번 금지 표현)는 AI 가 `사세요` 로 답하는 것을
 * 막는 검사이지 사용자 질문을 막는 검사가 아니다.
 */

/** 종목 맥락이 없을 때. 프로토타입 `chatCtx` 가 `null` 인 갈래다. */
const NO_CONTEXT_COPY = {
  subCopy: '내 보유 종목과 거래 내역을 보고 답해요.',
  suggestions: [
    '오늘 내 종목에 무슨 일이 있었어?',
    '최근 수익률이 왜 떨어졌어?',
    '내 포트폴리오에서 확인할 위험이 있어?',
    '이 뉴스가 무슨 뜻이에요?',
  ],
} as const;

export type ChatEmptyCopy = {
  /** `\n` 이 들어간다 — 그리는 쪽이 `whitespace-pre-line` 을 줘야 한다. */
  subCopy: string;
  suggestions: readonly string[];
};

/**
 * 목적격 조사(을/를)를 받침으로 고른다.
 *
 * 프로토타입은 `${chatCtx}를` 로 `를` 를 박아 뒀지만 받침으로
 * 끝나는 종목명이 흔해서 `한국전력를` 가 된다. 종목명을 못 찾아 `이 종목` 으로
 * 떨어질 때는 `이 종목를` 라 더 눈에 띈다.
 *
 * 한글 음절은 U+AC00 부터 종성 28개가 한 묶음으로 반복하므로 나머지로 받침을
 * 안다. 마지막 글자가 한글 음절이 아니면(영문·숫자로 끝나는 종목명) 읽는 소리를
 * 알 수 없어 판단하지 않고 `를` 로 둔다 — 프로토타입과 같은 값이다.
 */
function withObjectParticle(word: string): string {
  const lastChar = word.at(-1);
  const code = lastChar === undefined ? 0 : (lastChar.codePointAt(0) ?? 0);
  if (code < 0xac00 || code > 0xd7a3) {
    return `${word}를`;
  }
  return `${word}${(code - 0xac00) % 28 === 0 ? '를' : '을'}`;
}

/**
 * `stockLabel` 이 `null` 이면 맥락 없는 갈래다. 종목 맥락으로 들어왔는데 종목명을
 * 모를 때는 호출부가 `이 종목` 같은 대체 라벨을 넘긴다 — 여기서 정하지 않는다.
 */
export function chatEmptyCopy(stockLabel: string | null): ChatEmptyCopy {
  if (stockLabel === null) {
    return NO_CONTEXT_COPY;
  }

  return {
    subCopy: `${withObjectParticle(stockLabel)} 보다가 들어오셨네요.\n궁금한 것부터 물어보세요.`,
    suggestions: [
      `${stockLabel} 지금 사도 괜찮을까요?`,
      `${stockLabel} 위험 요인이 뭐야?`,
      '내 포트폴리오 좀 봐주세요',
      '확인해야 할 위험이 있어?',
    ],
  };
}
