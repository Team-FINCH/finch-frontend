import { type ReactNode } from 'react';

import { formatSignedPercentPoint } from '../lib/attributionInsight';

import { DivergingBar } from './DivergingBar';

/**
 * 기여 한 줄. **지금 쓰는 곳은 `종목별` 탭 하나다** (FINCH-333 · 341).
 *
 * ## 왜 하나로 합쳤나 — 그리고 왜 지금은 한 곳만 쓰나
 *
 * 전에는 `AttributionRow`(요인)와 `StockContributionRow`(종목) 둘이 각자 있었다.
 * 하는 일이 같은데 — `라벨 / 값 / 막대` — 값이 조금씩 달랐다.
 *
 * | | 요인 | 종목 |
 * | --- | --- | --- |
 * | 행 사이 | 16px | 14px |
 * | 라벨→막대 | 8px | 8px |
 * | 막대 아래 | 없음 | 6px + 캡션 |
 * | 라벨 굵기 | 700/500 | 600 |
 *
 * 두 탭을 오가면 **같은 모양의 목록인데 리듬이 미묘하게 달랐다.** 한 화면에서
 * 동시에 보이지 않으니 아무도 틀렸다고 말하지 못하는데, 오갈 때 화면이 정돈되지
 * 않은 느낌만 남는다. "컴포넌트 일관성이 부족하다" 는 지적의 실체가 이것이다.
 *
 * 333 이 하나로 합쳤고, 341 에서 요인 쪽이 누적 워터폴(`AttributionWaterfall`)로
 * 갈라져 나갔다. **부품은 남는다** — 두 탭의 행이 다시 갈리지 않으려면 치수가
 * 한 곳에 있어야 하고, 워터폴 쪽이 이 파일의 값을 보고 맞춘다.
 *
 * | | 이 부품 (종목별) | 워터폴 (요인별) |
 * | --- | --- | --- |
 * | 행 사이 | 14px + 1px 선 | 같음 |
 * | 라벨 → 막대 | 6px | 같음 |
 * | 막대 높이 | 6px | 같음 |
 * | 값 글자 | 18px/700 | 같음 |
 *
 * ## 세 층의 간격을 고정했다
 *
 * ```
 * 1  SK하이닉스                       +2.02%p   ← 순위/라벨/값 (baseline 정렬)
 *                                              6px
 * ░░░░░░░░░░░│███████████░░░░░░░░░░░░         ← 막대 6px
 *                                              6px
 * 기간 수익률 +9.12% · 비중 22.1%              ← 보조 (있을 때만)
 * ─────────────────────────────────────        ← divider, 위아래 14px
 * ```
 *
 * **라벨과 값은 `items-baseline`** 이다. 둘의 글자 크기가 같아도(16px) 굵기가
 * 달라 `items-center` 로 두면 밑선이 미세하게 어긋난다. 값이 `tabular-nums` 라
 * 자릿수가 달라도 오른쪽 끝이 한 줄로 선다.
 *
 * **막대는 폭을 다 쓴다.** 라벨 쪽으로도 값 쪽으로도 들여쓰지 않는다 — 0 축이
 * 언제나 카드 안쪽 폭의 정확히 가운데 서야 행끼리 축이 한 줄로 이어진다.
 * 그 세로선이 "모든 행이 같은 스케일" 이라는 사실을 말한다.
 *
 * ## 위 여백과 구분선을 자기 자신이 갖는다
 *
 * `first:` 로 첫 줄만 뺀다. 부모가 `gap` 으로 주면 선과 여백이 따로 놀아 선이
 * 두 행 중 어디에 속하는지 흐려진다 — `SoftBoxRow` 와 같은 처리다.
 *
 * ## 값은 저채도 짝이다
 *
 * `--color-stock-*-muted` 다. 이 화면에서 확정값(`--color-stock-up`)을 쓰는 자리는
 * 성과 카드의 큰 수익률 하나뿐이고 여기는 그 값을 이루는 조각이라 한 단 내린다.
 * 한 목록에 여덟 줄이 서면 확정값으로는 화면이 온통 적색이 된다 —
 * 근거는 `styles/index.css` 의 해당 토큰 주석에 있다.
 *
 * 0 은 `--color-stock-neutral` 이다. 방향이 없는 값에 등락색을 얹지 않는다.
 */

/**
 * 라벨의 무게. 세 값이 각각 쓰이는 자리가 정해져 있다.
 *
 * - `lead` — 요인 셋 중 영향이 가장 큰 하나. **굵기 하나로만 강조한다.**
 *   뱃지·아이콘·배경을 새로 만들지 않는다 — 셋 중 하나라는 사실은 이미 막대
 *   길이가 말하고 있어서 표시를 더 얹으면 반복이다
 * - `normal` — 종목 목록의 모든 줄. 종목끼리는 순위를 굵기로 말하지 않는다.
 *   이미 크기 순으로 서 있고 막대가 짧아진다
 * - `sub` — 요인 셋 중 `lead` 가 아닌 둘
 */
export type ContributionEmphasis = 'lead' | 'normal' | 'sub';

const LABEL_CLASS: Record<ContributionEmphasis, string> = {
  lead: 'font-bold text-text-primary',
  normal: 'font-semibold text-text-primary',
  sub: 'font-medium text-text-secondary',
};

type ContributionRowProps = {
  /** 요인명(`시장 영향`) 또는 종목명(`한빛반도체`) */
  label: ReactNode;
  /** 기여도. 0~1 소수이고 화면에는 `%p` 로 나간다 */
  value: number;
  /** `divergingScale()` 이 준 기준. 같은 목록의 행들이 같은 값을 받아야 한다 */
  scale: number;
  emphasis?: ContributionEmphasis;
  /**
   * 막대 아래 보조 한 줄. 종목 목록의 `기간 수익률 +9.12%` 가 여기 온다.
   *
   * **요인 목록은 넘기지 않는다.** 요인에는 "그 요인 자신의 수익률" 같은 값이
   * 없다 — `breakdown` 은 기여도 하나뿐이다.
   */
  sub?: ReactNode;
  /**
   * 라벨 앞 순위 (FINCH-341). 넘기면 왼쪽 끝에 붙는다.
   *
   * **종목 목록만 쓴다.** 요인 셋은 고정 순서(시장→업종→선택)이지 정렬한 것이
   * 아니라 번호를 붙이면 없는 순위를 만든다.
   */
  rank?: number;
};

export function ContributionRow({
  label,
  value,
  scale,
  emphasis = 'normal',
  sub,
  rank,
}: ContributionRowProps) {
  return (
    <div className="mt-3.5 border-t border-divider pt-3.5 first:mt-0 first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-baseline gap-2">
          {rank !== undefined && (
            <span className="flex-none text-caption text-text-muted tabular-nums">
              {rank}
            </span>
          )}
          <span
            className={`min-w-0 truncate text-body-1 ${LABEL_CLASS[emphasis]}`}
          >
            {label}
          </span>
        </span>
        <span
          className={`flex-none text-[18px] leading-6 font-bold whitespace-nowrap tabular-nums ${
            value === 0
              ? 'text-stock-neutral'
              : value > 0
                ? 'text-stock-up-muted'
                : 'text-stock-down-muted'
          }`}
        >
          {formatSignedPercentPoint(value)}
        </span>
      </div>

      <DivergingBar value={value} scale={scale} className="mt-1.5" />

      {sub !== undefined && (
        <p className="mt-1.5 text-caption text-text-muted tabular-nums">
          {sub}
        </p>
      )}
    </div>
  );
}
