import { formatSignedPercent } from '@/shared/lib/formatNumber';
import { type AiAttributionRow } from '@/shared/types/ai/attribution';

import { formatSignedPercentPoint } from '../lib/attributionInsight';

/**
 * 질문 4 — "어떤 종목이 가장 영향을 줬나" (FINCH-333).
 *
 * ## 방향별로 하나씩이다
 *
 * `sortByImpact` 상위 둘을 그냥 쓰면 **오른 종목만 둘 나오는 날**이 있어서
 * "무엇이 깎았나" 에 답을 못 한다. `resolveTopContributors` 가 각 방향의 1위를
 * 따로 고른다 — 그래야 두 줄이 `올린 것 / 깎은 것` 한 쌍으로 읽힌다.
 *
 * 전 종목이 같은 방향인 기간에는 한 줄만 선다. **자리를 `--` 로 채우지 않는다** —
 * 없는 값이 있는 것처럼 읽힌다.
 *
 * ## 긍정·부정을 색 말고도 표시한다
 *
 * ```
 * ┃ SK하이닉스              +2.02%p
 * ┃ 긍정 기여 · 기간 수익률 +9.12%
 *
 * ┃ 카카오                  -0.31%p
 * ┃ 부정 기여 · 기간 수익률 -1.40%
 * ```
 *
 * 왼쪽 2px 세로선이 방향을 진다. 색만으로 가르면 **색각 이상 사용자에게 적청
 * 구분 자체가 어렵고**(컨벤션 §11), 그래서 부호(`+`/`-`)와 `긍정 기여`·`부정 기여`
 * 라는 말을 함께 둔다. 세로선은 그 셋째 표시이고 눈으로 훑을 때 가장 빠르다.
 *
 * **삼각형(▲▼)은 쓰지 않는다** — 디자인 파트 회신(GitLab 이슈 #29).
 * 뱃지도 만들지 않는다 — design.md §9 가 막았고, `긍정 기여` 라는 글자가 이미
 * 같은 일을 한다.
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
 * 전체 목록은 `종목별` 탭에 있다. 여기는 요약이라 **각 방향 1위만** 두고, 더 보려는
 * 사람은 탭으로 간다. 세 종목째부터는 "가장 큰 영향" 이라는 제목과 어긋난다.
 */

type TopContributorsProps = {
  best: AiAttributionRow | undefined;
  worst: AiAttributionRow | undefined;
  /** 전체 목록으로 보내는 진입점. `종목별` 탭을 연다 */
  onSeeAll: () => void;
};

export function TopContributors({
  best,
  worst,
  onSeeAll,
}: TopContributorsProps) {
  if (best === undefined && worst === undefined) {
    return null;
  }

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 text-body-2 font-bold text-text-primary">
          성과에 가장 큰 영향을 준 종목
        </h3>
        <button
          type="button"
          onClick={onSeeAll}
          className="-my-1 flex-none py-1 text-caption font-medium whitespace-nowrap text-text-secondary"
        >
          전체 ›
        </button>
      </div>

      <div className="mt-3.5 flex flex-col gap-3">
        {best !== undefined && <ContributorLine row={best} positive />}
        {worst !== undefined && (
          <ContributorLine row={worst} positive={false} />
        )}
      </div>
    </section>
  );
}

function ContributorLine({
  row,
  positive,
}: {
  row: AiAttributionRow;
  positive: boolean;
}) {
  return (
    <div
      className={`border-l-2 pl-3 ${positive ? 'border-stock-up-muted' : 'border-stock-down-muted'}`}
    >
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

      <p className="mt-1 text-caption text-text-muted tabular-nums">
        {positive ? '긍정 기여' : '부정 기여'} · 기간 수익률{' '}
        {formatSignedPercent(row.return)}
      </p>
    </div>
  );
}
