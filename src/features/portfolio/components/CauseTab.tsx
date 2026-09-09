import { useState } from 'react';

import { isHttpError } from '@/shared/api';
import { isRetryableAiErrorCode } from '@/shared/lib/aiErrorRetry';
import { formatSignedPercent } from '@/shared/lib/formatNumber';
import { type AiAttributionRow } from '@/shared/types/ai/attribution';
import { AI_SERVICE_ERROR_CODES } from '@/shared/types/errorCodes';
import { AiCard } from '@/shared/ui/AiCard';
import { AiCitationList } from '@/shared/ui/AiCitationList';
import { AiStatus } from '@/shared/ui/AiStatus';
import { Skeleton } from '@/shared/ui/Skeleton';

import { usePortfolioAttribution } from '../api/usePortfolioAttribution';

import { AiFeedbackRow } from './AiFeedbackRow';

const DIRECTION_TEXT_CLASS = {
  up: 'text-stock-up',
  down: 'text-stock-down',
} as const;

/**
 * "수익률 분석" 탭 (프로토타입 `isPfCause` 블록, AI 슬롯 2번).
 * 프로토타입 실제 UI에서 피드백이 붙는 확정된 세 자리 중 하나다
 * (ia.md §4 "피드백 슬롯 배치 규칙" 각주 — 종목 상세 AI 탭 · AI 채팅 · 여기).
 *
 * `breakdown`(시장·업종·종목 선택)에 프로토타입은 `{{a.note}}`라는 설명 문구를
 * 함께 그리지만, 실제 응답 스키마(`AiAttributionContent.breakdown`)에는 항목별
 * 설명 필드가 없다 — 값과 라벨만 표시하고 문구를 지어내지 않는다.
 */
export function CauseTab() {
  const { data, isPending, isError, error, refetch } =
    usePortfolioAttribution(true);
  const [infoOpen, setInfoOpen] = useState(false);

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
      // TODO(계약): 개인화가 열리는 최소 데이터 건수가 임시값이다 — 이슈 #26 3번,
      // PRD 자신이 "임시값"이라고 적었다(ia.md §7). 숫자를 하드코딩하지 않는다.
      return (
        <AiStatus
          title="아직 분석할 정보가 충분하지 않아요"
          description="투자 기록이 조금 더 쌓이면 수익률 원인을 짚어드릴게요."
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

  const {
    portfolioReturn,
    excessReturn,
    breakdown,
    contributors,
    detractors,
    notes,
    summary,
    aiMeta,
  } = data;
  const rows: (AiAttributionRow & { tone: 'up' | 'down' })[] = [
    ...contributors.map((row) => ({ ...row, tone: 'up' as const })),
    ...detractors.map((row) => ({ ...row, tone: 'down' as const })),
  ];

  return (
    <div className="pt-4">
      <AiCard
        label="AI 수익 분석"
        headline={summary?.text ?? '수익률 원인 분석을 준비하지 못했어요.'}
        caption={`기간 수익률 ${formatSignedPercent(portfolioReturn)} · 초과수익률 ${formatSignedPercent(excessReturn)}`}
      />

      <div className="relative mt-8 mb-6 flex items-center gap-1.75">
        <h2 className="text-title-3 text-text-primary">
          무엇이 영향을 줬나요?
        </h2>
        <button
          type="button"
          aria-label="계산 기준 보기"
          onClick={() => setInfoOpen((prev) => !prev)}
          className="flex size-5 flex-none items-center justify-center rounded-full border border-text-muted text-caption text-text-muted"
        >
          ?
        </button>
        {infoOpen && (
          <div className="absolute top-full left-0 z-10 mt-2 flex items-start gap-2.5 rounded-md bg-text-primary p-3.5 text-surface shadow-float">
            <span className="flex-1 text-caption text-pretty text-surface/86">
              내 자산의 변화를 시장 · 업종 · 종목으로 나눠봤어요. 각 값은 계산
              기준이 달라서 그대로 더해지지 않아요.
            </span>
            <button
              type="button"
              aria-label="닫기"
              onClick={() => setInfoOpen(false)}
              className="flex-none text-caption text-surface/50"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <span className="text-body-1 font-medium text-text-primary">
            시장
          </span>
          <span className="text-body-1 font-bold text-text-primary tabular-nums">
            {formatSignedPercent(breakdown.market)}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-body-1 font-medium text-text-primary">
            업종
          </span>
          <span className="text-body-1 font-bold text-text-primary tabular-nums">
            {formatSignedPercent(breakdown.sector)}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-body-1 font-medium text-text-primary">
            종목 선택
          </span>
          <span className="text-body-1 font-bold text-text-primary tabular-nums">
            {formatSignedPercent(breakdown.selection)}
          </span>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-title-3 text-text-primary">종목별 기여</h2>
          <span className="text-caption text-text-secondary">
            {rows.length}종목
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="py-3.5 text-body-1 text-text-secondary">
            이 기간 동안 특별한 기여가 없었어요.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {rows.map((row) => {
              const event = row.events[0];
              return (
                <div
                  key={row.ticker}
                  className="flex items-center gap-3 py-3.5"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-9 flex-none items-center justify-center rounded-12 bg-surface-soft text-body-2 font-bold text-text-secondary"
                  >
                    {row.name.slice(0, 1)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.75">
                    <span className="truncate text-body-1 font-medium text-text-primary">
                      {row.name}
                    </span>
                    <span className="truncate text-caption text-text-secondary">
                      {event === undefined ? row.sector : event.title}
                    </span>
                  </span>
                  <span className="flex-none text-right">
                    <span
                      className={`block text-body-1 font-bold tabular-nums ${DIRECTION_TEXT_CLASS[row.tone]}`}
                    >
                      {formatSignedPercent(row.contribution)}
                    </span>
                    <span
                      className={`text-caption tabular-nums ${DIRECTION_TEXT_CLASS[row.tone]}`}
                    >
                      {formatSignedPercent(row.return)}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {notes.length > 0 && (
        <div className="mt-6 border-t border-border pt-5">
          <h2 className="mb-2.5 text-title-3 text-text-primary">확인해볼 점</h2>
          <div className="flex flex-col gap-1.5">
            {notes.map((note) => (
              <p key={note} className="text-body-1 leading-6 text-text-primary">
                {note}
              </p>
            ))}
          </div>
        </div>
      )}

      <AiCitationList citations={aiMeta.citations} className="mt-6" />

      <p className="mt-5 text-caption leading-5 text-text-secondary">
        {aiMeta.disclaimer}
      </p>

      <AiFeedbackRow requestId={aiMeta.requestId} className="mt-5" />
    </div>
  );
}
