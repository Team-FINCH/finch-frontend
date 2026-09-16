import {
  isInsufficientDataErrorCode,
  isRetryableAiErrorCode,
  readAiErrorCode,
  readAiErrorMessage,
} from '@/shared/lib/aiErrorRetry';
import { formatKstTime } from '@/shared/lib/formatDate';
import { AiCard } from '@/shared/ui/AiCard';
import { AiCitationList } from '@/shared/ui/AiCitationList';
import { AiFeedbackRow } from '@/shared/ui/AiFeedbackRow';
import { AiStatus } from '@/shared/ui/AiStatus';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';

import { usePortfolioAttribution } from '../api/usePortfolioAttribution';
import { mergeContributionRows } from '../lib/attributionInsight';

import { PerformanceSummary } from './PerformanceSummary';
import { ReturnAttributionChart } from './ReturnAttributionChart';
import { StockContributionChart } from './StockContributionChart';

/**
 * "수익률 분석" 탭 (프로토타입 `isPfCause` 블록, AI 슬롯 2번).
 * 프로토타입 실제 UI에서 피드백이 붙는 확정된 세 자리 중 하나다
 * (ia.md §4 "피드백 슬롯 배치 규칙" 각주 — 종목 상세 AI 탭 · AI 채팅 · 여기).
 *
 * ## 이 파일은 조립만 한다 (FINCH-308)
 *
 * 전에는 수치 표시·막대·목록·상태 분기가 전부 이 파일 하나에 있었다. 개편에서
 * 화면을 네 블록으로 나누면서 그리는 일은 각 컴포넌트로 옮기고, 여기에는 **상태
 * 분기와 배치 순서만** 남겼다.
 *
 * ## 계산값과 AI 해석값을 섞지 않는다
 *
 * 배치 순서가 그 경계다.
 *
 * | 블록 | source of truth |
 * | --- | --- |
 * | `PerformanceSummary` | 엔진 (`portfolioReturn`·`benchmarkReturn`·`excessReturn`) |
 * | `AiCard` | AI (`summary.text`) |
 * | `ReturnAttributionChart` | 엔진 (`breakdown`) |
 * | `StockContributionChart` | 엔진 (`contributors`·`detractors`) |
 * | `notes` | 엔진 (계산 중 붙은 단서) |
 *
 * 엔진 값은 흰 면에, AI 문장은 검정 카드 안에 둔다 — **면 색이 곧 출처 표시다.**
 * 전에는 기간 수익률·초과수익률이 AI 카드의 캡션에 들어가 있어서 그 숫자까지
 * AI 가 만든 것처럼 읽혔다. 그 셋을 카드 밖으로 꺼낸 것이 이 개편의 핵심이다.
 *
 * ## AI 카드는 아직 문장 한 덩어리다
 *
 * 화면은 AI 해석을 `헤드라인 · 종목 한 줄 · 단서 한 줄` 세 자리로 나눠 쓰고 싶지만,
 * 현재 AI 응답의 `summary` 는 2~4문장이 이어진 **한 덩어리**다
 * (`NARRATIVE_SCHEMA` 가 `{narrative: string}` 필드 하나다). 문장을 프론트가
 * 잘라 세 자리에 나누면 문장 경계가 어긋나는 날 뜻이 깨지므로 자르지 않는다.
 *
 * 나눠 쓰려면 AI 응답 계약이 바뀌어야 한다 — 요청문은
 * `_inbox/요청-ai-수익률분석-응답형식.md` 에 있다. 계약이 들어오면 이 카드만
 * 바꾸면 되고 나머지 세 블록은 그대로다.
 *
 * `label` 은 `AI 수익 분석` 그대로 둔다. design.md §8.4 가 AI 슬롯 라벨을 통일하라
 * 했고 다른 다섯 슬롯이 전부 `AI ~` 꼴이다 — 이 자리만 바꾸면 통일이 깨진다.
 */
export function CauseTab() {
  const { data, isPending, isError, error, refetch } =
    usePortfolioAttribution(true);

  if (isPending) {
    return (
      <div className="flex flex-col gap-3 pt-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError) {
    const code = readAiErrorCode(error);
    const message = readAiErrorMessage(error, '분석을 불러오지 못했어요');

    if (isInsufficientDataErrorCode(code)) {
      // TODO(계약): 개인화가 열리는 최소 데이터 건수가 임시값이다 — 이슈 #26 3번,
      // PRD 자신이 "임시값"이라고 적었다(ia.md §7). 숫자를 하드코딩하지 않는다.
      //
      // 이 탭은 두 상태의 모양이 갈린다 — 실패는 `.aist`(원반 글리프), 데이터
      // 부족은 `.est`(전면 빈 상태)다(proto L2287-2294). 그래서 여기만
      // `AiStatus` 가 아니라 `EmptyState` 를 쓴다. 캐릭터 일러스트와 보조 줄
      // `현재 {N}건` 은 아직 없다 — 에셋이 프로토타입 번들 안에만 있고
      // 거래 건수를 주는 필드가 응답에 없다.
      //
      // **제목의 마침표는 오타가 아니다.** 프로토타입이 이 자리에만 마침표를
      // 붙이고(L2290) AI 진단 탭의 같은 문구에는 붙이지 않는다(L2227).
      // 자리마다 프로토타입을 따른다.
      return (
        <EmptyState
          title="아직 분석할 정보가 충분하지 않아요."
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
    benchmarkReturn,
    excessReturn,
    tradingDays,
    breakdown,
    notes,
    summary,
    aiMeta,
  } = data;
  const asOfLabel = aiMeta.dataAsOf.portfolio ?? aiMeta.dataAsOf.price;
  const rows = mergeContributionRows(data);

  return (
    <div className="pt-4">
      <PerformanceSummary
        portfolioReturn={portfolioReturn}
        benchmarkReturn={benchmarkReturn}
        excessReturn={excessReturn}
        tradingDays={tradingDays}
      />

      {/* 캡션을 비운다 — 전에 여기 있던 두 수치는 위 `PerformanceSummary` 로 갔다.
          같은 값을 두 곳에 적으면 포맷이 갈라지는 날 둘이 달라 보인다. */}
      <AiCard
        className="mb-10"
        label="AI 수익 분석"
        headline={summary?.text ?? '수익률 원인 분석을 준비하지 못했어요.'}
      />

      <ReturnAttributionChart breakdown={breakdown} />

      <StockContributionChart rows={rows} />

      {notes.length > 0 && (
        <div className="mt-6 border-t border-border pt-5">
          <h2 className="mb-2.5 text-[20px] font-bold tracking-[-0.02em] text-text-primary">
            확인해볼 점
          </h2>
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
