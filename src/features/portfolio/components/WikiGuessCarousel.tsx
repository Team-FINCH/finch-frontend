import { useState } from 'react';

import { type WikiFact } from '@/shared/types/ai/wiki';
import { Button } from '@/shared/ui/Button';

/**
 * "FINCH가 이해한 투자 기준" — 확인이 필요한 추측 카드 (프로토타입 `.gwrap`,
 * FINCH-154).
 *
 * 전에는 `sc-for` 로 모두 나열했는데 MR !110 이 **한 장씩 넘기는 캐러셀**로 바꿨다.
 * 확인해야 할 항목이 여러 개일 때 세로로 쌓이면 "다 읽어야 하는 목록"으로 보이는데,
 * 한 장씩이면 "지금 이것 하나"로 읽힌다.
 *
 * 항목이 하나면 이동 버튼·숫자 줄·겹친 그림자가 모두 사라진다 — 넘길 것이 없는데
 * 넘기는 장치를 두면 더 있는 줄 알게 된다.
 *
 * 강조색 `#8A6B3D` 은 프로토타입 실측이다. AI 추측을 "확인 필요"로 표시하는 이
 * 자리에만 쓰이고 토큰이 없어 값을 직접 적었다.
 */
export const WIKI_ACCENT_COLOR = '#8A6B3D';
const ACCENT = WIKI_ACCENT_COLOR;

/**
 * 프로토타입 `.gnav` — 24px 정사각 · 반경 8px.
 * 양 끝에서 흐려지지 않는다 — 프로토타입 `guessPrev`/`guessNext` 가 `% n` 으로
 * 마지막↔처음을 잇는다(proto L4140-4143).
 */
const NAV_BUTTON_CLASS =
  'flex size-6 items-center justify-center rounded-lg border border-border ' +
  'bg-surface text-[14px] leading-none text-text-secondary';

type WikiGuessCarouselProps = {
  facts: WikiFact[];
  /** "맞아요" — 추측을 사실로 승격한다(`features/portfolio/api/confirmWikiFact.ts`). */
  onConfirm: (fact: WikiFact) => void;
  /** "아니에요" — 추측을 지운다(`DELETE /wiki/facts?reason=guess_rejected`). */
  onReject: (fact: WikiFact) => void;
  /** 둘 중 하나가 도는 동안 두 버튼을 함께 잠근다. */
  isAnswering: boolean;
};

export function WikiGuessCarousel({
  facts,
  onConfirm,
  onReject,
  isAnswering,
}: WikiGuessCarouselProps) {
  const [index, setIndex] = useState(0);

  // 항목이 지워져 길이가 줄면 인덱스가 범위를 넘는다. 렌더 시점에 접어 둔다.
  const current = Math.min(index, facts.length - 1);
  const fact = facts[current];
  const multiple = facts.length > 1;

  if (fact === undefined) {
    return null;
  }

  return (
    <>
      <div className="relative">
        {/*
          뒤에 겹쳐 보이는 카드. 남은 장수에 따라 하나·둘이다. 장식이 아니라
          "뒤에 더 있다"는 신호라 개수를 실제 남은 장수에 맞춘다.
        */}
        {facts.length > 2 ? (
          <div className="absolute right-4 -bottom-3.25 left-4 z-0 h-10 rounded-12 border border-border bg-surface opacity-60" />
        ) : null}
        {multiple ? (
          <div className="absolute right-2 -bottom-1.75 left-2 z-0 h-10 rounded-12 border border-border bg-surface" />
        ) : null}

        <div
          // `key` 로 장을 넘길 때마다 새로 마운트해 등장 모션을 다시 태운다.
          key={fact.id}
          className="relative z-[1] animate-[wiki-guess-in_260ms_var(--ease-standard)] rounded-12 border border-border bg-surface p-5 shadow-[0_2px_10px_rgba(31,35,40,0.05)] motion-reduce:animate-none"
        >
          <div className="mb-3 flex items-center gap-1.75">
            <span
              className="flex-1 text-[12px] font-semibold tracking-[0.02em]"
              style={{ color: ACCENT }}
            >
              확인이 필요해요
            </span>
            {multiple ? (
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="이전"
                  onClick={() =>
                    setIndex((current - 1 + facts.length) % facts.length)
                  }
                  className={NAV_BUTTON_CLASS}
                >
                  ‹
                </button>
                <span className="min-w-8.5 text-center text-[12px] font-semibold text-text-muted">
                  {current + 1} / {facts.length}
                </span>
                <button
                  type="button"
                  aria-label="다음"
                  onClick={() => setIndex((current + 1) % facts.length)}
                  className={NAV_BUTTON_CLASS}
                >
                  ›
                </button>
              </span>
            ) : null}
          </div>

          <p className="text-[17px] leading-[25px] font-semibold tracking-[-0.01em] text-pretty whitespace-pre-line text-text-primary">
            {fact.text}
          </p>
          <p className="mt-2.25 text-caption leading-[19px] text-text-secondary">
            투자 기록을 보고 이렇게 이해했어요.
          </p>

          {/*
            프로토타입처럼 둘을 나란히 둔다(`.gbtn` — gap 8px · margin-top 18px ·
            둘 다 같은 모양이다. 승격이 더 무거운 행동이 아니므로 한쪽만 강조하지
            않는다).

            **`맞아요` 의 승격 경로에는 아직 계약이 없다.** 지금은 MSW 만 답한다 —
            `confirmWikiFact.ts` 머리 주석을 본다. 버튼을 두는 쪽을 고른 이유는,
            거절만 있는 카드가 "확인해 주세요" 라고 물으면서 확인할 방법을 주지
            않기 때문이다. 경로가 열리면 목만 끄면 된다.

            **두 버튼을 같은 값으로 잠근다.** 한쪽이 도는 동안 다른 쪽을 누르면
            같은 사실에 승격과 삭제가 함께 날아간다.
          */}
          <div className="mt-4.5 flex gap-2">
            <Button
              variant="secondary"
              disabled={isAnswering}
              onClick={() => onConfirm(fact)}
              className="h-10.5 flex-1 rounded-[11px] text-[15px] font-semibold"
            >
              맞아요
            </Button>
            <Button
              variant="secondary"
              disabled={isAnswering}
              onClick={() => onReject(fact)}
              className="h-10.5 flex-1 rounded-[11px] text-[15px] font-semibold"
            >
              아니에요
            </Button>
          </div>
        </div>
      </div>

      {multiple ? (
        <div className="mt-7.5 flex items-center justify-center gap-1.5">
          {facts.map((item, dotIndex) => {
            const on = dotIndex === current;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={`${dotIndex + 1}번째 항목 보기`}
                aria-current={on}
                onClick={() => setIndex(dotIndex)}
                className="size-6.5 rounded-[9px] border border-border bg-surface text-[12px] font-semibold text-text-muted transition-colors duration-(--motion-fast) ease-standard"
                style={
                  on
                    ? {
                        background: ACCENT,
                        borderColor: ACCENT,
                        color: 'var(--color-surface)',
                      }
                    : undefined
                }
              >
                {dotIndex + 1}
              </button>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
