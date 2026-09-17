import {
  type AiFinding,
  type AiIndicators,
  type AiRiskLevel,
} from '@/shared/types/ai/diagnosis';
import { Card } from '@/shared/ui/Card';

import { METRIC_FINDING_ID, type RiskGrade, gradeOf } from '../lib/riskGrade';

/**
 * AI 진단 Hero — 점수 · 등급 · 핵심 위험 한 줄 · KPI 3열 (FINCH-325).
 *
 * ## 네 덩어리를 한 카드로 합쳤다
 *
 * 전에는 `위험 점수`(히어로) · `포트폴리오 상태`(3행 막대) 가 세로로 따로 서서
 * 첫 화면을 거의 다 먹었다. 둘 다 **같은 질문에 답하는 값**이라(계좌가 지금 어떤
 * 상태인가) 한 면에 넣고 세로를 KPI 3열로 접었다.
 *
 * ## 옅은 브랜드 틴트를 쓰지 않았다
 *
 * 흰 `Card` + 테두리다. `--color-primary-soft`(#F0F1F3)는 `styles/index.css` 가
 * **"선택된 상태 하나에만 쓰인다"** 고 용도를 좁혀 둔 토큰이고, 브랜드색 자체가
 * 코발트가 아니라 그래파이트라 틴트를 깔아도 회색 면이 하나 더 생기는 것에
 * 가깝다. 점수 36px 이 이미 시선을 잡으므로 면색으로 한 번 더 강조하지 않는다.
 *
 * ## 한 줄 문장은 우리가 쓰지 않는다
 *
 * `findings[0].title` 이다. **배열 순서가 곧 중요도 순위**라(`ai/diagnosis.ts`)
 * 서버가 이미 "가장 큰 문제"를 문장으로 준다. 프론트가 지표를 보고 "집중도가 조금
 * 높은 편이에요" 를 지어내면 임계값 판정을 새로 하는 것이고 `ia.md` §4 "프론트는
 * AI 응답을 조립하지 않는다" 를 어긴다. 걸린 항목이 없으면 이 줄을 접는다.
 *
 * 등급 라벨의 색은 `lib/riskGrade` 가 갖는다 — 아래 `ConcentrationCard` 의 배지와
 * 같은 사전을 쓴다. 같은 말이 한 화면에서 두 색으로 보이면 안 된다.
 *
 * ## 점수에 색을 얹지 않는다
 *
 * `design.md` §7.9 가 "상태색은 등급 막대와 종목 집중도 스택 바 안에서만 쓴다" 고
 * 못박았다. 36px 숫자를 칠하면 화면에서 가장 큰 상태색 덩어리가 된다. 높낮이는
 * 등급 배지가 말한다.
 */

/** 규칙 엔진의 3단 판정 (AI 명세 §5). LLM 이 정하는 값이 아니다. */
const RISK_LEVEL_LABEL: Record<AiRiskLevel, string> = {
  low: '낮음',
  moderate: '보통',
  high: '높음',
};

type PortfolioRiskSummaryProps = {
  riskScore: number | null;
  riskLevel: AiRiskLevel | null;
  /** 변동성·상관을 계산하지 못한 사유. 정상이면 `null` */
  insufficientHistory: string | null;
  findings: AiFinding[];
  indicators: AiIndicators;
  /** KPI 를 누르면 계산 기준·근거 시트를 연다 */
  onOpenDetail: () => void;
};

