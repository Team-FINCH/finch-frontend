/**
 * 채팅 빈 상태 — 로고 · 두 줄 헤드라인 · 맥락 보조 문구 · 추천 질문 넷.
 * 프로토타입 `isChat` 안의 `chatEmpty` 묶음이다.
 *
 * **`shared/ui/EmptyState` 를 쓰지 않는다.** 그쪽은 프로토타입의 다른 묶음(`.est`)
 * 이고 치수와 위계가 다르다 — 일러스트 120px/불투명도 .16 · 제목 17px/600 ·
 * 설명 폭 270px 이다. 여기는 로고 140px/불투명도 .18 · 헤드라인 `.t2`(22px/700) ·
 * 설명 폭 제한 없음이고, 아래에 눌리는 목록이 하나 더 붙는다. 넘겨서 덮어쓸 값이
 * 거의 전부라 같은 컴포넌트로 묶을 것이 없다.
 *
 * 프로토타입 실측값:
 * - 묶음 — `text-align:center`, `padding:56px 4px 0`
 * - 로고 — `width:140px`, `opacity:.18`
 * - 헤드라인 — `.t2`(22px/30px/700), 위 20px, `<br>` 로 두 줄
 * - 보조 문구 — `.b2`(15px), 위 10px, `white-space:pre-line`, `line-height:23px`
 * - 추천 목록 — `.sec`(위 32px) 안에 `.row` 를 `min-height:56px` 로 줄여 쓴다.
 *   행마다 `.b1` 문구 + `.mu` 18px `›`, 행 **뒤마다** `.dv` 구분선(마지막 행 뒤에도
 *   있다 — `sc-for` 가 행과 구분선을 한 쌍으로 반복한다)
 *
 * 로고는 `public/brand/finch-logo.png` 다. 히어로 화면(FINCH-230)이 넣어 둔
 * 것을 그대로 쓴다. `alt` 를 비운 이유 — 바로 아래 헤드라인이 `FINCH AI` 를 글자로
 * 읽어 주므로 같은 이름을 두 번 읽히지 않는다.
 */
type ChatEmptyStateProps = {
  /** `\n` 이 들어 있다 (`features/chat/lib/chatEmptyCopy.ts`). */
  subCopy: string;
  suggestions: readonly string[];
  /** 누르면 그 문구를 그대로 보낸다. 프로토타입 `s.ask` 와 같다. */
  onAsk: (text: string) => void;
};

export function ChatEmptyState({
  subCopy,
  suggestions,
  onAsk,
}: ChatEmptyStateProps) {
  return (
    <div>
      <div className="px-1 pt-14 text-center">
        {/* 폭·높이 속성은 원본 크기다 — 이미지가 오기 전에 자리를 잡아 준다. */}
        <img
          src="/brand/finch-logo.png"
          alt=""
          width={1198}
          height={681}
          className="mx-auto h-auto w-35 opacity-[0.18]"
        />
        <p className="mt-5 text-title-2 text-text-primary">
          내 투자 맥락을 아는
          <br />
          FINCH AI와 이야기해보세요
        </p>
        <p className="mt-2.5 text-body-2 leading-[23px] whitespace-pre-line text-text-secondary">
          {subCopy}
        </p>
      </div>

      <div className="mt-8">
        {suggestions.map((suggestion) => (
          <div key={suggestion}>
            <button
              type="button"
              onClick={() => onAsk(suggestion)}
              className="flex min-h-14 w-full items-center gap-3 rounded-12 py-3.5 text-left transition-colors duration-(--motion-fast) ease-standard active:bg-primary-soft"
            >
              <span className="flex-1 text-body-1 text-text-primary">
                {suggestion}
              </span>
              <span
                aria-hidden="true"
                className="flex-none text-[18px] leading-none text-text-muted"
              >
                ›
              </span>
            </button>
            <div className="h-px bg-border" aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}
