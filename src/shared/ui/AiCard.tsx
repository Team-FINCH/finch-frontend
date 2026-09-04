import { type ReactNode } from 'react';

/**
 * AI 슬롯의 공용 셸 (design.md §8.1 `AISummary` · §8.4 Common AI Header).
 *
 * 검정 면 위 흰 글자다. 프로토타입 `.ai` 실측 —
 * `background:#24272C; border:1px solid #24272C; border-radius:16px; padding:18px`.
 *
 * **셸만 공용화한다.** AI 슬롯은 13곳 넘게 반복되지만 본문 구조가 슬롯마다 다르다
 * (분석=위험 목록, 진단=막대, 점검=before/after 그리드, 채팅=말풍선).
 * 그래서 머리(글리프+라벨)·헤드라인·하단 캡션만 여기서 정하고 본문은 `children` 으로 받는다.
 *
 * 여기서 하지 않는 것 — 근거 목록(citations)과 피드백은 이 셸의 밖, 응답 블록 최하단에
 * 온다 (ia.md §4 · design.md §7.6). 셸 안에 넣으면 검정 면 위에 갇힌다.
 *
 * design.md §8.1 이 금지한 것을 셸이 만들 수 없게 두었다 — Divider 없음,
 * Bullet List 없음, Full-width Button 없음. 본문 슬롯이 그 규칙을 지킬 몫은 남는다.
 */

/**
 * 공통 AI 글리프. design.md §3 이 "화면마다 다른 AI 아이콘을 임의로 혼용하지 않는다",
 * §8.4 가 "AI Glyph 위치/크기 통일" 이라고 못박아서 props 로 받지 않고 여기서 고정한다.
 *
 * 크기 17px 과 불투명도 .72 는 프로토타입 실측값이다 (`.aihd` 안의 글리프 이미지가
 * `width:17px;height:17px;object-fit:contain;opacity:.72`).
 * **문서와 다름** — design.md §3 Scale 은 "AI Inline / Header 28~36px" 이라고 적었지만
 * 프로토타입의 헤더 글리프는 17px 이다. 프로토타입을 따랐다.
 *
 * 브랜드 심볼(`public/brand/finch-symbol.svg`)은 검정 채움이라 검정 면 위에서 보이지 않는다.
 * 그래서 이미지로 얹지 않고 마스크로 써서 currentColor 로 칠한다. 프로토타입도 탭바
 * AI 버튼(`.tabai::before`)에서 같은 방법을 쓴다. design.md §3 "검정 Surface 위에서는
 * White Symbol 사용" 을 별도 흑백 에셋 없이 만족한다.
 */
const GLYPH_MASK = 'url(/brand/finch-symbol.svg) center / contain no-repeat';

function AiGlyph() {
  return (
    <span
      aria-hidden="true"
      className="size-4.25 flex-none bg-current opacity-72"
      style={{ mask: GLYPH_MASK, WebkitMask: GLYPH_MASK }}
    />
  );
}

type AiCardProps = {
  /** 기능 라벨. `AI 브리핑` · `AI 진단` · `AI 종목 분석` 등 (design.md §8.4). */
  label: string;
  /** 핵심 결론. 최대 2줄. 줄바꿈은 `\n` 으로 넣는다 (프로토타입이 `pre-line` 이다). */
  headline?: ReactNode;
  /** 하단 캡션. 기준 시각·핵심 메타 최대 2개 (design.md §8.1). */
  caption?: ReactNode;
  /** 슬롯마다 다른 본문. */
  children?: ReactNode;
  /**
   * 넘기면 카드 전체가 눌린다 (design.md §8.1 "Card 전체 Clickable").
   * 프로토타입에서 셰브런(›)이 붙은 카드는 예외 없이 눌리는 카드라 셰브런을
   * 따로 받지 않고 이 값에서 끌어낸다.
   */
  onClick?: () => void;
  className?: string;
};

export function AiCard({
  label,
  headline,
  caption,
  children,
  onClick,
  className = '',
}: AiCardProps) {
  const clickable = onClick !== undefined;

  // 안쪽 요소를 전부 span 으로 두는 이유 — 눌리는 카드는 button 으로 나가는데
  // button 안에 section·div 를 넣으면 HTML 이 깨진다. 프로토타입도 같은 이유로
  // `.aimain`·`.aimeta` 를 span 에 display 를 얹어 쓴다.
  const body = (
    <>
      <span className="mb-3.5 flex items-center gap-1.75 text-ai-text-muted">
        <AiGlyph />
        <span className="text-caption font-semibold tracking-[.02em]">
          {label}
        </span>
      </span>

      {headline !== undefined && (
        <span className="block text-body-1 font-semibold whitespace-pre-line text-ai-text-primary">
          {headline}
        </span>
      )}

      {children}

      {caption !== undefined && (
        <span className="mt-3.75 flex items-center gap-2.5 text-ai-text-muted">
          <span className="min-w-0 flex-1 text-caption">{caption}</span>
          {clickable && (
            <span aria-hidden="true" className="flex-none text-body-2">
              ›
            </span>
          )}
        </span>
      )}
    </>
  );

  const shell = `block w-full rounded-ai border border-ai-border bg-ai-surface p-4.5 text-left ${className}`;

  if (clickable) {
    return (
      <button type="button" onClick={onClick} className={shell}>
        {body}
      </button>
    );
  }

  return <section className={shell}>{body}</section>;
}
