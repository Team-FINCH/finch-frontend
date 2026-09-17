import { useState } from 'react';

import { formatPercent } from '@/shared/lib/formatNumber';
import { type AiFinding, type AiIndicators } from '@/shared/types/ai/diagnosis';
import { BottomSheet } from '@/shared/ui/BottomSheet';

/**
 * `확인된 사항` 과 그 아래 `위험 지표` (FINCH-325).
 *
 * ## 위험 지표를 접었다
 *
 * 전에는 지표 6행 + 금리 민감도가 화면에 그대로 펼쳐져 있었다. 문제는 길이가
 * 아니라 **같은 사실이 세 번 나오는 것**이었다 — 상위 종목 비중 43%가 AI 문장 ·
 * `포트폴리오 상태` 집중도 줄 · 여기 `1위 종목 비중` 에 각각 다른 말투와 다른
 * 반올림(43.2% / 43% / 43%)으로 적혔다.
 *
 * **지우지 않고 옮겼다.** `CauseTab` 이 종목 행에서 뺀 공시를 `분석 자세히 보기`
 * 시트로 옮긴 것과 같은 처리다 — 원본 숫자를 확인하려는 사용자의 길은 남기고,
 * 처음 읽는 사용자의 동선에서는 뺀다.
 *
 * 시트 안에서는 반올림을 화면과 맞추지 않고 **정수 %** 를 그대로 쓴다(프로토타입
 * `toFixed(0)`, proto L4000-4001). 여기가 원본을 보러 오는 자리라 자릿수를
 * 늘리고 싶었지만, 응답이 주는 값 자체가 `0.4168` 이고 더 정밀하게 적으면 화면
 * 다른 자리와 **다른 숫자처럼** 보인다.
 *
 * ## `findings[]` 순서를 건드리지 않는다
 *
 * 배열 정렬 순서가 곧 중요도 순위다(`ai/diagnosis.ts`). 프론트가 `severity` 로
 * 다시 정렬하면 엔진이 같은 심각도 안에서 매긴 순서를 잃는다.
 */

const SEVERITY_LABEL = { high: '높음', medium: '보통', info: '참고' } as const;

type DiagnosisFindingSectionProps = {
  findings: AiFinding[];
  indicators: AiIndicators;
};

export function DiagnosisFindingSection({
  findings,
  indicators,
}: DiagnosisFindingSectionProps) {
  const [indicatorsOpen, setIndicatorsOpen] = useState(false);

  return (
    <section className="mt-12">
      <h2 className="mb-3.5 text-section-title text-text-primary">
        확인된 사항
      </h2>

      {findings.length === 0 ? (
        <p className="py-3.5 text-body-1 text-text-secondary">
          특별히 짚어드릴 사항이 없어요.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {findings.map((finding) => (
            <div key={finding.id} className="py-3.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 flex-none items-center rounded-xs bg-surface-soft px-1.5 text-caption font-medium text-text-secondary">
                  {SEVERITY_LABEL[finding.severity]}
                </span>
                <span className="text-body-1 font-semibold text-text-primary">
                  {finding.title}
                </span>
              </div>
              {finding.text !== null && (
                <p className="mt-1.5 text-body-2 text-pretty text-text-secondary">
                  {finding.text}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setIndicatorsOpen(true)}
        className="mt-4 text-body-2 font-medium text-text-secondary"
      >
        위험 지표 자세히 보기 ›
      </button>

      <BottomSheet
        open={indicatorsOpen}
        onOpenChange={setIndicatorsOpen}
        title="위험 지표"
      >
        <div className="flex flex-col gap-2.5">
          <IndicatorRow label="1위 종목 비중" ratio={indicators.top1Weight} />
          <IndicatorRow label="상위 3종목 비중" ratio={indicators.top3Weight} />
          <IndicatorRow label="섹터 집중도(HHI)" ratio={indicators.sectorHhi} />
          <IndicatorRow
            label="연환산 변동성"
            ratio={indicators.annualizedVolatility}
          />
          <IndicatorRow
            label="최근 1년 최대 낙폭"
            ratio={indicators.maxDrawdown1y}
          />
          <IndicatorRow label="현금 비중" ratio={indicators.cashRatio} />
        </div>

        {/*
          금리 민감도는 비율이 아니라 문자열이다(`high` 등). **열거값을 그대로
          내보내지 않는다** — `design.md` §13 이 시스템 용어 노출을 막는다.
          `RiskScoreHero` 의 등급과 같은 3단이라 같은 사전을 쓴다.
        */}
        {indicators.rateSensitivity !== null && (
          <p className="mt-4 text-caption text-text-secondary">
            금리 민감도 {rateSensitivityLabel(indicators.rateSensitivity)}
          </p>
        )}

        <p className="mt-4 text-caption text-pretty text-text-muted">
          모두 규칙 엔진이 계산한 값이에요. FINCH가 지어낸 숫자는 없어요.
        </p>
      </BottomSheet>
    </section>
  );
}

/**
 * 비율은 프로토타입과 같은 정수 % 다 (`toFixed(0)`, proto L4000-4001).
 * 계산되지 않은 지표는 0 이 아니라 `null` 이라 `—` 로 비운다.
 */
function IndicatorRow({
  label,
  ratio,
}: {
  label: string;
  ratio: number | null;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-body-2 text-text-secondary">{label}</span>
      <span className="text-body-1 font-medium text-text-primary tabular-nums">
        {ratio === null ? '—' : formatPercent(ratio, 0)}
      </span>
    </div>
  );
}

/**
 * `rateSensitivity` 는 스키마가 `string` 이라(열거로 굳지 않았다) 모르는 값이 올 수
 * 있다. **그때는 서버 값을 그대로 내보내지 않고 이 줄을 접는 쪽이 아니라 원문을
 * 보여준다** — 화면이 값을 삼키면 지표가 없는 것과 구분이 안 되고, 원문이 영어면
 * 그것이 계약이 늘어난 신호라 다음 사람이 이 사전에 한 줄을 더하면 된다.
 */
function rateSensitivityLabel(rateSensitivity: string): string {
  const known: Record<string, string> = {
    low: '낮음',
    moderate: '보통',
    high: '높음',
  };
  return known[rateSensitivity] ?? rateSensitivity;
}
