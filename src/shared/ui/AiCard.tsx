import { type ReactNode } from 'react';

/**
 * AI 슬롯의 공용 셸 (design.md §8.1 `AISummary` · §8.4 Common AI Header).
 *
 * 차콜 면 위 흰 글자다. 프로토타입 `.ai` 실측 —
 * `background:#24272C; border:1px solid #24272C; border-radius:16px; padding:18px`.
 * **면색만 `#343A42` 로 한 단계 올렸다** (2026-09-22 QA 피드백). 사유는
 * `styles/index.css` 의 `--color-ai-surface` 주석에 적었다.
 *
 * **이 셸이 AI 면의 기준이지만 전부는 아니다.** 포트폴리오 두 카드가 2026-09-22 에
 * 이쪽으로 모였다가 다시 갈라졌다 — `FinchReturnInsight`(수익률 분석)는 연한
 * 패널로, `DiagnosisAiCard`(AI 진단)는 치수가 달라 자기 셸로 갔다. 둘 다 그 파일
 * 주석에 사유와 되돌리는 법을 적어 두었고 **`design.md` §1·§4·§15 개정이 밀려
 * 있다.** AI 가 말하는 자리를 화면마다 다른 면으로 그리면 사용자가 그것을
 * 표식으로 읽지 못하므로, 새 슬롯은 이 셸에서 시작한다.
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

/**
 * 카드 밖에서도 쓴다 — 프로토타입의 브리핑 콜드 스타트 카드(`briefEmptyCard`)는
 * `.aihd` 없이 같은 글리프를 바로 놓는다. design.md §8.4 "AI Glyph 위치/크기 통일"
 * 이 요구하는 것이 이 한 정의를 나눠 쓰는 것이다.
 */
export function AiGlyph() {
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
  /**
   * 라벨 줄을 제목으로 내보낸다. 기본은 제목이 아니다 — 대부분의 슬롯에서 이
   * 라벨은 "이 덩어리는 AI 가 썼다" 는 표식이지 문서 구조가 아니다.
   *
   * **포트폴리오의 두 카드만 켠다.** 그쪽은 `성과`·`보유 종목` 같은 형제 `h2` 들과
   * 한 탭에 나란히 서 있어서, 이 카드만 제목이 없으면 훑어 읽는 순서에서 빠진다.
   * 흰 `Card` + `h2` 였던 것을 이 셸로 옮기며 잃지 않으려고 둔 값이다.
   *
   * **`onClick` 과 함께 쓰지 않는다.** 그때 셸이 `button` 으로 나가는데 `button`
   * 안에는 제목을 넣을 수 없다(phrasing content 만 허용). 켜도 무시한다.
   */
  labelAs?: 'h2' | 'h3';
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
  labelAs,
  headline,
  caption,
  children,
  onClick,
  className = '',
}: AiCardProps) {
  const clickable = onClick !== undefined;
  // 눌리는 카드는 button 이라 제목을 품을 수 없다. 위 `labelAs` 주석 참고.
  const LabelTag = clickable ? 'span' : (labelAs ?? 'span');

  // 안쪽 요소를 전부 span 으로 두는 이유 — 눌리는 카드는 button 으로 나가는데
  // button 안에 section·div 를 넣으면 HTML 이 깨진다. 프로토타입도 같은 이유로
  // `.aimain`·`.aimeta` 를 span 에 display 를 얹어 쓴다.
  const body = (
    <>
      {/*
       * 라벨 줄은 **흰색**이다 (2026-09-22 QA 피드백 — "소제목이 눈에 안 띈다").
       * 프로토타입 `.ailb` 는 rgba(255,255,255,.62) 였고 우리도 그 값
       * (`--color-ai-text-muted`)을 썼는데, 이 줄은 캡션이 아니라 **이 덩어리를
       * 누가 썼는지 말하는 표식**이라 흐릴 이유가 없었다. 13px 짜리 글자라 62%
       * 에서는 대비가 5.52 로 기준만 겨우 넘는다.
       *
       * **글리프의 이중 감쇠도 이 한 줄이 함께 고친다.** `AiGlyph` 는
       * `bg-current opacity-72` 라 이 래퍼의 글자색을 물려받는데, 62% 위에 72% 가
       * 또 곱해져 실효 45% 였다. 프로토타입이 적은 것은 **흰색의 72%** 이고
       * (`.aihd` 글리프 `opacity:.72`) `design.md` §3 도 "검정 Surface 위에서는
       * White Symbol 사용" 이라고 못박았다. 래퍼가 흰색이 되면 그 값이 된다.
       *
       * **`--color-ai-accent` 를 쓰지 않는다.** 검정 면에서 무언가를 띄우라고
       * 만든 색이 맞지만 `design.md` §4·§8.1 이 "핵심 결과에만" · "한 카드에 최대
       * 2~3곳" 으로 범위를 묶어 뒀다. 모든 AI 카드의 라벨에 미리 써 버리면 정작
       * 강조해야 할 숫자가 나왔을 때 쓸 것이 남지 않는다.
       *
       * 헤드라인과 색이 같아져도 위계는 남는다 — 이쪽은 `text-caption` 이고
       * 헤드라인은 `text-body-1`. 크기와 굵기가 순서를 말한다. 아래 `caption`
       * (기준 시각·메타)은 muted 그대로다. 그쪽은 정말로 캡션이다.
       */}
      <LabelTag className="mb-3.5 flex items-center gap-1.75 text-ai-text-primary">
        <AiGlyph />
        <span className="text-caption font-semibold tracking-[.02em]">
          {label}
        </span>
      </LabelTag>

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
