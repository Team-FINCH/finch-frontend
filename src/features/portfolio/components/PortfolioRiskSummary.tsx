import {
  type AiFinding,
  type AiIndicators,
  type AiRiskLevel,
} from '@/shared/types/ai/diagnosis';

import { METRIC_FINDING_ID, gradeOf, type RiskGrade } from '../lib/riskGrade';
import { useCountUp } from '../lib/useDiagnosisIntro';

/**
 * 위험도 — 점수 · 막대 · 지표 3열 (FINCH-325 · 334).
 *
 * ## 카드를 벗었다 (FINCH-334)
 *
 * 흰 면 + 테두리 + 반경이 있었고, 그 **안에** 지표 3열을 가르는 테두리가 하나 더
 * 있었다. 같은 화면에 종목 집중도 카드까지 서서 면이 셋이었다.
 *
 * 이제 페이지 배경(`--color-bg`) 위 flat 섹션이다. **면을 갖는 것은 검정 AI 카드
 * 하나뿐이고**, 이 섹션과 종목 집중도는 위아래 36px 여백으로만 갈린다. 구분선도
 * 새로 긋지 않는다 — 선을 그으면 테두리를 지우고 선을 얻는 것이라 상자가 다시
 * 생긴다.
 *
 * ## 점수 한 줄
 *
 * ```
 * 내 포트폴리오 위험도                     ← 14px --t3
 * 62 / 100 · 보통                        ← 44/700 · 18 --t3 · 16/600 --t2
 * ████████████░░░░░░░░                   ← 6px, 채움 --t1
 * ```
 *
 * **`보통` pill 을 없앴다.** 오른쪽 끝에 회색 면 배지로 떠 있었는데, 점수와 같은
 * 것을 말하면서 자리는 멀어서 눈이 두 번 움직였다. 같은 줄 끝에 글자로 붙이면
 * `62 / 100 · 보통` 이 한 호흡으로 읽힌다. 면이 하나 줄어드는 것은 덤이다.
 *
 * 막대 채움은 `--color-text-primary` 다. **점수에 상태색을 쓰지 않는다** —
 * `design.md` §7.9 가 "상태색은 등급 막대와 종목 집중도 스택 바 안에서만" 으로
 * 묶었고, 여기서 색을 쓰면 화면에서 가장 큰 상태색 덩어리가 된다. 높낮이는
 * 길이가 말한다.
 *
 * ## 지표 3열
 *
 * 라벨 13px `--t3` / 상태 17px / 보조값 13px `--t2` 다.
 *
 * **상태 글자에 빨강·주황·초록을 쓰지 않는다.** 빨강·파랑은 등락색이라
 * (컨벤션 §11) 위험도 판정에 쓰면 같은 화면에서 두 뜻이 된다. 주황·초록을
 * 더하면 이 줄에만 쓰이는 상태색 체계가 새로 생긴다.
 *
 * 대신 **가장 나쁜 칸 하나만** 700 굵기 + 앞에 6px 점(`--color-attention-dot`)이다.
 * 나머지는 600 · `--t2`. 셋 중 어디를 봐야 하는지는 그 둘로 충분하고, 무엇이
 * 얼마나 나쁜지는 눌러서 계산 기준 시트에서 본다.
 *
 * `severity` 순위는 `high > medium > info > none` 이고, 같으면 왼쪽이 이긴다 —
 * 순서는 화면이 정한 `집중도 → 업종 집중 → 변동성` 이다.
 *
 * ## 집중도 값의 출처가 바뀌었다 (FINCH-334)
 *
 * 전에는 엔진 `indicators.top1Weight` 였다. 이제 호출부가 **원장에서 계산한 1위
 * 비중**을 넘긴다 — 아래 종목 집중도 섹션의 스택 바·목록과 같은 값이라야 화면이
 * 자기모순을 일으키지 않는다. 근거는 `lib/concentration.ts` 주석에 있다.
 * 엔진 값은 `AnalysisEvidenceSheet`(계산 기준)에 그대로 남는다.
 */

/** 규칙 엔진의 3단 판정 (AI 명세 §5). LLM 이 정하는 값이 아니다. */
const RISK_LEVEL_LABEL: Record<AiRiskLevel, string> = {
  low: '낮음',
  moderate: '보통',
  high: '높음',
};

/**
 * `severity` 를 견주기 위한 순위.
 *
 * **`none` 을 포함한다.** `gradeOf` 는 걸린 항목이 없으면 `RISK_GRADE.none` 을
 * 돌려주는데, 그 값은 응답의 `findings[].severity`(셋)에는 없는 **화면 쪽 상태**다.
 * 그래서 `AiFinding['severity']` 가 아니라 `RiskGrade['severity']` 로 받는다.
 */
