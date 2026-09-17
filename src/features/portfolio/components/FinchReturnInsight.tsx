import { useState } from 'react';

import { type AiAttributionRow } from '@/shared/types/ai/attribution';
import { type AiSection } from '@/shared/types/ai/envelope';
import { AiGlyph } from '@/shared/ui/AiCard';
import { AiSegmentText } from '@/shared/ui/AiSegmentText';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Card } from '@/shared/ui/Card';

/**
 * "FINCH가 분석했어요" — 숫자와 차트를 다 본 뒤에 오는 해석
 * (FINCH-308 에서 자리를 잡고 FINCH-327 에서 문단을 걷었다).
 *
 * ## 검정 카드를 걷어낸 자리다
 *
 * 전에는 이 자리가 `AiCard`(검정 면 #24272C)였고 화면 **맨 위**에 있었다. 흰 배경
 * 위 검정 덩어리는 어떤 위계를 주더라도 가장 먼저 눈에 들어와서, 사용자가 자기
 * 수익률보다 AI 문장을 먼저 읽었다. 읽기 순서가 뒤집혀 있었다.
 *
 * 그래서 **자리를 맨 아래로 내렸고**, 이번에 면을 `--color-surface-soft` 상자에서
 * 흰 `Card` 로 올렸다. 회색 상자는 페이지 배경(#F7F8FA)과 차이가 6 단계밖에 안 나
 * "덜 중요한 안내문" 으로 읽혔는데, 이 카드는 화면에서 **유일하게 AI 가 쓴 내용**
 * 이라 경계는 있어야 한다. AI 진단 탭의 `FinchInsightCard` 와 같은 셸이다.
 *
 * ## 큰 숫자를 새로 세우지 않는다
 *
 * `가장 큰 기여 · 종목 선택 +1.42%p` 같은 KPI 줄을 이 카드에 두지 않는다. 그 값은
 * **엔진이 만든 값**이고 바로 위 `ReturnAttributionSection`·
 * `StockContributionSection` 에 이미 서 있다. 여기 한 번 더 적으면
 * `attributionInsight.ts` 가 못박은 선을 넘는다 — **AI 가 만든 값과 엔진이 만든
 * 값이 같은 사실을 두 번 말하게 두지 않는다.** 반올림이 갈리는 날 두 수치가 서로를
 * 반증하고, 화면에서는 어느 쪽이 맞는지 가릴 수 없다.
 *
 * **진단 탭의 metric anchor 추출도 여기서는 못 쓴다.** 그쪽(`FinchInsightCard`)은
 * `metric` 조각 앞 `text` 조각의 마지막 절을 라벨로 쓰는데, 이 응답에 돌려보면
 * `였고 그중 종목 선택` 같은 문장 토막이 라벨 자리에 앉는다 — 수익률 서술은
 * 지표명으로 시작하지 않고 수치가 문장 가운데 박히기 때문이다.
 *
 * ## 대신 문장 안에서 숫자를 올린다
 *
 * `summary.segments` 를 `AiSegmentText` 로 순회한다. `direction` 이 찬 조각에만
 * 등락색·`font-semibold`·`tabular-nums` 가 붙어서, **수치를 새로 만들지 않고도**
 * `+2.13%`·`+1.42%`·`-0.31%` 가 문장에서 먼저 잡힌다. 조각을 이어 붙이면 `text` 와
 * 정확히 일치한다는 보장이 있어(contracts C55) 정규식으로 숫자를 찾지 않는다.
 *
 * ## 본문은 세 줄에서 끊는다
 *
 * `summary` 는 2~4문장이 이어진 하나다(`NARRATIVE_SCHEMA` 가 `{narrative: string}`
 * 필드 하나). 문장 수를 프론트가 고를 수 없으므로 **줄 수로 끊는다** —
 * `line-clamp-3` 은 짧은 응답에는 아무 일도 하지 않고 긴 응답에서만 접힌다.
 * 마침표로 자르지 않는 이유는 그대로다. 문장이 2개로 오는 날 자리가 빈다.
 *
 * 잘린 뒷부분은 `분석 자세히 보기` 시트 맨 위에 전문으로 있다. **자료를 버리는
 * 것이 아니라 접는 것이다.**
 *
 * ## 공시는 여기로 모인다
 *
 * 종목 행에서 뺀 공시 제목이 같은 시트에 있다. 근거 목록(`citations`)은 이 시트가
 * 아니라 본문 맨 아래 `분석 기준 및 안내` 로 갔다 — 그쪽은 "이 숫자를 어디서
 * 가져왔나" 를 모아 둔 자리고, 여기는 "FINCH 가 무엇을 읽고 그렇게 말했나" 다.
 */

type FinchReturnInsightProps = {
  /** 생성이 막히면 `null` 이다. 그때도 카드는 서고 문구만 바뀐다 */
  summary: AiSection | null;
  /** 공시가 붙은 종목들. 바닥 시트에서만 쓴다 */
  rows: readonly AiAttributionRow[];
};

export function FinchReturnInsight({ summary, rows }: FinchReturnInsightProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  const evidenced = rows.filter((row) => row.events.length > 0);
  const hasDetail = summary !== null || evidenced.length > 0;

  return (
    <Card className="mt-8">
      <h2 className="flex items-center gap-1.75 text-section-title text-text-primary">
        <AiGlyph />
        FINCH가 분석했어요
      </h2>

      <p className="mt-3 line-clamp-3 text-body-2 text-pretty text-text-secondary">
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
          className="mt-4 text-body-2 font-medium text-text-secondary"
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
    </Card>
  );
}
