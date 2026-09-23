import { useState } from 'react';

import { type AiFinding, type AiIndicators } from '@/shared/types/ai/diagnosis';
import { type AiSection } from '@/shared/types/ai/envelope';
import { AiGlyph } from '@/shared/ui/AiCard';

import { DiagnosisDetailModal } from './DiagnosisDetailModal';

/**
 * AI 진단 탭의 검정 카드 — 이 화면에서 **면을 갖는 유일한 블록** (FINCH-334).
 *
 * ## 왜 `AiCard` 를 쓰지 않나
 *
 * 시안이 이 카드에만 쓰는 치수를 정해 뒀다 — 글리프 20px(셸은 17px), 핵심 문장
 * 17px/600/24px(셸의 헤드라인은 16px), 보조 줄 13.5px, 오른쪽 위 원 장식.
 * `AiCard` 는 13곳 넘는 AI 슬롯이 공유하는 셸이라 **거기를 고치면 홈 브리핑·
 * 종목 분석·채팅이 함께 움직인다.**
 *
 * ## 카드를 163px 에서 141px 로 줄였다 (FINCH-341)
 *
 * 배포 화면을 본 사용자 지적이다 — *"박스가 너무 크다"*. 탭을 열자마자 검정
 * 덩어리가 화면의 4분의 1을 먹고 있었다. 높이는 이렇게 쌓여 있었다.
 *
 * | | 전 | 후 |
 * | --- | --- | --- |
 * | 안쪽 여백 위아래 | 20+20 | 16+16 |
 * | `AI 진단` 머리줄 | 20 | 20 |
 * | 머리줄 ↔ 문장 | 12 | 10 |
 * | 문장 두 줄 | 56 (19/28) | 48 (17/24) |
 * | 문장 ↔ 보조 줄 | 16 | 12 |
 * | 보조 줄 | 19 | 19 |
 * | **합** | **163** | **141** |
 *
 * **글자를 줄인 것이 덤으로 잘림을 덜어 준다.** 문장은 `line-clamp-2` 라 두 줄을
 * 넘으면 잘리는데, 17px 은 같은 폭에 글자가 더 들어가서 `…최대 낙폭은…` 처럼
 * 문장 한가운데가 끊기는 경우가 줄어든다.
 *
 * **면색과 반경은 그대로다.** `--color-ai-surface` 는 13곳 넘는 AI 슬롯이 함께
 * 쓰는 토큰이고 2026-09-22 QA 피드백("완전 검정은 별로")으로 `#343A42` 가 된
 * 값이다. 이 카드가 커 보였다고 그 색을 건드리면 홈 브리핑·종목 분석·채팅이
 * 같이 움직인다.
 *
 * 그래서 이 파일이 자기 셸을 그린다. 면색·반경·글자색은 여전히 토큰이라
 * (`--color-ai-surface` 등) AI 면 체계에서 벗어나지 않는다.
 *
 * **면색은 `#24272C` 가 아니라 토큰이다.** 시안이 `#24272C` 를 적었는데 그 값은
 * 2026-09-22 QA 피드백("완전 검정은 별로")으로 `#343A42` 가 됐다
 * (`styles/index.css` 의 `--color-ai-surface` 주석). 하드코딩하면 그 수정을
 * 되돌리는 것이고 이 카드만 다른 검정이 된다.
 *
 * ## 맨 위로 올렸다
 *
 * FINCH-325 가 이 카드를 맨 아래로 내렸었다 — *"검정 면은 어떤 위계를
 * 주더라도 흰 배경 위에서 가장 먼저 눈에 들어와서, 사용자가 자기 수치보다 AI
 * 문장을 먼저 읽었다."*
 *
 * 그 판단을 뒤집는다. **근거는 FINCH-332 다** — 종목 상세 AI 탭을 `결론 →
 * 요약 → 상세` 로 재편하면서 검정 결론 카드가 맨 위로 갔고, 그쪽에서 문제가
 * 되지 않았다. 325 가 걱정한 것은 *AI 문장이 숫자를 가리는 것*인데, 이 카드는
 * 이제 숫자를 들지 않는다(아래 "큰 숫자를 두지 않는다"). 결론 한 문장이 먼저
 * 오고 그 근거인 위험도·집중도가 뒤따르는 순서다.
 *
 * ## 큰 숫자를 두지 않는다
 *
 * 전에는 `pickMetricAnchors` 로 문장에서 지표를 뽑아 18px KPI 줄을 세웠다.
 * 지웠다 — **같은 값을 큰 숫자와 본문에서 두 번 말하지 않는다.** 뽑아낸 값이
 * 바로 아래 문장 안에 또 있었고, 라벨 추출이 문장 구조에 기대고 있어
 * `였고 그중 종목 선택` 같은 토막이 라벨 자리에 앉는 경우가 있었다.
 *
 * 대신 문장 안에서 **핵심 숫자 하나만** `--color-ai-accent` 로 칠한다.
 * `design.md` §4·§15 가 그 색을 "핵심 결과에만 · 한 카드에 최대 2~3곳" 으로
 * 묶어 뒀고, 하나면 그 안이다. 첫 `metric` 조각 하나만 칠하는 이유는 그것이
 * 문장이 말하려는 값이기 때문이다 — 뒤따르는 수치는 부연이다.
 *
 * ## 보조 줄은 낙폭이다
 *
 * `최근 1년 최대 낙폭 −22.1%`. 문장이 말하지 않는 값을 하나 더 주는 자리라
 * 지표에서 직접 읽는다(`indicators.maxDrawdown1y`). 값이 없으면 줄을 접는다 —
 * `—` 로 채우면 없는 값이 0 에 가까운 값으로 읽힌다.
 *
 * 부호는 `−`(U+2212)다. 하이픈보다 폭이 넓어 숫자와 높이가 맞는다.
 *
 * ## 원 장식
 *
 * 오른쪽 위 지름 120px, `rgba(233,199,127,.07)`. `--color-ai-accent` 의 7% 라
 * 같은 색 계열이고, 검정 면 대비 1.05 라 면이 살짝 밝아 보이는 정도다.
 * `pointer-events:none` 이라 카드 안의 버튼을 가리지 않고, `overflow:hidden` 이
 * 카드 밖으로 나간 부분을 자른다.
 *
 * **카드와 같은 비율로 줄였다** (180 → 120, FINCH-341). 카드가 141px 로
 * 낮아졌는데 원이 180px 그대로면 면의 절반 넘게를 덮어 밝은 쪽과 어두운 쪽이
 * 두 덩어리로 갈려 보인다. 위치(`-top`·`-right`)도 같은 비율로 당겼다.
 *
 * **반복 효과가 아니다.** 정적인 면이고 움직이지 않는다.
 *
 * ## 상세는 시트가 아니라 모달이다 (FINCH-341)
 *
 * 배포 화면을 본 사용자 지적이다 — *"눌렀을 때 아래에서 뜨는 게 별로다"*.
 *
 * **`Modal` 이 정의상 맞는 자리다.** 그 컴포넌트 주석이 시트와 모달을 이렇게
 * 갈라 뒀다 — *"기본은 `BottomSheet` … 선택지를 고르거나 무언가를 입력하는
 * 흐름은 전부 시트로 간다. 이것은 **읽고 닫는 짧은 안내** 자리다."* 진단 상세는
 * 고를 것도 입력할 것도 없고 읽고 닫는다. 시트에 있던 쪽이 규칙에서 벗어나 있었다.
 *
 * **`닫기` 버튼을 붙였다.** 시트에는 위쪽 손잡이(`.handle`)가 있어 내려서 닫는
 * 것이 보이는데 모달에는 그런 표시가 없다. 스크림 탭과 ESC 만 남기면 닫는 길이
 * 화면에 안 보인다 — `UpdateNoticeModal` 도 같은 이유로 `확인` 을 갖는다.
 *
 * **모달 안쪽은 `DiagnosisDetailModal` 로 나갔다.** 이 파일이 검정 카드 하나로
 * 이미 길었고, 모달은 제목·요약·핵심 수치·항목 목록·안내·버튼까지 자기 위계를
 * 갖는 화면이라 카드의 JSX 꼬리에 매달아 둘 만한 크기가 아니다. **열림 상태
 * (`detailOpen`)는 여기 남는다** — 그것을 여는 버튼이 이 카드 안에 있다.
 *
 * 탭 아래쪽 `AnalysisEvidenceSheet`(근거 N개 · 계산 기준)는 **그대로 시트다.**
 * 이번 지적은 이 카드의 진입에 대한 것이고, 두 오버레이를 한꺼번에 바꾸면
 * 지적받지 않은 자리까지 함께 흔든다.
 */

