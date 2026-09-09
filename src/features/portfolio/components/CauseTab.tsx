import { useState } from 'react';

import { isHttpError } from '@/shared/api';
import { isRetryableAiErrorCode } from '@/shared/lib/aiErrorRetry';
import { formatKstTime } from '@/shared/lib/formatDate';
import {
  formatSignedPercent,
  getPriceDirection,
} from '@/shared/lib/formatNumber';
import { type AiAttributionRow } from '@/shared/types/ai/attribution';
import { AI_SERVICE_ERROR_CODES } from '@/shared/types/errorCodes';
import { AiCard } from '@/shared/ui/AiCard';
import { AiCitationList } from '@/shared/ui/AiCitationList';
import { AiFeedbackRow } from '@/shared/ui/AiFeedbackRow';
import { AiStatus } from '@/shared/ui/AiStatus';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';

import { usePortfolioAttribution } from '../api/usePortfolioAttribution';

const DIRECTION_TEXT_CLASS = {
  up: 'text-stock-up',
  down: 'text-stock-down',
} as const;

const RATIO_TEXT_CLASS = {
  rise: 'text-stock-up',
  fall: 'text-stock-down',
  flat: 'text-stock-neutral',
} as const;

/** 프로토타입이 `.sht` 를 덮어 쓰는 이 탭의 소제목 셋 (proto L2305, L2327, L2347). */
const SUBTITLE_CLASS =
  'text-[20px] font-bold tracking-[-0.02em] text-text-primary';

/** 프로토타입 `.info` — 18px 원 · 1.4px 테두리 · 11px/700 · 왼쪽 5px (proto L1146). */
const INFO_BUTTON_CLASS =
  'ml-1.25 flex size-4.5 flex-none items-center justify-center rounded-full ' +
  'border-[1.4px] border-text-muted text-[11px] font-bold text-text-muted';

/** 프로토타입 `.pop` — 화면 폭에 붙고(left/right 0) 반경 12px · 패딩 13/14 (proto L1118). */
const POPOVER_CLASS =
  'absolute top-full right-0 left-0 z-10 mt-2 flex items-start gap-2.5 ' +
  'rounded-12 bg-text-primary px-3.5 py-[13px] text-surface shadow-float';

const BREAKDOWN_LABEL = {
  market: '시장 영향',
  sector: '업종 영향',
  selection: '종목 선택',
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
      //
      // 이 탭은 두 상태의 모양이 갈린다 — 실패는 `.aist`(원반 글리프), 데이터
      // 부족은 `.est`(전면 빈 상태)다(proto L2287-2294). 그래서 여기만
      // `AiStatus` 가 아니라 `EmptyState` 를 쓴다. 캐릭터 일러스트와 보조 줄
      // `현재 {N}건` 은 아직 없다 — 에셋이 프로토타입 번들 안에만 있고
      // 거래 건수를 주는 필드가 응답에 없다.
      return (
        <EmptyState
          title="아직 분석할 정보가 충분하지 않아요"
          description="투자 기록이 조금 더 쌓이면 수익률 원인을 짚어드릴게요."
        />
      );
    }

    // 프로토타입은 이 자리의 `.aist` 여백을 44px 12px 로 덮어 쓴다(proto L2280).
    return (
      <AiStatus
        code={code}
        title={
          isRetryableAiErrorCode(code) ? '분석을 불러오지 못했어요' : message
        }
        description="잠시 후 다시 시도해 주세요."
        onRetry={() => void refetch()}
        className="px-3 py-11"
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
  const asOfLabel = aiMeta.dataAsOf.portfolio ?? aiMeta.dataAsOf.price;
  const rows: (AiAttributionRow & { tone: 'up' | 'down' })[] = [
    ...contributors.map((row) => ({ ...row, tone: 'up' as const })),
    ...detractors.map((row) => ({ ...row, tone: 'down' as const })),
  ];

  return (
    <div className="pt-4">
      <AiCard
        className="mb-10"
        label="AI 수익 분석"
        headline={summary?.text ?? '수익률 원인 분석을 준비하지 못했어요.'}
        caption={`기간 수익률 ${formatSignedPercent(portfolioReturn)} · 초과수익률 ${formatSignedPercent(excessReturn)}`}
      />

      <div className="relative mb-6 flex items-center gap-1.75">
        <h2 className={SUBTITLE_CLASS}>무엇이 영향을 줬나요?</h2>
        <button
          type="button"
          aria-label="계산 기준 보기"
          onClick={() => setInfoOpen((prev) => !prev)}
          className={INFO_BUTTON_CLASS}
        >
          ?
        </button>
        {infoOpen && (
          <div className={POPOVER_CLASS}>
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

      <div className="mb-10 flex flex-col gap-7.5">
        <BreakdownRow label={BREAKDOWN_LABEL.market} ratio={breakdown.market} />
        <BreakdownRow label={BREAKDOWN_LABEL.sector} ratio={breakdown.sector} />
        <BreakdownRow
          label={BREAKDOWN_LABEL.selection}
          ratio={breakdown.selection}
        />
      </div>

      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className={SUBTITLE_CLASS}>종목별 기여</h2>
          <span className="text-caption text-text-muted">
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
                    className="flex size-9 flex-none items-center justify-center rounded-[11px] bg-surface-soft text-[14px] font-bold text-text-secondary"
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
          <h2 className={`mb-2.5 ${SUBTITLE_CLASS}`}>확인해볼 점</h2>
          <div className="flex flex-col gap-1.5">
            {notes.map((note) => (
              <p
                key={note}
                className="text-body-1 leading-[25px] text-text-primary"
              >
                {note}
              </p>
            ))}
          </div>
        </div>
      )}

      <AiCitationList citations={aiMeta.citations} className="mt-6" />

      {/*
        기준 시각. AI 명세 §2.2 가 "UI 에 반드시 노출한다" 로 적었고 프로토타입도
        이 자리에 `{asOf} 기준` 을 둔다(proto L2353). 원천별로 값이 있는 것만
        고르는 것은 `StockAiTab` 과 같은 방식이다(contracts C54).
      */}
      <p className="mt-5 text-caption leading-5 text-text-secondary">
        {asOfLabel === null ? null : `${formatKstTime(asOfLabel)} 기준 · `}
        {aiMeta.disclaimer}
      </p>

      <AiFeedbackRow requestId={aiMeta.requestId} className="mt-5" />
    </div>
  );
}

/**
 * 시장·업종·종목 선택 한 줄 (프로토타입 `attribution`, proto L2314-2323).
 * 값에 등락색을 입힌다 — 부호만으로는 방향이 눈에 들어오지 않는다.
 * 프로토타입의 항목별 설명 줄(`a.note`)은 응답 `breakdown` 에 대응 필드가 없어
 * 그리지 않는다 (머리 주석).
 */
function BreakdownRow({ label, ratio }: { label: string; ratio: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-body-1 font-medium text-text-primary">{label}</span>
      <span
        className={`text-[17px] font-bold tabular-nums ${RATIO_TEXT_CLASS[getPriceDirection(ratio)]}`}
      >
        {formatSignedPercent(ratio)}
      </span>
    </div>
  );
}
