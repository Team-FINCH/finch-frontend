import {
  type AiAttributionContent,
  type AiAttributionRow,
} from '@/shared/types/ai/attribution';
import { Card } from '@/shared/ui/Card';

import {
  ATTRIBUTION_FACTOR_LABEL,
  ATTRIBUTION_FACTOR_ORDER,
  formatSignedPercentPoint,
  resolveExcessNote,
  resolveMainFactor,
  type CauseView,
} from '../lib/attributionInsight';

/**
 * `요약` 탭의 본문 — 세 탭의 결론을 한 장에 모은 자리 (FINCH-333).
 *
 * ## 탭을 가르면 첫 화면이 비는 문제
 *
 * `기여 분석`·`종목별` 을 탭 뒤로 보내면 처음 들어온 사람은 성과 카드 하나만 보고
 * **아래 두 탭에 무엇이 있는지 모른 채** 화면을 닫을 수 있다. 세로로 이어져 있을
 * 때는 스크롤이 그 역할을 했다.
 *
 * 그래서 이 탭이 두 탭의 **1위 한 줄씩**을 들고 있고, 누르면 그 탭이 열린다.
 * 요약이 목차를 겸한다.
 *
 * ```
 * 시장보다 앞선 기간이에요.
 * ─────────────────────────────────────
 * 가장 큰 요인
 * 종목 선택                  +1.42%p  ›   → 기여 분석 탭
 * ─────────────────────────────────────
 * 가장 크게 움직인 종목
 * 한빛반도체                 +2.02%p  ›   → 종목별 탭
 * ```
 *
 * ## 값을 새로 만들지 않는다
 *
 * 세 줄 모두 이미 화면에 있던 값이다 — `resolveExcessNote` 는 `excessReturn` 의
 * 부호, 요인 줄은 `resolveMainFactor`(기여 분석 탭이 굵게 칠하는 그 요인),
 * 종목 줄은 `sortByImpact` 가 이미 맨 앞에 세운 행이다. **정렬과 argmax 말고는
 * 계산이 없다**는 `attributionInsight.ts` 의 선을 그대로 지킨다.
 *
 * 그래서 같은 값이 두 탭에 나타나는데, 이것은 "AI 가 만든 값과 엔진이 만든 값을
 * 두 번 말하지 않는다" 가 막는 중복이 아니다. 그 금지는 **출처가 다른 두 값이
 * 서로를 반증하는 것**을 막는 것이고, 여기 둘은 같은 함수의 같은 호출 결과라
 * 갈라질 수 없다.
 *
 * ## 화면에서 채도가 가장 높은 빨강은 하나뿐이다
 *
 * 이 패널의 두 수치는 `--color-stock-*-muted` 다. 확정값(`--color-stock-up`)을
 * 쓰는 자리는 바로 위 성과 카드의 큰 수익률 **하나**뿐이라, 그 하나가 화면에서
 * 가장 먼저 읽힌다.
 *
 * 전에는 한 화면에 등락색 요소가 열넷 안팎이었고 전부 같은 채도였다 — "어느
 * 숫자가 핵심인지 표시가 없다" 는 지적의 실체가 이것이다. **자리 수(탭 분할)와
 * 채도(muted 짝) 둘로 답했고, 확정 토큰 값은 건드리지 않았다.**
 *
 * 맨 위 한 줄에는 색을 넣지 않는다. 부호를 말로 옮긴 문장이라 색이 더할 뜻이 없고,
 * 칠하면 아래 두 값과 같은 층으로 올라온다.
 *
 * ## FINCH 해석은 이 탭에만 둔다
 *
 * 호출부(`CauseTab`)가 이 패널 **뒤에** 붙인다. 셋 중 하나에만 두는 이유는 그
 * 문장이 화면 전체에 대한 해석이라 요약의 일부이기 때문이고, 세 탭에 모두 두면
 * 탭을 옮길 때마다 같은 검정 카드가 따라와 탭이 바뀌지 않은 것처럼 보인다.
 *
 * **여전히 숫자와 차트 뒤다.** 검정 면이 맨 위로 올라가면 사용자가 자기 수익률보다
 * AI 문장을 먼저 읽는다는 FINCH-308 의 판단은 그대로 유효하다.
 */

type CauseSummaryPanelProps = {
  breakdown: AiAttributionContent['breakdown'];
  /** `sortByImpact()` 가 절댓값 내림차순으로 정렬해 넘긴 목록 */
  rows: readonly AiAttributionRow[];
  excessReturn: number;
  onNavigate: (view: CauseView) => void;
};

export function CauseSummaryPanel({
  breakdown,
  rows,
  excessReturn,
  onNavigate,
}: CauseSummaryPanelProps) {
  const mainFactor = resolveMainFactor(breakdown);
  const factorValue = breakdown[mainFactor];
  const allZero = ATTRIBUTION_FACTOR_ORDER.every(
    (factor) => breakdown[factor] === 0,
  );
  const topRow = rows[0];

  return (
    <Card className="mt-4">
      <p className="text-body-1 font-semibold text-pretty text-text-primary">
        {resolveExcessNote(excessReturn)}
      </p>

      {/* 셋이 모두 0 인 기간에는 "가장 컸다" 고 말할 것이 없다 —
          `ReturnAttributionSection` 의 같은 갈래다. */}
      {!allZero && (
        <SummaryJumpRow
          label="가장 큰 요인"
          name={ATTRIBUTION_FACTOR_LABEL[mainFactor]}
          value={factorValue}
          onClick={() => onNavigate('factor')}
        />
      )}

      {topRow !== undefined && (
        <SummaryJumpRow
          label="가장 크게 움직인 종목"
          name={topRow.name}
          value={topRow.contribution}
          onClick={() => onNavigate('stock')}
        />
      )}
    </Card>
  );
}

/**
 * 요약 한 줄. 누르면 그 값이 사는 탭으로 간다.
 *
 * **`button` 이지 링크가 아니다.** 같은 화면 안의 상태 전환이라 주소가 바뀌지
 * 않는다 — 2차 탭 상태를 URL 에 싣지 않는다는 `CauseView` 주석의 결정을 따른다.
 *
 * 라벨(13px 회색) → 이름(16px 600) → 값(16px 700 등락색) 세 단으로 무게가
 * 올라간다. 눌리는 줄이지만 화살표 하나 말고는 버튼처럼 꾸미지 않는다 —
 * 면이나 테두리를 주면 카드 안에 카드가 생긴다.
 */
function SummaryJumpRow({
  label,
  name,
  value,
  onClick,
}: {
  label: string;
  name: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 flex w-full flex-col border-t border-divider pt-4 text-left"
    >
      <span className="text-caption text-text-muted">{label}</span>

      <span className="mt-1 flex w-full items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-body-1 font-semibold text-text-primary">
          {name}
        </span>

        <span className="flex flex-none items-baseline gap-1.5">
          <span
            className={`text-body-1 font-bold whitespace-nowrap tabular-nums ${
              value === 0
                ? 'text-stock-neutral'
                : value > 0
                  ? 'text-stock-up-muted'
                  : 'text-stock-down-muted'
            }`}
          >
            {formatSignedPercentPoint(value)}
          </span>
          <span aria-hidden="true" className="text-body-2 text-text-muted">
            ›
          </span>
        </span>
      </span>
    </button>
  );
}
