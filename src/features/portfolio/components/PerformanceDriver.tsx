import { type AiAttributionContent } from '@/shared/types/ai/attribution';

import {
  ATTRIBUTION_FACTOR_LABEL,
  formatSignedPercentPoint,
  sortFactorsByImpact,
} from '../lib/attributionInsight';

/**
 * 질문 3 — "왜 그런 결과가 나왔나" (FINCH-333).
 *
 * ## 리스트가 아니라 한 덩어리로 보여야 한다
 *
 * 전 판은 `가장 큰 요인 / 종목 선택 +1.42%p ›` 한 줄이었고, 바로 아래 `가장 크게
 * 움직인 종목` 줄이 같은 모양으로 붙어 있었다. **둘이 같은 무게·같은 셰브런이라
 * 분석 결과가 아니라 설정 메뉴처럼 읽혔다.**
 *
 * 그래서 1위 하나를 블록으로 세운다.
 *
 * ```
 * 초과 성과는 어디서 왔나요?
 *
 * 종목 선택                        +1.42%p     ← 18px / 700
 * ████████████████████░░░░░░░░░░               ← 세 요인 중 비중
 * 시장 영향 +0.89%p · 업종 영향 -0.18%p        ← 나머지는 한 줄로 깔기
 * ```
 *
 * 1위는 **크기·굵기·막대** 셋으로 서고, 나머지 둘은 캡션 한 줄로 눕는다. 메뉴
 * 줄은 세 항목이 똑같이 생겼을 때 나오는 모양이고, 여기는 셋의 무게가 다르다.
 *
 * ## 막대는 "셋 중 얼마"를 말한다
 *
 * 세 요인 절댓값의 합에서 1위가 차지하는 비율이다. `기여 분석` 탭의
 * `DivergingBar`(0 축 기준 발산)와 **다른 그림이고 그래야 맞는다** — 여기 질문은
 * "이 요인이 얼마나 컸나" 가 아니라 "이번 결과를 이 요인이 얼마나 설명하나" 다.
 * 부호는 옆 숫자가 말하므로 막대는 방향을 그리지 않는다.
 *
 * **합이 0 인 기간에는 이 섹션을 그리지 않는다.** 호출부가 막는다 — 나눌 것이
 * 없고 "어디서 왔나" 에 답할 것도 없다.
 *
 * ## 확장을 막지 않는 구조다
 *
 * `sortFactorsByImpact` 가 정렬된 배열을 주고 이 컴포넌트는 `[0]` 과 `slice(1)`
 * 로만 나눈다. 요인이 넷으로 늘면 1위 블록은 그대로고 아래 줄에 하나가 더 붙는다
 * — 라벨은 `ATTRIBUTION_FACTOR_LABEL` 이 `Record` 라 타입이 요구한다.
 *
 * ## 인과를 말하지 않는다
 *
 * 제목이 `초과 성과는 어디서 왔나요?` 이고 본문은 요인명과 값뿐이다.
 * "종목 선택 덕분에 올랐어요" 같은 해석은 아래 FINCH 패널 몫이다 —
 * `attributionInsight.ts` 가 못박은 선이고, 엔진 값과 AI 문장이 같은 사실을
 * 두 번 말하지 않게 한다.
 */

type PerformanceDriverProps = {
  breakdown: AiAttributionContent['breakdown'];
};

export function PerformanceDriver({ breakdown }: PerformanceDriverProps) {
  const ranked = sortFactorsByImpact(breakdown);
  const [lead, ...rest] = ranked;

  if (lead === undefined) {
    return null;
  }

  const total = ranked.reduce((sum, item) => sum + Math.abs(item.value), 0);
  const share = total === 0 ? 0 : (Math.abs(lead.value) / total) * 100;

  return (
    <section>
      <h3 className="text-body-2 font-bold text-text-primary">
        초과 성과는 어디서 왔나요?
      </h3>

      <div className="mt-3.5 flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-title-3 font-bold text-text-primary">
          {ATTRIBUTION_FACTOR_LABEL[lead.factor]}
        </span>
        <span
          className={`flex-none text-title-3 font-bold whitespace-nowrap tabular-nums ${
            lead.value === 0
              ? 'text-stock-neutral'
              : lead.value > 0
                ? 'text-stock-up-muted'
                : 'text-stock-down-muted'
          }`}
        >
          {formatSignedPercentPoint(lead.value)}
        </span>
      </div>

      {/* 세 요인 절댓값 합에서 1위가 차지하는 비율. 방향은 위 숫자가 말한다. */}
      <span
        aria-hidden="true"
        className="mt-2.5 block h-1.5 w-full rounded-[3px] bg-chart-track"
      >
        <span
          className="block h-full rounded-[3px] bg-stock-up-muted"
          style={{ width: `${share}%` }}
        />
      </span>

      <p className="mt-2.5 text-caption text-text-muted tabular-nums">
        세 요인 중 {Math.round(share)}%
      </p>

      {rest.length > 0 && (
        <p className="mt-3 text-caption text-pretty break-keep text-text-secondary">
          {rest
            .map(
              (item) =>
                `${ATTRIBUTION_FACTOR_LABEL[item.factor]} ${formatSignedPercentPoint(item.value)}`,
            )
            .join(' · ')}
        </p>
      )}
    </section>
  );
}