const SEVERITY_RANK: Record<RiskGrade['severity'], number> = {
  none: 0,
  info: 1,
  medium: 2,
  high: 3,
};

type PortfolioRiskSummaryProps = {
  riskScore: number | null;
  riskLevel: AiRiskLevel | null;
  /** 변동성·상관을 계산하지 못한 사유. 정상이면 `null` */
  insufficientHistory: string | null;
  findings: AiFinding[];
  indicators: AiIndicators;
  /** 원장 기준 1위 종목 비중(0~100). 없으면 `null` */
  top1Percent: number | null;
  /** 지표를 누르면 계산 기준·근거 시트를 연다 */
  onOpenDetail: () => void;
  /**
   * 머리줄 오른쪽 링크의 근거 개수 (FINCH-341). `0` 이면 `계산 기준 ›` 이다 —
   * 근거가 없어도 계산 기준은 늘 있으므로 링크를 감추지 않는다.
   */
  citationCount: number;
  intro: boolean;
};

export function PortfolioRiskSummary({
  riskScore,
  riskLevel,
  insufficientHistory,
  findings,
  indicators,
  top1Percent,
  onOpenDetail,
  citationCount,
  intro,
}: PortfolioRiskSummaryProps) {
  const levelLabel = riskLevel === null ? null : RISK_LEVEL_LABEL[riskLevel];
  const shownScore = useCountUp(riskScore, { enabled: intro });

  const metrics = [
    {
      label: '집중도',
      grade: gradeOf(findings, METRIC_FINDING_ID.concentration),
      value: top1Percent === null ? null : `${Math.round(top1Percent)}%`,
    },
    {
      label: '업종 집중',
      grade: gradeOf(findings, METRIC_FINDING_ID.sectorConcentration),
      // **`sectorHhi` 를 % 로 적지 않는다.** 허핀달 지수는 비중이 아니라
      // `41%` 로 쓰면 "어느 업종이 41%" 로 읽힌다. 개수는 그런 오해가 없다.
      value: sectorCountText(indicators.sectorCount),
    },
    {
      label: '변동성',
      grade: gradeOf(findings, METRIC_FINDING_ID.volatility),
      value: percentOrNull(indicators.annualizedVolatility),
    },
  ];

  const worstRank = Math.max(
    ...metrics.map((metric) => SEVERITY_RANK[metric.grade.severity]),
  );
  // 가장 나쁜 칸 **하나**만 표시한다. 같은 등급이 둘이면 왼쪽이 이긴다.
  const worstIndex =
    worstRank === 0
      ? -1
      : metrics.findIndex(
          (metric) => SEVERITY_RANK[metric.grade.severity] === worstRank,
        );

  return (
    <section
      className={`mt-9 ${
        intro
          ? 'animate-[diag-fade_480ms_var(--ease-standard)_260ms_both] motion-reduce:animate-none'
          : ''
      }`}
    >
      {/* 머리줄 오른쪽이 근거·계산 기준 진입이다 (FINCH-341).

          전에는 이 탭 맨 아래에 `근거 2개 · 계산 기준 보기 ›` 한 줄로 따로 있었다.
          읽는 순서(결론 → 근거 → 상세)로는 맞는 자리였지만, 목록이 끝난 뒤
          한참 아래라 **닿으려면 화면 하나를 더 내려야 했다.** 위험도 지표 3열이
          이미 같은 시트를 여는 만큼(`onOpenDetail`) 그 블록의 머리에 두는 편이
          가깝다.

          **문구를 줄였다.** 원래 `근거 N개 · 계산 기준 보기` 였는데 머리줄은
          왼쪽 라벨과 폭을 나눠 쓰는 자리다 — 최소 지원 320px 에서 둘을 합치면
          넘친다(라벨 14px 9자 ≈ 130px + 원래 문구 13px ≈ 160px + 셰브런·간격).
          `보기` 와 `계산 기준` 은 셰브런과 시트 제목이 대신 말해 준다.

          높이를 키우지 않고 누를 자리만 넓힌다 — `before:` 로 위아래를 14px 씩
          늘려 46px 을 만든다(design.md §12 최소 터치 영역 44px). `py` 를 주면
          머리줄이 두꺼워져 점수와의 간격이 어긋난다. */}
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-label text-text-muted">
          내 포트폴리오 위험도
        </p>
        <button
          type="button"
          onClick={onOpenDetail}
          className="relative flex flex-none items-center gap-1 text-caption text-text-secondary before:absolute before:inset-x-0 before:-inset-y-3.5 before:content-['']"
        >
          {citationCount > 0 ? `근거 ${citationCount}개` : '계산 기준'}
          <span aria-hidden="true" className="text-text-muted">
            ›
          </span>
        </button>
      </div>

      {riskScore === null ? (
        // 판정 보류. 점수 자리를 0 으로 채우지 않는다 — 없는 값이 최상위 점수로 읽힌다.
        <p className="mt-2 text-title-2 text-text-secondary">판정 보류</p>
      ) : (
        <p className="mt-2 flex items-baseline gap-1.5">
          <span className="text-[44px] leading-[52px] font-bold text-text-primary tabular-nums">
            {shownScore ?? 0}
          </span>
          <span className="text-[18px] font-medium text-text-muted">/ 100</span>
          {levelLabel !== null && (
            <span className="text-body-1 font-semibold text-text-secondary">
              · {levelLabel}
            </span>
          )}
        </p>
      )}

      {riskScore !== null && (
        <span
          aria-hidden="true"
          className="mt-3.5 block h-1.5 w-full overflow-hidden rounded-full bg-border"
        >
          <span
            className={`block h-full origin-left rounded-full bg-primary ${
              intro
                ? 'animate-[diag-grow_900ms_cubic-bezier(.2,.8,.2,1)_300ms_both] motion-reduce:animate-none'
                : ''
            }`}
            style={{ width: `${Math.min(Math.max(riskScore, 0), 100)}%` }}
          />
        </span>
      )}

      {/*
        계산이 막힌 사유는 **서버 문장을 그대로 내보내지 않는다.**
        `insufficient_history` 의 형식이 명세에 "string" 으로만 적혀 있어 사용자용
        한국어라는 보장이 없다. 값의 유무만 읽고 문구는 우리가 쓴다 — `design.md` §13.
      */}
      {insufficientHistory !== null && (
        <p className="mt-2.5 text-caption text-text-muted">
          거래 기록이 짧아 변동성은 아직 비어 있어요.
        </p>
      )}

      {/*
        지표 3열. 전체를 하나의 버튼으로 둔다 — 칸마다 버튼을 두면 3열이 좁아 터치
        영역이 겹치고, 어느 칸을 눌러도 열리는 곳이 같은 시트라 나눌 이유가 없다.
        **안쪽 테두리를 걷었다** — 카드를 벗은 마당에 칸막이만 남으면 상자의 흔적이다.
      */}
      <button
        type="button"
        onClick={onOpenDetail}
        aria-label="지표 계산 기준 보기"
        className="-mx-1 mt-5 grid w-[calc(100%+0.5rem)] grid-cols-3 gap-3 rounded-sm px-1 py-1 text-left active:bg-primary-soft"
      >
        {metrics.map((metric, index) => (
          <MetricCell
            key={metric.label}
            label={metric.label}
            text={metric.grade.label}
            value={metric.value}
            attention={index === worstIndex}
          />
        ))}
      </button>
    </section>
  );
}

