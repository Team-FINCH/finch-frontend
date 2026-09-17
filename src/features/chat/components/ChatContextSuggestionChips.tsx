/**
 * 대화가 이미 있을 때 입력창 위에 뜨는 추천 칩 한 줄 (FINCH-286).
 * `messages.length > 0` 일 때 `ChatPage` 가 그린다 — 진입 화면을 가리지 않는다
 * (FINCH-323, 사용자 결정 2026-09-17). 문구는 진입 맥락별로
 * `chatEmptyCopy` 가 이미 가른다.
 *
 * **프로토타입에 이 자리는 없다.** `ChatEmptyState` 의 추천 목록(행 높이 56px, 행마다
 * 구분선)을 복원된 대화 위에 그대로 얹으면 224px 로 화면 절반을 덮어서, 새로 만든
 * 자리다(사용자 승인, 2026-09-16). 모양은 탐색 화면의 `RecentKeywordChips` 를
 * 그대로 따른다 — 반경(`rounded-tag`)·테두리(`border-border`)·면(`bg-surface-soft`)을
 * 새로 정하지 않고 가져와서 화면 사이에 칩 관용이 두 벌 생기지 않게 한다. 높이만
 * 28px 대신 32px 로 뒀다 — 문구가 검색어보다 길어 28px 이면 글자가 위아래로 눌린다.
 *
 * 문구는 `chatEmptyCopy(stockLabel).suggestions` 의 앞 둘(뉴스·위험 요인)만 받는다 —
 * 호출부(`ChatPage`)가 뒤 둘(포트폴리오·위험 확인, 종목과 무관)을 잘라 넘긴다.
 */
type ChatContextSuggestionChipsProps = {
  suggestions: readonly string[];
  /** 답을 기다리는 동안 못 누르게 한다 — `ChatComposer` 의 `disabled` 와 같은 관용. */
  disabled: boolean;
  /** 누르면 그 문구를 그대로 보낸다. 빈 상태의 `onAsk` 와 같다. */
  onPick: (text: string) => void;
};

export function ChatContextSuggestionChips({
  suggestions,
  disabled,
  onPick,
}: ChatContextSuggestionChipsProps) {
  return (
    <div className="scroll-touch -mx-6.5 overflow-x-auto px-6.5 pb-3">
      <ul className="flex w-max gap-1.5">
        {suggestions.map((suggestion) => (
          <li key={suggestion} className="flex-none">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(suggestion)}
              className="flex h-8 items-center rounded-tag border border-border bg-surface-soft px-3 text-caption whitespace-nowrap text-text-secondary transition-colors duration-(--motion-fast) ease-standard active:bg-primary-soft disabled:opacity-50"
            >
              {suggestion}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
