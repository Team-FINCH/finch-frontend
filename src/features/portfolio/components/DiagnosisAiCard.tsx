import { useState } from 'react';

import { type AiFinding, type AiIndicators } from '@/shared/types/ai/diagnosis';
import { type AiSection } from '@/shared/types/ai/envelope';
import { AiCard } from '@/shared/ui/AiCard';

import { AiAccentSentence } from './AiAccentSentence';
import { DiagnosisDetailModal } from './DiagnosisDetailModal';

/**
 * AI 진단 탭의 검정 카드 — 이 화면에서 **면을 갖는 유일한 블록** (FINCH-334).
 *
 * ## 공용 `AiCard` 를 쓴다 (FINCH-341)
 *
 * 오래 자기 셸을 그렸다. 시안이 이 카드에만 쓰는 치수를 정해 뒀기 때문이다 —
 * 글리프 20px(셸은 17px), 문장 17px/600(셸의 헤드라인은 16px), 보조 줄 13.5px,
 * 오른쪽 위 원 장식.
 *
 * **그 대가가 화면에서 드러났다.** `FinchReturnInsight` 가 `AiCard` 로 돌아온 뒤
 * 두 검정 카드를 나란히 놓자 넷이 달랐다 — 라벨 색(muted 대 흰색), 문장 크기와
 * 굵기, 안쪽 여백(16 대 18), 테두리 유무. 사용자 지적이 그것이다.
 *
 * 시안 치수를 지키려다 **같은 종류의 카드 둘이 다른 부품처럼 보이는 쪽**이 더
 * 비쌌다. 이제 셸이 라벨 줄·면색·반경·여백·테두리를 전부 준다.
 *
 * 잃은 것 둘을 적어 둔다. 되살릴 근거가 생기면 `AiCard` 쪽을 고쳐야 한다.
 *
 * - **문장이 17px 에서 16px** 로 내려갔다(`AiCard` 의 `headline`)
 * - **원 장식이 사라졌다.** 셸에 그 자리가 없다. 카드 하나만 다른 무늬를 갖는
 *   것이 애초에 일관성을 깨는 쪽이었다
 *
 * ## 카드를 163px 에서 146px 로 줄였다 (FINCH-341)
 *
 * 배포 화면을 본 사용자 지적이다 — *"박스가 너무 크다"*. 탭을 열자마자 검정
 * 덩어리가 화면의 4분의 1을 먹고 있었다. 높이는 이렇게 쌓여 있었다.
 *
 * | | 전 (자기 셸) | 후 (`AiCard`) |
 * | --- | --- | --- |
 * | 안쪽 여백 위아래 | 20+20 | 18+18 |
 * | `AI 진단` 머리줄 | 20 | 18 |
 * | 머리줄 ↔ 문장 | 12 | 14 |
 * | 문장 두 줄 | 56 (19/28) | 48 (16/24) |
 * | 문장 ↔ 보조 줄 | 16 | 12 |
 * | 보조 줄 | 19 | 18 |
 * | **합** | **163** | **146** |
 *
 * 한때 17px/24 로 직접 잡아 141px 까지 내려갔었다. 셸로 옮기며 5px 을 돌려준
 * 셈인데, **그 5px 로 두 카드가 같은 부품이 된다.**
 *
 * **글자를 줄인 것이 덤으로 잘림을 덜어 준다.** 문장은 `line-clamp-2` 라 두 줄을
 * 넘으면 잘리는데, 16px 은 19px 보다 같은 폭에 글자가 더 들어가서
 * `…최대 낙폭은…` 처럼 문장 한가운데가 끊기는 경우가 줄어든다.
 *
 * **면색은 `#24272C` 가 아니라 토큰이다.** 시안이 `#24272C` 를 적었는데 그 값은
 * 2026-09-22 QA 피드백("완전 검정은 별로")으로 `#343A42` 가 됐다
 * (`styles/index.css` 의 `--color-ai-surface` 주석). 셸이 그 토큰을 쓴다.
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
 * 규칙과 근거는 `AiAccentSentence` 에 있다 — 그 부품을 `FinchReturnInsight` 와
 * 함께 쓰므로 두 카드의 강조 개수가 갈릴 수 없다 (FINCH-341).
 *
 * ## 보조 줄은 낙폭이다
 *
 * `최근 1년 최대 낙폭 −22.1%`. 문장이 말하지 않는 값을 하나 더 주는 자리라
 * 지표에서 직접 읽는다(`indicators.maxDrawdown1y`). 값이 없으면 줄을 접는다 —
 * `—` 로 채우면 없는 값이 0 에 가까운 값으로 읽힌다.
 *
 * 부호는 `−`(U+2212)다. 하이픈보다 폭이 넓어 숫자와 높이가 맞는다.
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
    <AiCard
      label="AI 진단"
      /* 이 탭에는 `종목 집중도` 같은 형제 `h2` 가 있다. 이 카드만 제목이 없으면
         훑어 읽는 순서에서 빠진다 — `AiCard` 의 `labelAs` 주석이 "포트폴리오의
         두 카드만 켠다" 로 적어 둔 그 둘 중 하나가 여기다. */
      labelAs="h2"
      headline={
        <span
          className={`line-clamp-2 ${
            intro
              ? 'animate-[diag-fade_480ms_var(--ease-standard)_180ms_both] motion-reduce:animate-none'
              : ''
          }`}
        >
          {summary === null ? (
            '진단 결과를 준비하지 못했어요.'
          ) : (
            <AiAccentSentence summary={summary} />
          )}
        </span>
      }
      className={
        intro
          ? 'animate-[diag-rise_520ms_cubic-bezier(.2,.8,.2,1)_both] motion-reduce:animate-none'
          : ''
      }
    >
      {(drawdown !== null || hasDetail) && (
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          disabled={!hasDetail}
          className={`mt-3 flex w-full items-center justify-between gap-3 text-left text-caption text-ai-text-muted ${
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
            <span aria-hidden="true" className="flex-none text-body-2">
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
    </AiCard>
  );
}