/**
 * 지표 한 칸. 라벨 → 상태 → 보조값 순서다. 상태를 값보다 위에 두는 이유는
 * **판정이 먼저 읽혀야** 하기 때문이다 — 숫자만으로는 좋은지 나쁜지 알 수 없다.
 *
 * 값이 없으면 칸을 비운다(`null`). `—` 를 넣으면 세 칸의 리듬은 맞지만
 * "계산되지 않음" 이 "0 에 가까움" 으로 읽힌다.
 */
function MetricCell({
  label,
  text,
  value,
  attention,
}: {
  label: string;
  text: string;
  value: string | null;
  attention: boolean;
}) {
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <span className="truncate text-caption text-text-muted">{label}</span>

      <span
        className={`flex min-w-0 items-center gap-1.5 text-[17px] leading-[24px] ${
          attention
            ? 'font-bold text-text-primary'
            : 'font-semibold text-text-secondary'
        }`}
      >
        {attention && (
          <span
            aria-hidden="true"
            className="size-1.5 flex-none rounded-full bg-attention-dot"
          />
        )}
        <span className="truncate">{text}</span>
      </span>

      {value !== null && (
        <span className="truncate text-caption text-text-secondary tabular-nums">
          {value}
        </span>
      )}
    </span>
  );
}

/** 자릿수는 프로토타입과 같은 정수 % 다 (`toFixed(0)`, proto L4000-4002). */
function percentOrNull(ratio: number | null): string | null {
  return ratio === null ? null : `${Math.round(ratio * 100)}%`;
}

/** 한 업종뿐이면 개수를 세는 말이 어색해 표현을 갈아탄다. */
function sectorCountText(sectorCount: number | null): string | null {
  if (sectorCount === null) {
    return null;
  }
  return sectorCount <= 1 ? '한 업종' : `${sectorCount}개 업종`;
}
