import { useState } from 'react';

import { BottomSheet } from '@/shared/ui/BottomSheet';

/**
 * `분석 기준 및 안내` — 근거 종류 · 기준 시각 · 면책 (FINCH-329).
 *
 * ## 캡션 두 줄을 한 탭 뒤로 접었다
 *
 * 전에는 본문 맨 아래 `{기준 시각} 기준 · 공시 · 뉴스 · 자체계산` 과 면책 문구가
 * 캡션 두 줄로 **상시 노출**됐다. 매번 읽는 글이 아닌데 섹션 다섯을 다 지난 자리에
 * 그대로 붙어 있어 스크롤 끝이 안내문으로 끝났다.
 *
 * 포트폴리오 두 탭이 먼저 같은 처리를 했다 — AI 진단의 `AnalysisEvidenceSheet`
 * (FINCH-325) · 수익률 분석의 `AnalysisInfoSheet`(FINCH-327).
 *
 * ## 모양은 그대로 캡션 판이다
 *
 * **뱃지도 출처 줄 목록도 되살리지 않는다.** `design.md` §9 가 이 화면을 캡션 판으로
 * 정한 이유는 "모든 응답 블록에 뱃지가 반복되면서 화면마다 장식이 쌓였다" 이고,
 * 그 판단은 시트 안에서도 그대로다 — 개별 출처 제목·링크를 그리기 시작하면 이
 * 화면만 포트폴리오 쪽 목록 판으로 넘어간다. 두 판 중 어느 쪽으로 통일할지는 §9 가
 * **아직 미확정**이라고 적어 둔 자리라, 이 티켓이 그 결정을 대신하지 않는다.
 *
 * 바뀐 것은 **자리 하나뿐이다** — 본문 최하단에서 시트 안으로.
 *
 * ## 기준 시각만 시트 밖에 남긴다
 *
 * AI 명세 §2.2 가 기준 시각을 **"UI 에 반드시 노출한다"** 로 적었다. 시트 안으로
 * 넣으면 한 번 눌러야 보이므로 노출이라 하기 어려워서, 진입 줄 자체가 그 값을
 * 진다 — `08.28 09:00 기준 · 분석 기준 및 안내 ›`.
 *
 * **그 줄을 결론 카드 바로 아래로 올렸다** (FINCH-332, 2026-09-22 사용자
 * 피드백 — "버튼이 너무 아래에 있어서 안 보인다"). 본문 맨 끝에 있으면 섹션을
 * 전부 지나야 닿는데, `§2.2` 가 요구하는 것은 **반드시 보이는 것**이지 끝까지
 * 내려간 사람에게만 보이는 것이 아니다. 기준 시각은 위 카드가 말한 결론이 언제
 * 것인지를 밝히는 값이라 그 카드에 붙어 있는 편이 뜻도 맞는다 — design.md §8.1
 * 이 `AiCard` 의 캡션 자리를 "기준 시각·핵심 메타" 로 정해 둔 것과 같은 판단이다.
 *
 * **카드 캡션 슬롯에 넣지는 않았다.** 그 자리는 차콜 면 **안**이라 진입 줄이
 * 검정 위에 갇히고, `AiCard` 주석이 "근거 목록과 피드백은 이 셸의 밖에 온다" 로
 * 막아 둔 것과 같은 이유가 걸린다. 면 밖 흰 배경에 붙인다.
 *
 * 형식을 **호출부가 완성해 넘긴다.** 원천이 `filings` 면 날짜까지, `price` 면
 * 시:분까지라 포맷이 갈리는데(`StockAiTab` 의 `asOf` 주석) 그 판정을 두 곳에 두면
 * 진입 줄과 시트 안이 서로 다른 형식으로 보일 수 있다.
 *
 * 값이 없으면 앞머리 없이 `분석 기준 및 안내` 만 적는다. 빈 자리에 `-- 기준` 을
 * 채우면 값이 있는 것처럼 읽힌다.
 *
 * ## 스크롤 래퍼를 두지 않는다
 *
 * 담기는 것이 짧은 문단 셋이라 `max-h-[80%]` 에 닿지 않는다. `BottomSheet` 주석이
 * "짧은 시트까지 스크롤 영역을 두면 스크롤바 없는 영역만 생긴다" 고 적어 둔 쪽이다.
 * 포트폴리오 두 시트가 래퍼를 단 이유는 그쪽 내용(지표 표·근거 목록)이 길어서다.
 */

type AnalysisSourceSheetProps = {
  /**
   * 기준 시각 문구. 원천에 맞는 형식으로 호출부가 완성해 넘긴다
   * (`08.28` 또는 `08.28 09:00`). 값이 없으면 `null`
   */
  asOfText: string | null;
  /**
   * 근거 종류 이름. `citationTypeLabels()` 가 화면이 고정한 순서로 골라 넘긴다.
   * 근거가 하나도 없으면 빈 배열이다
   */
  sourceLabels: readonly string[];
  /** 봉투가 늘 실어 주는 면책 문구. 화면이 지어내지 않는다 */
  disclaimer: string;
  /**
   * 진입 줄의 바깥 여백. **위 여백을 이 컴포넌트가 갖지 않는다** — 앞에 무엇이
   * 오는지에 따라 값이 달라지고(결론 카드 아래 12px · 섹션 뒤 36px) 그것을 아는
   * 쪽은 호출부다. `AiFeedbackRow` 가 같은 규약이다.
   */
  className?: string;
};

export function AnalysisSourceSheet({
  asOfText,
  sourceLabels,
  disclaimer,
  className = '',
}: AnalysisSourceSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex w-full items-center justify-between gap-3 py-2 text-left ${className}`}
      >
        {/* `분석 기준 및 안내` 였다 (FINCH-351). `및` 은 공문의 접속사고,
            `기준` 은 바로 앞 `{시각} 기준` 과 같은 낱말이 다른 뜻으로 한 줄에 두
            번 서는 자리였다. 열리는 시트 안에 실제로 있는 것(근거 · 안내)을 적는다. */}
        <span className="min-w-0 truncate text-body-2 text-text-secondary">
          {asOfText === null
            ? '근거와 안내 보기'
            : `${asOfText} 기준 · 근거와 안내 보기`}
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
        <p className="text-body-2 text-pretty text-text-secondary">
          공시와 뉴스에서 이 종목에 관련된 내용만 골라 정리한 분석이에요.
        </p>

        {/*
          근거는 **종류 이름만** 나열한다 (design.md §9 캡션 판). 개별 출처 제목·
          발행처·링크를 그리지 않으므로 남는 것이 종류뿐이고, 순서는 응답의
          `relevance` 가 아니라 호출부의 고정 배열이 정한다.
        */}
        {sourceLabels.length > 0 && (
          <div className="mt-6 border-t border-border pt-5">
            <h3 className="text-label font-semibold text-text-secondary">
              근거
            </h3>
            <p className="mt-2 text-body-2 text-pretty text-text-primary">
              {sourceLabels.join(' · ')}
            </p>
          </div>
        )}

        <p className="mt-6 text-caption leading-5 text-pretty text-text-muted">
          {asOfText === null ? null : `${asOfText} 기준 · `}
          {disclaimer}
        </p>
      </BottomSheet>
    </>
  );
}