type DiagnosisAiCardProps = {
  /** 문장 생성이 막히면 `null` 이다. 그때도 카드는 서고 문구만 바뀐다 */
  summary: AiSection | null;
  findings: AiFinding[];
  indicators: AiIndicators;
  /** 진입 애니메이션을 재생할지. `useDiagnosisIntro` 가 정한다 */
  intro: boolean;
};

export function DiagnosisAiCard({
  summary,
  findings,
  indicators,
  intro,
}: DiagnosisAiCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);
  const hasDetail = summary !== null || findings.length > 0;
  const drawdown = indicators.maxDrawdown1y;

  return (
    <section
      className={`relative overflow-hidden rounded-ai bg-ai-surface p-4 ${
        intro
          ? 'animate-[diag-rise_520ms_cubic-bezier(.2,.8,.2,1)_both] motion-reduce:animate-none'
          : ''
      }`}
    >
      {/* 장식. 카드 오른쪽 위 밖으로 걸쳐 두고 `overflow-hidden` 이 자른다. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -right-9 size-30 rounded-full"
        style={{ background: 'rgba(233, 199, 127, .07)' }}
      />

      <h2 className="relative flex items-center gap-2 text-ai-text-muted">
        {/* 글리프는 `bg-current` 마스크라 이 줄의 글자색(흰색 62%)을 물려받는다. */}
        <span className="flex size-5 flex-none items-center justify-center">
          <AiGlyph />
        </span>
        <span className="text-caption font-semibold tracking-[.02em]">
          AI 진단
        </span>
      </h2>

      <p
        className={`relative mt-2.5 line-clamp-2 text-[17px] leading-6 font-semibold text-pretty break-keep text-ai-text-primary ${
          intro
            ? 'animate-[diag-fade_480ms_var(--ease-standard)_180ms_both] motion-reduce:animate-none'
            : ''
        }`}
      >
        {summary === null ? (
          '진단 결과를 준비하지 못했어요.'
        ) : (
          <AccentedSentence summary={summary} />
        )}
      </p>

      {(drawdown !== null || hasDetail) && (
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          disabled={!hasDetail}
          className={`relative mt-3 flex w-full items-center justify-between gap-3 text-left text-[13.5px] leading-[19px] text-ai-text-secondary ${
            intro
              ? 'animate-[diag-fade_480ms_var(--ease-standard)_320ms_both] motion-reduce:animate-none'
              : ''
          }`}
        >
          <span className="min-w-0 truncate">
            {drawdown === null ? (
              '진단 자세히 보기'
            ) : (
              <>
                최근 1년 최대 낙폭{' '}
                <span className="font-semibold text-ai-text-primary tabular-nums">
                  −{Math.abs(drawdown * 100).toFixed(1)}%
                </span>
              </>
            )}
          </span>
          {hasDetail && (
            <span aria-hidden="true" className="flex-none">
              ›
            </span>
          )}
        </button>
      )}

      {hasDetail && (
        <DiagnosisDetailModal
          open={detailOpen}
          onOpenChange={setDetailOpen}
          findings={findings}
          indicators={indicators}
        />
      )}
    </section>
  );
}