export function PortfolioRiskSummary({
  riskScore,
  riskLevel,
  insufficientHistory,
  findings,
  indicators,
  onOpenDetail,
}: PortfolioRiskSummaryProps) {
  const levelLabel = riskLevel === null ? null : RISK_LEVEL_LABEL[riskLevel];
  const headline = findings.at(0)?.title ?? null;

  return (
    <Card className="mt-4">
      <p className="text-caption text-text-muted">내 포트폴리오 위험도</p>

      <div className="mt-1.5 flex items-center justify-between gap-3">
        {riskScore === null ? (
          // 판정 보류. 점수 자리를 0 으로 채우지 않는다 — 없는 값이 최상위 점수로 읽힌다.
          <p className="text-title-2 text-text-secondary">판정 보류</p>
        ) : (
          <p className="text-display text-text-primary tabular-nums">
            {riskScore}
            <span className="text-[18px] font-medium text-text-muted">
              {' '}
              / 100
            </span>
          </p>
        )}

        {levelLabel !== null && (
          <span className="flex h-7 flex-none items-center rounded-tag bg-surface-soft px-2.5 text-body-2 font-semibold text-text-primary">
            {levelLabel}
          </span>
        )}
      </div>

      {headline !== null && (
        <p className="mt-2 text-body-2 text-pretty text-text-secondary">
          {headline}
        </p>
      )}

      {/*
        계산이 막힌 사유는 **서버 문장을 그대로 내보내지 않는다.**
        `insufficient_history` 의 형식이 명세에 "string" 으로만 적혀 있어 사용자용
        한국어라는 보장이 없다(`only 23 common trading days` 같은 진단 문구가 올 수
        있다). 값의 유무만 읽고 문구는 우리가 쓴다 — `design.md` §13.
      */}
      {insufficientHistory !== null && (
        <p className="mt-2 text-caption text-text-muted">
          거래 기록이 짧아 변동성은 아직 비어 있어요.
        </p>
      )}

      {/*
        KPI 3열. 전체를 하나의 버튼으로 둔다 — 칸마다 버튼을 두면 3열이 좁아 터치
        영역이 겹치고, 어느 칸을 눌러도 열리는 곳이 같은 시트라 나눌 이유가 없다.
      */}
      <button
        type="button"
        onClick={onOpenDetail}
        aria-label="지표 계산 기준 보기"
        className="-mx-1 mt-4 flex w-[calc(100%+0.5rem)] items-start gap-2 rounded-sm border-t border-border px-1 pt-4 text-left active:bg-primary-soft"
      >
        <MetricCell
          label="집중도"
          grade={gradeOf(findings, METRIC_FINDING_ID.concentration)}
          value={percentOrNull(indicators.top1Weight)}
        />
        <MetricCell
          label="업종 집중"
          grade={gradeOf(findings, METRIC_FINDING_ID.sectorConcentration)}
          // **`sectorHhi` 를 % 로 적지 않는다.** 허핀달 지수는 비중이 아니라
          // `41%` 로 쓰면 "어느 업종이 41%" 로 읽힌다. 개수는 그런 오해가 없다.
          value={sectorCountText(indicators.sectorCount)}
        />
        <MetricCell
          label="변동성"
          grade={gradeOf(findings, METRIC_FINDING_ID.volatility)}
          value={percentOrNull(indicators.annualizedVolatility)}
        />
        <span
          aria-hidden="true"
          className="flex-none self-center text-body-2 text-text-muted"
        >
          ›
        </span>
      </button>
    </Card>
  );
}

/**
 * KPI 한 칸. 라벨 → 등급 → 값 순서다. 등급을 값보다 위에 두는 이유는 **판정이
 * 먼저 읽혀야** 하기 때문이다 — 숫자만으로는 좋은지 나쁜지 알 수 없다.
 *
 * 값이 없으면 칸을 비운다(`null`). `—` 를 넣으면 세 칸의 리듬은 맞지만 "계산되지
 * 않음" 이 "0 에 가까움" 으로 읽힌다.
 */
function MetricCell({
  label,
  grade,
  value,
}: {
  label: string;
  grade: RiskGrade;
  value: string | null;
}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="truncate text-caption text-text-muted">{label}</span>
      <span
        className="truncate text-body-2 font-bold"
        style={{ color: grade.color }}
      >
        {grade.label}
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
