import { useState } from 'react';

import { type AiAttributionRow } from '@/shared/types/ai/attribution';
import { type AiSection } from '@/shared/types/ai/envelope';
import { AiGlyph } from '@/shared/ui/AiCard';
import { AiSegmentText } from '@/shared/ui/AiSegmentText';
import { BottomSheet } from '@/shared/ui/BottomSheet';

/**
 * "FINCH 한줄 분석" — 숫자와 차트를 다 본 뒤에 오는 해석 (FINCH-308 · 327 ·
 * 333).
 *
 * ## 면이 다섯 번 바뀐 자리다
 *
 * `AiCard`(검정) → `--color-surface-soft` 상자 → 흰 `Card` → 다시 `AiCard` →
 * **연한 패널**(2026-09-23). 같은 자리를 또 뒤집지 않도록 이력을 남긴다.
 *
 * 1. **검정 `AiCard`, 화면 맨 위** — 흰 배경 위 검정 덩어리는 어떤 위계를 주더라도
 *    가장 먼저 눈에 들어와서, 사용자가 자기 수익률보다 AI 문장을 먼저 읽었다
 * 2. **회색 상자, 맨 아래** — 자리를 내려 1번을 풀었다. 그런데 페이지 배경과
 *    차이가 6 단계밖에 안 나 "덜 중요한 안내문" 으로 읽혔다
 * 3. **흰 `Card`** — 경계는 생겼지만 옆의 일반 카드들과 같은 면이라 이것이 AI 가
 *    쓴 글이라는 표시가 없어졌다
 * 4. **다시 `AiCard`** (2026-09-22 QA) — AI 면을 앱 전체에서 하나로 모았다
 * 5. **연한 패널** (2026-09-23) — 아래 참고
 *
 * ## 5번으로 간 이유와 그 대가
 *
 * 검정 면이 `요약` 탭의 마지막에 있어도 **화면에서 가장 무거운 덩어리**였다.
 * 위 넷(히어로·비교·요인·종목)이 전부 밝은 톤인데 끝에서 검정이 나오면 읽는
 * 흐름이 거기서 끊긴다. 2026-09-23 지시 — *"과하게 강조하지 말 것 / 연한 패널 /
 * 메인 데이터보다 덜 강조"*.
 *
 * **2번과 다른 점이 하나 있다.** 2번이 "안내문" 으로 읽힌 이유는 배경(#F7F8FA)과
 * 면(#F1F3F6)의 차이가 없어서였는데, 지금 이 패널은 **흰 카드 아래**에 선다.
 * 위가 흰색이라 회색 면이 배경이 아니라 별개의 덩어리로 갈린다.
 *
 * **3번의 문제는 남는다** — 옆 카드와 다른 면색이지만 검정만큼 강한 표식은
 * 아니다. 그래서 글리프와 `FINCH` 라는 이름을 라벨 줄에 함께 세운다.
 *
 * ### 대가: AI 면이 앱에서 둘로 갈렸다
 *
 * `design.md` §1·§4·§15 가 "AI 가 관여한 영역은 Dark Charcoal Surface" 로 못박았고
 * 다른 AI 슬롯(홈 브리핑 · AI 진단 · 종목 분석 · 채팅)은 전부 `AiCard` 차콜이다.
 * **이 슬롯 하나만 밝다.** 알고 한 것이다.
 *
 * - **`shared/ui/AiCard` 를 고치지 않았다.** 거기를 건드리면 13곳 넘는 AI 슬롯이
 *   함께 뒤집힌다. 이 파일이 자기 셸을 직접 그린다
 * - **`design.md` §1·§4·§15 개정이 따라와야 한다.** 문서가 말하는 규칙과 화면이
 *   어긋난 상태이고, 이것은 이 MR 이 만든 부채다
 * - 팀이 차콜을 유지하기로 하면 되돌리는 것은 `AiCard` 로 감싸는 일이라 어렵지
 *   않다. **본문 구조는 4번과 같게 두었다**
 *
 * ## 본문은 세 줄에서 끊는다
 *
 * `summary` 는 2~4문장이 이어진 하나다(`NARRATIVE_SCHEMA` 가 `{narrative: string}`
 * 필드 하나). 문장 수를 프론트가 고를 수 없으므로 **줄 수로 끊는다** —
 * `line-clamp` 은 짧은 응답에는 아무 일도 하지 않고 긴 응답에서만 접힌다.
 * 마침표로 자르면 문장이 2개로 오는 날 자리가 빈다.
 *
 * 밝은 면으로 오면서 두 줄에서 세 줄로 되돌렸다 — 검정 면일 때는 높이를 줄이는
 * 것이 무게를 줄이는 유일한 수단이었는데, 지금은 면색이 그 일을 한다.
 *
 * 잘린 뒷부분은 `분석 자세히 보기` 시트 맨 위에 전문으로 있다. **자료를 버리는
 * 것이 아니라 접는 것이다.**
 *
 * ## `onDark` 를 껐다
 *
 * 차콜 면에서는 등락색(`#C93B3B`·`#2258C9`)의 대비가 2.3·1.8 로 읽히지 않아
 * `--color-ai-accent` 로만 강조했다. **밝은 면에서는 그 우회가 필요 없다** —
 * `AiSegmentText` 가 기본 모드에서 쓰는 등락색이 그대로 맞는다. 덤으로 이 패널과
 * 아래 시트가 같은 색으로 칠해진다(전에는 두 면에서 다르게 칠해졌다).
 *
 * ## 큰 숫자를 새로 세우지 않는다
 *
 * `가장 큰 기여 · 종목 선택 +1.42%p` 같은 KPI 줄을 두지 않는다. 그 값은 **엔진이
 * 만든 값**이고 바로 위 `PerformanceDriver` 에 이미 서 있다. 여기 한 번 더 적으면
 * 반올림이 갈리는 날 두 수치가 서로를 반증하고, 화면에서는 어느 쪽이 맞는지 가릴
 * 수 없다.
 *
 * ## 공시는 여기로 모인다
 *
 * 종목 행에서 뺀 공시 제목이 `분석 자세히 보기` 시트에 있다. 근거 목록
 * (`citations`)은 본문 맨 아래 `분석 기준 및 안내` 로 갔다 — 그쪽은 "이 숫자를
 * 어디서 가져왔나" 를 모아 둔 자리고, 여기는 "FINCH 가 무엇을 읽고 그렇게
 * 말했나" 다.
 */

