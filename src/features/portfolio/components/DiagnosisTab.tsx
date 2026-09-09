import { isHttpError } from '@/shared/api';
import { isRetryableAiErrorCode } from '@/shared/lib/aiErrorRetry';
import { formatPercent } from '@/shared/lib/formatNumber';
import { AI_SERVICE_ERROR_CODES } from '@/shared/types/errorCodes';
import { AiCard } from '@/shared/ui/AiCard';
import { AiCitationList } from '@/shared/ui/AiCitationList';
import { AiStatus } from '@/shared/ui/AiStatus';
import { Skeleton } from '@/shared/ui/Skeleton';

import { usePortfolioDiagnosis } from '../api/usePortfolioDiagnosis';

const SEVERITY_LABEL = { high: '높음', medium: '보통', info: '참고' } as const;

/**
 * "AI 진단" 탭 (프로토타입 `isPfDiag` 블록, AI 슬롯 5번).
 *
 * **프로토타입의 "포트폴리오 상태"(등급 막대)·"종목 집중도"(색색 스택 바)는
 * 그대로 옮기지 않는다.** 그 UI는 프로토타입 고유의 가상 등급 체계(우수/보통/주의)를
 * 전제로 하는데, 실제 `POST /ai/portfolio/diagnosis` 응답(`AiDiagnosisContent`)은
 * `findings[]`(문제 항목 배열)와 `indicators`(숫자 지표)만 준다 — 등급·막대색을
 * 프론트가 지어내면 "프론트는 AI 응답을 조립하지 않는다"(ia.md §4)를 어긴다.
 * 그래서 실제 스키마를 그대로 보여주는 목록형 레이아웃으로 다시 짰다.
 *
 * **피드백을 붙이지 않는다.** 프로토타입 실제 UI에서 피드백이 붙는 자리는 셋뿐이고
 * 이 탭은 그중 하나가 아니다(ia.md §4 "피드백 슬롯 배치 규칙" 각주).
 */
export function DiagnosisTab() {
  const { data, isPending, isError, error, refetch } =
    usePortfolioDiagnosis(true);

  if (isPending) {
    return (
      <div className="flex flex-col gap-3 pt-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError) {
    const code = isHttpError(error) ? (error.code ?? undefined) : undefined;
    const message = isHttpError(error)
      ? error.message
      : '분석을 불러오지 못했어요';

    if (code === AI_SERVICE_ERROR_CODES.INSUFFICIENT_DATA) {
      return (
        <AiStatus
          title="아직 분석할 정보가 충분하지 않아요"
          description={
            <>
              투자 기록이 조금 더 쌓이면
              <br />
              FINCH가 진단해드릴게요.
            </>
          }
        />
      );
    }

    return (
      <AiStatus
        code={code}
        title={
          isRetryableAiErrorCode(code) ? '분석을 불러오지 못했어요' : message
        }
        description="잠시 후 다시 시도해 주세요."
        onRetry={() => void refetch()}
      />
    );
  }

  if (data === undefined) {
    return null;
  }

  const { riskScore, summary, findings, indicators, aiMeta } = data;

  return (
    <div className="pt-4">
      <AiCard
        label="AI 진단"
        headline={summary?.text ?? '진단 결과를 준비하지 못했어요.'}
        caption={riskScore === null ? undefined : `위험 점수 ${riskScore}/100`}
      />

      <div className="mt-8">
        <h2 className="mb-3.5 text-title-3 text-text-primary">확인된 사항</h2>
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
      </div>

      <div className="mt-8">
        <h2 className="mb-3.5 text-title-3 text-text-primary">위험 지표</h2>
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
        {indicators.rateSensitivity !== null && (
          <p className="mt-3 text-caption text-text-secondary">
            금리 민감도 {indicators.rateSensitivity}
          </p>
        )}
      </div>

      <AiCitationList citations={aiMeta.citations} className="mt-6" />

      <p className="mt-6 text-caption text-text-secondary">
        {aiMeta.disclaimer}
      </p>
    </div>
  );
}

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
        {ratio === null ? '—' : formatPercent(ratio)}
      </span>
    </div>
  );
}
