/**
 * 빈 상태의 보조 문구와 추천 질문 넷. 프로토타입 `chatEmpty` 의 `chatContext` ·
 * `suggestions` 를 그대로 옮긴 것이다.
 *
 * **추천 질문의 근거는 프로토타입뿐이다.** design.md §7.15 는 초기 카피 두 줄만
 * 적고 추천 질문을 적지 않았다.
 *
 * ## 첫 추천(`… 최근 뉴스 뭐 있어?`)을 바꾼 이유 (FINCH-280)
 *
 * 프로토타입 원문은 `… 지금 사도 괜찮을까요?` 였다. 넷 중 이 하나만 투자 판단을
 * 직접 묻는 질문이라 `ai/docs/prompt-policy.md` §5 의 `advice_seeking` 분류에
 * 걸린다 — 그 절의 예시 질문(`지금 삼성전자 더 사야 할까?`)과 같은 꼴이고,
 * 올바른 응답은 "매수 여부는 말씀드릴 수 없습니다" + 판단 재료 제시로
 * **거절이 아니라 재구성**이다. 빈 상태의 추천 질문은 눌러 바로 보내는 자리인데,
 * 넷 중 하나만 AI 가 직답을 피하고 재구성부터 하는 자리가 되면 나머지 셋과
 * 체감이 달라진다. 나머지 셋(위험 요인·포트폴리오 확인)은 이 분류에 걸리지
 * 않는다 — `advice_seeking` 은 매수·매도 판단을 직접 묻는 질문에만 해당한다.
 *
 * 바꾼 질문은 종목 맥락에서 바로 쓸 수 있는 정보 조회형이라 같은 문제가 없다.
 *
 * ## 넷째 추천(`이 뉴스가 무슨 뜻이에요?`)을 바꾼 이유 (FINCH-323)
 *
 * 이 갈래는 종목 맥락도 뉴스 맥락도 없이 들어오는 자리라 `이 뉴스` 가 가리키는
 * 것이 화면 어디에도 없다 — 눌러 보내면 AI 도 무엇을 묻는지 알 수 없다. 위
 * `advice_seeking` 항목(280)과 같은 종류의 문제(선례를 따른 것)이지만 원인은
 * 다르다 — 280 은 질문의 **분류**가 걸렸고, 이번은 지시 대상이 아예 없다.
 *
 * `내 자산이 어떻게 나뉘어 있어?` 로 바꿨다. 앞 셋(오늘 일어난 일·수익률
 * 원인·위험)과 겹치지 않는 축 — **구성** — 을 채우고, 보유 목록과 비중으로
 * 답할 수 있어 우리 데이터로 커버되며, 매수·매도 판단을 묻지 않아
 * `ai/docs/prompt-policy.md` §5 의 `advice_seeking` 에도 걸리지 않는다.
 */

/** 종목 맥락이 없을 때. 프로토타입 `chatCtx` 가 `null` 인 갈래다. */
const NO_CONTEXT_COPY = {
  subCopy: '내 보유 종목과 거래 내역을 보고 답해요.',
  suggestions: [
    '오늘 내 종목에 무슨 일이 있었어?',
    '최근 수익률이 왜 떨어졌어?',
    '내 포트폴리오에서 확인할 위험이 있어?',
    '내 자산이 어떻게 나뉘어 있어?',
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
      `${stockLabel} 최근 뉴스 뭐 있어?`,
      `${stockLabel} 위험 요인이 뭐야?`,
      '내 포트폴리오 좀 봐주세요',
      '확인해야 할 위험이 있어?',
    ],
  };
}