/**
 * 문장 하나. **첫 `metric` 조각만** 강조색으로 칠하고 나머지는 흰 글자다.
 *
 * `AiSegmentText` 를 쓰지 않는 이유가 이것이다 — 그쪽은 `onDark` 에서 `metric`
 * 조각을 **전부** 강조해서, 수치가 셋 들어간 문장이면 카드 하나에 강조가 셋이
 * 된다. `design.md` §4 가 "한 카드에 최대 2~3곳" 으로 묶어 둔 색이고 시안은
 * 하나로 더 좁혔다.
 *
 * 조각이 없으면(생성은 됐는데 `segments` 가 빈 경우) `text` 를 그대로 그린다 —
 * 이어 붙이면 `text` 와 일치한다는 보장(C55)의 반대 방향 폴백이다.
 */
function AccentedSentence({ summary }: { summary: AiSection }) {
  const accentIndex = summary.segments.findIndex(
    (segment) => segment.type === 'metric',
  );

  if (summary.segments.length === 0) {
    return <>{summary.text}</>;
  }

  return (
    <>
      {summary.segments.map((segment, index) =>
        index === accentIndex ? (
          <span key={index} className="font-bold text-ai-accent tabular-nums">
            {segment.value}
          </span>
        ) : (
          <span key={index}>{segment.value}</span>
        ),
      )}
    </>
  );
}
