import { useState } from 'react';

import { type AiAttributionRow } from '@/shared/types/ai/attribution';
import { type AiSection } from '@/shared/types/ai/envelope';
import { AiCard } from '@/shared/ui/AiCard';
import { AiSegmentText } from '@/shared/ui/AiSegmentText';
import { BottomSheet } from '@/shared/ui/BottomSheet';

import { AiAccentSentence } from './AiAccentSentence';

/**
 * "FINCH 한줄 분석" — 숫자와 차트를 다 본 뒤에 오는 해석 (FINCH-308 · 327 ·
 * 333).
 *
 * ## 면이 다섯 번 바뀐 자리다
 *
 * `AiCard`(검정) → `--color-surface-soft` 상자 → 흰 `Card` → 다시 `AiCard` →
 * 연한 패널 → 흰 면 + 1px → **다시 `AiCard`**(2026-09-23).
 * 같은 자리를 또 뒤집지 않도록 이력을 남긴다.
 *
 * **지금 상태는 1번·4번과 같은 공용 차콜 셸이다.** 아래 5·6번(연한 패널·흰 면)은
 * 지나간 상태이고, 왜 그리로 갔다가 왜 돌아왔는지가 7번에 있다.
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
 * ## 근거보다 위로 올렸다 (2026-09-23)
 *
 * FINCH-308 이 이 카드를 맨 아래로 내렸고 그 이유는 *"검정 면은 어떤 위계를
 * 주더라도 흰 배경 위에서 가장 먼저 눈에 들어와서, 사용자가 자기 수익률보다 AI
 * 문장을 먼저 읽었다"* 였다. **그 전제가 둘 다 사라졌다.**
 *
 * - **면이 검정이 아니다.** 흰 면 + 1px 이라 배경보다 밝고, 바로 위 36px 수익률이
 *   화면에서 여전히 가장 무겁다
 * - **맨 아래에서는 아예 안 보였다.** 시장 비교·요인·종목 세 섹션을 다 지나야
 *   닿아서, 실기기 첫 화면에 들어오지 않았다(2026-09-23 사용자 피드백 —
 *   "지금 아래에 있으니 보이지도 않네")
 *
 * **버튼 하나로 바꿔 시트에 넣지 않았다.** 이 패널이 보여주는 것은 이미 3줄
 * 미리보기이고, 그것을 탭 뒤로 숨기면 *눌러서 미리보기 → 또 눌러서 전문* 이
 * 된다. 자리만 올리면 미리보기가 공짜로 보이고 `분석 자세히 보기 →` 가 원래
 * 하려던 버튼 노릇을 그대로 한다.
 *
 * 순서가 `결과 → 해설 → 근거` 가 되어 **AI 진단 탭·종목 상세 AI 탭과 같은 모양**
 * 이다(FINCH-332 · 334). 넷 중 셋이 결론 우선인데 이 탭만 결론이 맨 뒤였다.
 *
 * ## 6. 흰 면 + 1px 로 한 단 더 내렸다 (2026-09-23)
 *
 * 5번(`--color-surface-soft` 회색 면)에서 **흰 면 + 1px 테두리**로 옮겼다.
 * 요약 탭이 카드를 전부 걷어 배경 위 글이 되면서, 회색 면 하나가 화면에서
 * 유일한 덩어리가 되어 **다시 가장 눈에 띄는 것**이 됐다 — 5번이 풀려던 문제가
 * 배경이 바뀌자 그대로 돌아온 것이다.
 *
 * 흰 면은 배경(#F7F8FA)보다 **밝아서** 회색 면처럼 무게를 더하지 않는다.
 * 1px 테두리가 경계를 만들고 그림자는 없다. 반경도 `--radius-sm`(10px)으로
 * 내렸다 — `--radius-ai`(12px)는 검정 카드의 값이라 이 자리에 크다.
 *
 * 라벨도 `--color-text-muted` 로 한 단 내렸고 CTA 는 `›` 대신 `→` 다.
 * 셰브런은 이 화면에서 "눌러서 이동" 을 뜻하는 기호로 쓰지 않기로 했다
 * (`PerformanceDriver` 에서 걷은 것과 같은 이유).
 *
 * ## 5번으로 간 이유와 그 대가
 *
 * 검정 면이 `요약` 탭의 마지막에 있어도 **화면에서 가장 무거운 덩어리**였다.
 * 위 넷(히어로·비교·요인·종목)이 전부 밝은 톤인데 끝에서 검정이 나오면 읽는
 * 흐름이 거기서 끊긴다. 2026-09-23 지시 — *"과하게 강조하지 말 것 / 연한 패널 /
 * 메인 데이터보다 덜 강조"*.
 *
 * **2번과 다른 점이 하나 있다.** 2번이 "안내문" 으로 읽힌 이유는 배경(#F7F8FA)과
 * 면(#F1F3F6)의 차이가 없어서였는데, 그때 이 패널은 **흰 카드 아래**에 서 있었다.
 * 위가 흰색이라 회색 면이 배경이 아니라 별개의 덩어리로 갈린다.
 *
 * **3번의 문제는 남는다** — 옆 카드와 다른 면색이지만 검정만큼 강한 표식은
 * 아니다. 그래서 글리프와 `FINCH` 라는 이름을 라벨 줄에 함께 세운다.
 *
 * ### 대가: AI 면이 앱에서 둘로 갈렸다 — 7번에서 해소됐다
 *
 * `design.md` §1·§4·§15 가 "AI 가 관여한 영역은 Dark Charcoal Surface" 로 못박았고
 * 다른 AI 슬롯(홈 브리핑 · AI 진단 · 종목 분석 · 채팅)은 전부 `AiCard` 차콜이다.
 * **이 슬롯 하나만 밝았다.** 알고 한 것이고, 그때 "`design.md` 개정이 따라와야
 * 하는 부채" 로 적어 뒀다. 7번이 그 부채를 갚는 대신 문서 쪽을 그대로 뒀다.
 *
 * ## 7. 다시 공용 차콜 셸로 (2026-09-23, FINCH-341)
 *
 * 사용자 지시 — *"AI 분석 부분은 모두 같은 색이어야 해. 그 검정 박스."*
 * 5·6번을 만든 같은 날의 지시(*"과하게 강조하지 말 것 / 연한 패널"*)를 뒤집는
 * 것이지만, **뒤집는 쪽이 문서와 맞는다** — 위 «대가» 절이 부채로 적어 둔 것이
 * 바로 이 어긋남이고, 차콜로 돌아오면서 `design.md` 개정 숙제가 사라진다.
 *
 * **자기 셸을 그리지 않고 `AiCard` 를 쓴다.** 6번까지는 이 파일이 면색·반경·
 * 라벨 줄을 직접 들고 있었는데, 그러면 "다른 AI 슬롯과 같은 색" 이 **값이 같다는
 * 뜻이지 같은 것을 본다는 뜻이 아니다.** 공용 셸이 바뀌는 날 이 카드만 남는다.
 * 라벨 줄(글리프 + `FINCH 분석`)도 셸이 그리므로 여기서 지웠다.
 *
 * ### 되돌아온 대가 둘
 *
 * - **등락색이 금색으로 바뀐다.** 밝은 면에서 오름 적색·내림 청색으로 갈리던
 *   문장이 차콜에서는 `--ai-accent` 다 (아래 «카드 본문과 시트» 절)
 * - **본문과 아래 시트의 색이 다시 갈린다.** 시트는 흰 면이라
 *   등락색 그대로다. 6번이 덤으로 얻었던 "두 면이 같은 색" 은 잃는다
 *
 * 둘 다 차콜 면의 대비 제약(등락색 2.3·1.8)에서 오는 것이라 면을 검정으로 두는
 * 한 피할 수 없다. 1·4번도 같은 상태였다.
 *
 * ## 본문은 세 줄에서 끊는다
 *
 * `summary` 는 2~4문장이 이어진 하나다(`NARRATIVE_SCHEMA` 가 `{narrative: string}`
 * 필드 하나). 문장 수를 프론트가 고를 수 없으므로 **줄 수로 끊는다** —
 * `line-clamp` 은 짧은 응답에는 아무 일도 하지 않고 긴 응답에서만 접힌다.
 * 마침표로 자르면 문장이 2개로 오는 날 자리가 빈다.
 *
 * 밝은 면으로 오면서 두 줄에서 세 줄로 되돌렸었다 — 검정 면일 때는 높이를 줄이는
 * 것이 무게를 줄이는 유일한 수단이었기 때문이다.
 *
 * **7번에서 면이 다시 검정이 됐지만 세 줄로 둔다.** 줄 수를 되돌리면 보이던 문장이
 * 한 줄 사라지는데, 이번 지시는 색에 대한 것이고 높이를 줄여 달라는 말이 아니었다.
 * 카드가 무겁게 느껴지면 그때 두 줄로 내린다 — `line-clamp-3` 한 곳만 고치면 된다.
 *
 * 잘린 뒷부분은 시트 맨 위에 전문으로 있다. **자료를 버리는
 * 것이 아니라 접는 것이다.**
 *
 * ## 카드 본문과 시트가 서로 다른 부품으로 문장을 칠한다
 *
 * 차콜 면에서는 등락색(`#C93B3B`·`#2258C9`)의 대비가 2.3·1.8 로 읽히지 않는다.
 * 그래서 **카드 본문은 `AiAccentSentence`** 로 금색 하나만 칠하고,
 * **시트는 흰 면이라 `AiSegmentText`** 가 등락색 그대로 칠한다.
 *
 * 한동안 카드도 `AiSegmentText onDark` 였다. 그러면 `direction` 이 있는 조각이
 * **전부** 금색이 되는데, 수치가 셋 실린 문장에서 강조가 셋이 됐다 — 같은 검정
 * 카드인 AI 진단 쪽은 하나만 칠하고 있어서 나란히 놓으면 규칙이 달라 보였다
 * (FINCH-341 사용자 지적). 좁은 쪽으로 맞췄고 근거는 그 부품 주석에 있다.
 *
 * 그 대가로 카드에서는 오름·내림이 색으로 갈리지 않는다. 방향은 부호(`+`·`−`)가
 * 말한다 — 색만으로 등락을 말하지 않는다는 규약(`frontConvention` §11)이 원래
 * 요구하는 것이기도 하다.
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
 * 종목 행에서 뺀 공시 제목이 이 시트에 있다. 근거 목록(`citations`)은 본문 맨 아래
 * `분석 기준 및 안내` 로 갔다 — 그쪽은 "이 숫자를 어디서 가져왔나" 를 모아 둔
 * 자리고, 여기는 "FINCH 가 무엇을 읽고 그렇게 말했나" 다.
 *
 * ## 시트를 여는 글자가 내용을 따라간다 (FINCH-341)
 *
 * `분석 자세히 보기 →` 하나였다. **그 이름이 틀린 것을 약속했다** — 눌러서 나오는
 * 것 중 카드에 없는 것은 공시 목록 하나뿐이고, 문장은 대개 카드에 이미 다 보인다.
 * 눌러 보면 방금 읽은 문장이 그대로 있고 새것은 그 아래에 있다.
 *
 * | 공시 | 글자 |
 * | --- | --- |
 * | 1건 이상 | `관련 공시 N건 →` |
 * | 0건 | `분석 전문 보기 →` |
 *
 * **세는 것은 종목이 아니라 공시다.** 한 종목에 공시가 둘이면 `2건` 이다.
 *
 * **0건일 때 버튼을 감추지는 않았다.** `summary` 는 2~4문장이라 긴 응답에서는
 * 세 줄 클램프에 걸리고, 그때 전문을 볼 자리가 여기밖에 없다. 문장이 실제로
 * 잘렸는지 재서(`scrollHeight > clientHeight`, `StockAiTab` 에 선례가 있다)
 * 잘리지도 않고 공시도 없을 때만 감추는 것이 정확하지만, 그것은 별건이다.
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
  // 종목 수가 아니라 공시 수다. 라벨이 `공시 N건` 이라 세는 대상이 공시여야 한다.
  const eventCount = evidenced.reduce((sum, row) => sum + row.events.length, 0);

  return (
    /* 셸은 공용 `AiCard` 다 — 라벨 줄(글리프 + `FINCH 분석`)·면색·반경·여백이
       전부 그 안에 있다. 자기 셸을 그리지 않는 이유는 아래 "7. 다시 차콜" 참고.

       `labelAs="h2"` 를 켠다. 이 탭에는 `시장과 비교`·`수익률 기여` 같은 형제
       `h2` 들이 나란히 서 있어서, 이 카드만 제목이 없으면 훑어 읽는 순서에서
       빠진다 (`AiCard` 의 `labelAs` 주석이 "포트폴리오의 두 카드만 켠다" 로
       적어 둔 그 자리다). */
    <AiCard
      label="FINCH 분석"
      labelAs="h2"
      /* 문장이 `children` 이 아니라 `headline` 이다 (FINCH-341). 전에는
         본문 글자(15px/400/보조색)로 그려서, 같은 검정 카드인 AI 진단 쪽 문장
         (16px/600/흰색)과 나란히 놓으면 다른 부품으로 보였다. 둘 다 "AI 가 쓴
         결론 한 문장" 이라 `AiCard` 가 그 자리로 마련해 둔 슬롯을 쓴다. */
      headline={
        <span className="line-clamp-3">
          {summary === null ? (
            '수익률 원인 분석을 준비하지 못했어요.'
          ) : (
            <AiAccentSentence summary={summary} />
          )}
        </span>
      }
      className={className}
    >
      {hasDetail && (
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          className="mt-3 text-caption font-semibold text-ai-text-primary"
        >
          {eventCount > 0 ? `관련 공시 ${eventCount}건 →` : '분석 전문 보기 →'}
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
    </AiCard>
  );
}
