/**
 * 검색 입력 (프로토타입 `isSearch` 블록의 입력 행).
 *
 * 실측값 — 높이 42px · 반경 12px(`--radius-12`) · 1px 테두리 · 흰 면 ·
 * 왼쪽 여백 38px(돋보기 자리) · 글자 15px(`text-body-2`).
 *
 * 돋보기는 프로토타입이 `⌕`(U+2315) 문자를 절대배치로 얹는다. 아이콘 폰트를
 * 새로 들이지 않으려고 그대로 옮겼고, 뜻은 `placeholder` 와 라벨이 말하므로
 * 보조 기술에는 숨긴다.
 *
 * `type="search"` 를 쓰지 않는다. 브라우저 기본 ✕ 버튼이 iOS 와 안드로이드에서
 * 모양이 갈리고, 최근 검색어 칩의 ✕ 와 뜻이 겹쳐 보인다.
 */
type StockSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
};

export function StockSearchField({ value, onChange }: StockSearchFieldProps) {
  return (
    <div className="relative flex items-center">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-[15px] text-body-2 leading-none text-text-muted"
      >
        ⌕
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="종목명 또는 종목코드"
        aria-label="종목 검색"
        enterKeyHint="search"
        autoComplete="off"
        className="h-[42px] w-full rounded-12 border border-border bg-surface pr-4 pl-[38px] text-body-2 text-text-primary outline-none placeholder:text-text-muted focus:border-border-strong"
      />
    </div>
  );
}
