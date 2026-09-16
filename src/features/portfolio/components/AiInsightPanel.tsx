import { useState } from 'react';

import { type AiAttributionRow } from '@/shared/types/ai/attribution';
import { type AiCitation } from '@/shared/types/ai/envelope';
import { AiCitationList } from '@/shared/ui/AiCitationList';
import { BottomSheet } from '@/shared/ui/BottomSheet';

/**
 * "FINCH가 분석했어요" — 숫자와 차트를 다 본 뒤에 오는 해석 (FINCH-308).
 *
 * ## 검정 카드를 걷어냈다
 *
 * 전에는 이 자리가 `AiCard`(검정 면 #24272C)였고 화면 **맨 위**에 있었다. 흰 배경
 * 위 검정 덩어리는 어떤 위계를 주더라도 가장 먼저 눈에 들어와서, 사용자가 자기
 * 수익률보다 AI 문장을 먼저 읽었다. 읽기 순서가 뒤집혀 있었다.
 *
 * 그래서 두 가지를 바꿨다 — **자리를 맨 아래로 내리고, 면을 `--color-surface-soft`
 * 로 낮췄다.** AI 해석은 차트보다 높아 보이면 안 된다.
 *
 * `SoftBox` 를 그대로 쓰지 않고 같은 토큰으로 직접 그린다 — `SoftBox` 는 `p-4`(16px)
 * 고정인데 이 패널은 안쪽 여백이 더 필요하고(20px), `SoftBoxRow` 의 키-값 구조도
 * 쓰지 않는다.
 *
 * ## 공시는 여기로 모인다
 *
 * 종목 행에서 뺀 공시 제목이 `분석 자세히 보기` 바닥 시트에 있다. **자료를 버린
 * 것이 아니라 옮긴 것이다.**
 *
 * 시트는 **보여 줄 것이 있을 때만** 만든다. 매칭된 공시도 근거도 없으면 눌러도 빈
 * 화면이 나오므로 버튼 자체를 그리지 않는다.
 *
 * ## 문장은 아직 한 덩어리다
 *
 * 화면은 `헤드라인 / 요약` 두 자리로 쓰고 싶지만 현재 AI 응답의 `summary` 는
 * 2~4문장이 이어진 하나다(`NARRATIVE_SCHEMA` 가 `{narrative: string}` 필드 하나).
 * 프론트가 마침표로 자르면 문장이 2개로 오는 날 자리가 비므로 자르지 않는다.
 * 나눠 받으려면 응답 계약이 바뀌어야 한다 —
 * `_inbox/요청-ai-수익률분석-응답형식.md`.
 *
 * 아이콘을 두지 않는다. 이 화면에서 AI 글리프는 `AI 카드가 검정이라 필요했던` 표시고,
 * 면이 낮아진 지금은 제목 글자가 같은 일을 한다.
 */

type AiInsightPanelProps = {
  /** `summary.text`. 생성이 막히면 `null` 이다 */
  text: string | null;
  /** 공시가 붙은 종목들. 바닥 시트에서만 쓴다 */
  rows: readonly AiAttributionRow[];
  citations: readonly AiCitation[];
};

export function AiInsightPanel({ text, rows, citations }: AiInsightPanelProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  const evidenced = rows.filter((row) => row.events.length > 0);
  const hasDetail = evidenced.length > 0 || citations.length > 0;

  return (
    <section className="mt-12">
      <h2 className="text-section-title text-text-primary">
        FINCH가 분석했어요
      </h2>

      <div className="mt-4 rounded-sm bg-surface-soft p-5">
        <p className="text-body-1 text-pretty text-text-primary">
          {text ?? '수익률 원인 분석을 준비하지 못했어요.'}
        </p>

        {hasDetail && (
          <button
            type="button"
            onClick={() => setDetailOpen(true)}
            className="mt-4 text-body-2 font-medium text-text-secondary"
          >
            분석 자세히 보기 ›
          </button>
        )}
      </div>

      {hasDetail && (
        <BottomSheet
          open={detailOpen}
          onOpenChange={setDetailOpen}
          title="분석 근거"
        >
          {evidenced.length > 0 && (
            <div className="flex flex-col gap-5">
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
                같은 기간에 있었던 공시예요. 주가 움직임의 원인으로 확인된 것은
                아니에요.
              </p>
            </div>
          )}

          <AiCitationList
            citations={citations}
            className={evidenced.length > 0 ? 'mt-6' : ''}
          />
        </BottomSheet>
      )}
    </section>
  );
}
