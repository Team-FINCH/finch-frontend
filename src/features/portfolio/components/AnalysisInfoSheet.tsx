import { useState } from 'react';

import { formatKstShortTime } from '@/shared/lib/formatDate';
import { type AiCitation } from '@/shared/types/ai/envelope';
import { AiCitationList } from '@/shared/ui/AiCitationList';
import { BottomSheet } from '@/shared/ui/BottomSheet';

/**
 * `분석 기준 및 안내` — 계산 기준 · 계산 단서 · 근거 · 면책 (FINCH-327).
 *
 * ## 각주 세 덩어리를 한 탭 뒤로 접었다
 *
 * 전에는 `notes`(엔진이 붙인 계산 단서) · 기준 시각 · 면책이 본문 맨 아래 캡션으로
 * **상시 노출**됐다. 캡션 위계라 무게는 이미 낮았지만, 종목 목록과 같은 세로 흐름에
 * 놓여 있어 처음 읽는 동선에서 매번 지나가야 했다. 셋 다 "이 숫자를 어떻게 읽어야
 * 하는가" 에 대한 답이지 **매번 읽는 글이 아니다.**
 *
 * AI 진단 탭의 `AnalysisEvidenceSheet` 와 같은 취급이다(FINCH-325).
 *
 * ## 기준 시각만 시트 밖에 남긴다
 *
 * AI 명세 §2.2 가 기준 시각을 **"UI 에 반드시 노출한다"** 로 적었다. 시트 안으로
 * 넣으면 한 번 눌러야 보이므로 노출이라 하기 어려워서, 진입 줄 자체가 그 값을
 * 진다 — `09:12 기준 · 분석 기준 및 안내 ›`. 줄 하나가 값도 보여주고 문도 된다.
 *
 * 시각이 없으면(`asOf === null`) 앞머리 없이 `분석 기준 및 안내` 만 적는다. 빈
 * 자리에 `-- 기준` 을 채우면 값이 있는 것처럼 읽힌다.
 *
 * ## 계산 기준 두 줄은 우리가 쓴다
 *
 * 맨 위 두 줄은 AI 가 아니라 고정 문구다. `design.md` §7.10 이 **"영향 값이 단순
 * 합산되지 않는 경우 오해 방지 안내"** 를 요구하는데, 이 엔진은 반대로 세 값의 합이
 * 기간 수익률과 **정확히 같다**(§6.3 항등식을 엔진이 검증한다). 그 사실을 적어 두는
 * 것이 그 규칙에 대한 답이다 — 화면 어디에도 합계 줄이 없어서, 세 값을 보고
 * "이게 다 더해지는 값인가" 를 묻는 사람에게 답할 자리가 여기밖에 없다.
 *
 * **비율은 적지 않는다.** 가중이나 구간을 베껴 두면 엔진이 바꿀 때 화면만 조용히
 * 틀린다 (`AnalysisEvidenceSheet` 의 같은 판단).
 *
 * ## 근거 목록이 여기로 왔다
 *
 * `citations` 는 전에 `FinchReturnInsight` 의 시트에 있었다. 두 시트의 질문이
 * 다르다 — 그쪽은 "FINCH 가 무엇을 읽고 그렇게 말했나"(종목별 공시)이고, 이쪽은
 * "이 숫자를 어디서 가져왔나" 다. 근거 목록·면책·계산 단서는 뒤쪽 질문의 답이라
 * 한 시트에 모인다.
 *
 * ## 스크롤 래퍼를 직접 둔다
 *
 * `BottomSheet` 는 `max-h-[80%]` 만 걸고 `overflow-y` 를 강제하지 않는다 — 짧은
 * 시트까지 스크롤 영역을 두면 스크롤바 없는 영역만 생긴다는 이유가 그쪽 주석에
 * 있다. `notes` 가 여러 줄로 오면 이 시트는 길어질 수 있다.
 */

type AnalysisInfoSheetProps = {
  /** 엔진이 계산 중 붙인 단서. 없으면 빈 배열이다 */
  notes: readonly string[];
  /** 원천별 기준 시각 중 고른 하나. 없으면 `null` */
  asOf: string | null;
  citations: readonly AiCitation[];
  /** 봉투가 늘 실어 주는 면책 문구. 화면이 지어내지 않는다 */
  disclaimer: string;
};

export function AnalysisInfoSheet({
  notes,
  asOf,
  citations,
  disclaimer,
}: AnalysisInfoSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-8 flex w-full items-center justify-between gap-3 py-2 text-left"
      >
        {/* 종목 분석의 같은 자리(`AnalysisSourceSheet`)와 한 문구다
            (FINCH-351). `및` 을 쓰지 않고, 시트 안에 실제로 있는 것을 적는다. */}
        <span className="min-w-0 truncate text-body-2 text-text-secondary tabular-nums">
          {asOf === null
            ? '근거와 안내 보기'
            : `${formatKstShortTime(asOf)} 기준 · 근거와 안내 보기`}
        </span>
        <span
          aria-hidden="true"
          className="flex-none text-body-2 text-text-muted"
        >
          ›
        </span>
      </button>

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="이 분석은 이렇게 만들어요"
      >
        <div className="scroll-touch -mx-0.5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-0.5">
          <p className="text-body-2 text-pretty text-text-secondary">
            기간 수익률을 시장 흐름 · 업종 배분 · 종목 선택 셋으로 나눠 각
            요인이 얼마나 움직였는지 계산해요.
          </p>
          <p className="mt-1.5 text-caption text-pretty text-text-muted">
            세 값을 더하면 위에 적힌 기간 수익률과 같아요.
          </p>

          {notes.length > 0 && (
            <div className="mt-6 flex flex-col gap-1.5 border-t border-border pt-5">
              {notes.map((note) => (
                <p
                  key={note}
                  className="text-body-2 text-pretty text-text-secondary"
                >
                  {note}
                </p>
              ))}
            </div>
          )}

          <AiCitationList citations={citations} title="근거" className="mt-6" />

          <p className="mt-6 text-caption text-pretty text-text-muted">
            {asOf === null ? null : `${formatKstShortTime(asOf)} 기준 · `}
            {disclaimer}
          </p>
        </div>
      </BottomSheet>
    </>
  );
}