type FinchReturnInsightProps = {
  /** 생성이 막히면 `null` 이다. 그때도 패널은 서고 문구만 바뀐다 */
  summary: AiSection | null;
  /** 공시가 붙은 종목들. 바닥 시트에서만 쓴다 */
  rows: readonly AiAttributionRow[];
  /** 위 여백은 이 컴포넌트가 갖지 않는다 — `AiFeedbackRow` 와 같은 규약이다 */
  className?: string;
};

export function FinchReturnInsight({
  summary,
  rows,
  className = '',
}: FinchReturnInsightProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  const evidenced = rows.filter((row) => row.events.length > 0);
  const hasDetail = summary !== null || evidenced.length > 0;

  return (
    <section className={`rounded-ai bg-surface-soft px-4 py-3.5 ${className}`}>
      {/* 글리프는 `bg-current` 마스크라 이 줄의 글자색을 물려받는다. 밝은 면이라
          흰색이 아니라 `--color-text-secondary` 가 된다 — design.md §3 이
          "검정 Surface 위에서는 White Symbol" 이라고 적은 것의 반대 경우다. */}
      <h3 className="flex items-center gap-1.75 text-text-secondary">
        <AiGlyph />
        <span className="text-caption font-semibold tracking-[.02em]">
          FINCH 한줄 분석
        </span>
      </h3>

      <p className="mt-2.5 line-clamp-3 text-body-2 text-pretty break-keep text-text-secondary">
        {summary === null ? (
          '수익률 원인 분석을 준비하지 못했어요.'
        ) : (
          <AiSegmentText segments={summary.segments} text={summary.text} />
        )}
      </p>

      {hasDetail && (
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          className="mt-3 text-caption font-semibold text-text-primary"
        >
          분석 자세히 보기 ›
        </button>
      )}

      {hasDetail && (
        <BottomSheet
          open={detailOpen}
          onOpenChange={setDetailOpen}
          title="FINCH 분석"
        >
          <div className="scroll-touch -mx-0.5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-0.5">
            {summary !== null && (
              <p className="text-body-1 text-pretty text-text-primary">
                <AiSegmentText
                  segments={summary.segments}
                  text={summary.text}
                />
              </p>
            )}

            {evidenced.length > 0 && (
              <div
                className={`flex flex-col gap-5 ${summary === null ? '' : 'mt-6'}`}
              >
                {evidenced.map((row) => (
                  <div key={row.ticker}>
                    <p className="text-body-1 font-semibold text-text-primary">
                      {row.name}
                    </p>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {row.events.map((event) => (
                        <li
                          key={event.citationId}
                          className="text-body-2 text-pretty text-text-secondary"
                        >
                          {event.title}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {/*
                  엔진이 §5.1 로 계산하는 `matchedConfidence` 는 **근접도이지 인과의
                  강도가 아니다.** 같은 시점에 있었다는 사실만 말하는 자료를 원인처럼
                  읽지 않도록 한 줄을 고정해 둔다 — 이 문장은 AI 가 쓰지 않는다.
                */}
                <p className="text-caption text-pretty text-text-muted">
                  같은 기간에 있었던 공시예요. 주가 움직임의 원인으로 확인된
                  것은 아니에요.
                </p>
              </div>
            )}
          </div>
        </BottomSheet>
      )}
    </section>
  );
}
