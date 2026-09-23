import { formatSignedPercent } from '@/shared/lib/formatNumber';
import { type AiAttributionRow } from '@/shared/types/ai/attribution';

import { formatSignedPercentPoint } from '../lib/attributionInsight';

/**
 * 질문 4 — "어떤 종목이 영향을 줬나" (FINCH-333).
 *
 * ## 올린 것과 깎은 것을 함께 세운다
 *
 * `sortByImpact` 상위 둘을 그냥 쓰면 **오른 종목만 둘 나오는 날**이 있어서
 * "무엇이 깎았나" 에 답을 못 한다. `resolveTopContributors` 가 각 방향의 1위를
 * 따로 고른다 — 그래야 두 줄이 한 쌍으로 읽힌다.
 *
 * ```
 * 성과에 영향을 준 종목                      전체
 *
 * SK하이닉스                        +2.02%p
 * ████████████████████
 * 가장 크게 기여 · 기간 수익률 +9.12%
 * ────────────────────────────────────────
 * 카카오                            -0.31%p
 * ███
 * 성과를 일부 낮춤 · 기간 수익률 -1.40%
 * ```
 *
 * 전 종목이 같은 방향인 기간에는 한 줄만 선다. **자리를 `--` 로 채우지 않는다** —
 * 없는 값이 있는 것처럼 읽힌다.
 *
 * ## 카드가 아니라 행 + 구분선이다
 *
 * 종목마다 면을 주면 이 섹션만 다시 대시보드가 된다. 두 줄 사이 1px
 * (`--color-border`)이 전부다.
 *
 * ## 방향을 색 말고도 표시한다
 *
 * 막대 색·부호·`가장 크게 기여`/`성과를 일부 낮춤` 셋이 같은 말을 한다. 색만으로
 * 가르면 **색각 이상 사용자에게 적청 구분 자체가 어렵다**(컨벤션 §11).
 * **삼각형(▲▼)은 쓰지 않는다** — 디자인 파트 회신(GitLab 이슈 #29).
 *
 * 막대는 둘의 절댓값 중 큰 쪽이 100% 다. 두 종목을 견주는 그림이라 스케일을
 * 공유해야 길이 비교가 성립한다.
 *
 * ## 두 숫자의 단위가 다르다
 *
 * 오른쪽 `+2.02%p` 는 **포트폴리오 수익률에 대한 기여**, 아래 `+9.12%` 는 **그
 * 종목 자신의 수익률**이다. 비중 1%가 20% 오른 것과 비중 20%가 1% 오른 것은
 * 전체에 같은 영향을 주므로 둘은 전혀 다른 값이다. 단위를 가르고(`%p` 대 `%`)
 * 아래 값에는 `기간 수익률` 이라는 말을 반드시 붙인다.
 *
 * **아래 값에는 등락색을 얹지 않는다.** 한 줄에서 색이 뜻을 갖는 자리는 기여도
 * 하나이고, 둘 다 칠하면 어느 쪽이 포트폴리오 이야기인지 흐려진다.
 *
 * ## 둘까지만 보여 준다
 *
 * 전체 목록은 `종목별` 탭에 있다. 제목 오른쪽 `전체` 가 그리로 보낸다 —
 * 셰브런 없이 글자만 두어 위 요인 섹션과 무게를 맞췄다.
 */

type TopContributorsProps = {
  best: AiAttributionRow | undefined;
  worst: AiAttributionRow | undefined;
  /** 전체 목록으로 보내는 진입점. `종목별` 탭을 연다 */
  onSeeAll: () => void;
};

const MIN_VISIBLE_WIDTH = 3;

export function TopContributors({
  best,
  worst,
  onSeeAll,
}: TopContributorsProps) {
  if (best === undefined && worst === undefined) {
    return null;
  }

  const scale =
    Math.max(
      Math.abs(best?.contribution ?? 0),
      Math.abs(worst?.contribution ?? 0),
    ) || 1;
  const widthOf = (value: number) =>
    Math.max((Math.abs(value) / scale) * 100, MIN_VISIBLE_WIDTH);

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        {/* `h3` 다 — `h2` 는 이 패널 밖 `수익률 상세 분석` 이 갖는다
            (FINCH-341). */}
        <h3 className="min-w-0 text-section-title text-text-primary">
          성과에 영향을 준 종목
        </h3>
        <button
          type="button"
          onClick={onSeeAll}
          className="-my-1 flex-none py-1 text-body-2 font-medium whitespace-nowrap text-text-secondary"
        >
          전체
        </button>
      </div>

      <div className="mt-4">
        {best !== undefined && (
          <ContributorRow
            row={best}
            width={widthOf(best.contribution)}
            positive
          />
        )}
        {worst !== undefined && (
          <ContributorRow
            row={worst}
            width={widthOf(worst.contribution)}
            positive={false}
          />
        )}
      </div>
    </section>
  );
}

function ContributorRow({
  row,
  width,
  positive,
}: {
  row: AiAttributionRow;
  width: number;
  positive: boolean;
}) {
  return (
    <div className="mt-4 border-t border-border pt-4 first:mt-0 first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-body-1 font-semibold text-text-primary">
          {row.name}
        </span>
        <span
          className={`flex-none text-body-1 font-bold whitespace-nowrap tabular-nums ${
            positive ? 'text-stock-up-muted' : 'text-stock-down-muted'
          }`}
        >
          {formatSignedPercentPoint(row.contribution)}
        </span>
      </div>

      <span aria-hidden="true" className="mt-2 block h-1 w-full rounded-full">
        <span
          className={`block h-full rounded-full ${
            positive ? 'bg-stock-up-muted' : 'bg-stock-down-muted'
          }`}
          style={{ width: `${width}%` }}
        />
      </span>

      <p className="mt-2 text-caption text-text-muted tabular-nums">
        {positive ? '성과를 가장 크게 올림' : '성과를 일부 낮춤'} · 기간 수익률{' '}
        {formatSignedPercent(row.return)}
      </p>
    </div>
  );
}
