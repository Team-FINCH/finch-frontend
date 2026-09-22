import { useState } from 'react';

import { formatSignedPercent } from '@/shared/lib/formatNumber';
import { type AiAttributionRow } from '@/shared/types/ai/attribution';
import { Card } from '@/shared/ui/Card';

import {
  CONTRIBUTION_COLLAPSED_COUNT,
  divergingScale,
  formatSignedPercentPoint,
} from '../lib/attributionInsight';

import { DivergingBar } from './DivergingBar';

/**
 * `종목별` 탭의 본문 — 어떤 종목이 포트폴리오 수익률을 얼마나 움직였는가
 * (FINCH-308 · 333).
 *
 * ## 한 행에서 두 가지를 덜어냈다
 *
 * 전에는 한 종목에 로고·이름·공시 제목·막대·기여도·수익률 여섯이 들어가 행이
 * 무엇을 말하려는지 흐려졌다. 이 영역의 질문은 **하나**다 — "이 종목이 내 수익률을
 * 얼마나 움직였나".
 *
 * - **로고를 뺐다.** 종목을 *고르는* 화면(보유 목록·탐색)에서는 로고가 눈으로 종목을
 *   찾게 해 주지만, 여기서는 이미 이름이 세로로 정렬돼 있고 읽을 것은 오른쪽 숫자다.
 * - **공시 제목을 뺐다.** 공시는 "왜 움직였나" 의 재료이지 기여도가 아니다.
 *   `요약` 탭 FINCH 카드의 `분석 자세히 보기` 로 옮겼다 — 데이터는 버리지 않는다.
 *
 * ## 두 숫자가 헷갈리지 않게 한다
 *
 * 오른쪽 `+2.02%p` 는 **포트폴리오 수익률에 대한 기여**고, 아래 `+9.12%` 는 **그
 * 종목 자신의 수익률**이다. 비중 1%가 20% 오른 것과 비중 20%가 1% 오른 것은 전체에
 * 같은 영향을 주므로 둘은 전혀 다른 값이다.
 *
 * 그래서 단위를 가르고(`%p` 대 `%`) 아래 값에는 `기간 수익률` 이라는 말을 반드시
 * 붙인다. 숫자만 두면 같은 종류의 값 두 개로 읽힌다.
 *
 * ## 정렬 기준을 화면에 적는다 (FINCH-333)
 *
 * `sortByImpact` 가 **절댓값** 내림차순으로 준 목록이다. 그래서 `+2.02%p` 아래
 * `-1.80%p` 가 오고 그 아래 `+0.40%p` 가 오는 일이 정상인데, 기준이 적혀 있지
 * 않으면 부호가 뒤섞인 목록이 정렬이 안 된 것처럼 읽힌다.
 *
 * 문구는 `기여도 순` 이 아니라 **`영향이 큰 순`** 이다. 전자는 부호 순으로 읽혀
 * 실제 정렬과 어긋난다 — 가장 크게 깎은 종목이 위에 있는 이유를 설명하지 못한다.
 *
 * ## 크기 순으로 줄을 세운다
 *
 * 막대가 위에서 아래로 짧아지는 하나의 그림이 되고, 상위 몇만 남겨도
 * 오른 종목과 내린 종목이 함께 살아남는다. 부호는 막대 방향과 색이 말한다.
 *
 * ## 기본 화면이 보유 수에 끌려가지 않게 한다 (FINCH-327)
 *
 * 기본 노출은 셋이다(`CONTRIBUTION_COLLAPSED_COUNT`). **`전체 보기` 는 목록 맨
 * 아래가 아니라 머리 줄 오른쪽에 있다** — 접힌 상태에서 "더 있다" 는 사실을 목록을
 * 다 지나간 뒤에야 알게 되면 늦고, 종목 수(`전체 8종목`)가 곧 문이 되어 개수
 * 표시와 진입점이 한 자리로 합쳐진다.
 *
 * 펼침은 그대로 이 자리에서 일어난다. 바닥 시트로 보내지 않는 이유는 목록의 정렬과
 * 막대 스케일이 본문과 같아야 해서다 — 시트로 옮기면 같은 그림을 두 벌 유지하게
 * 된다.
 *
 * ## 제목을 지우고 카드로 감쌌다 (FINCH-333)
 *
 * `종목별 기여` `h2` 가 있었다. 이제 `종목별` 탭을 눌러야 나오므로 탭 라벨이
 * 제목이다 — `ReturnAttributionSection` 과 같은 판단이고 이유도 같다.
 *
 * 카드로 감싼 덕에 **펼쳤을 때 목록이 어디서 끝나는지**가 생겼다. 전에는 평면
 * 위로 여덟 종목이 흐르다가 그대로 다음 섹션이 이어졌다.
 */

type StockContributionSectionProps = {
  /** `sortByImpact()` 가 절댓값 내림차순으로 정렬해 넘긴 목록 */
  rows: readonly AiAttributionRow[];
};

export function StockContributionSection({
  rows,
}: StockContributionSectionProps) {
  const [expanded, setExpanded] = useState(false);

  // 스케일은 언제나 **전체** 기준이다. 접었을 때만 다시 잡으면 `전체 보기` 를 누른
  // 순간 이미 보고 있던 막대들의 길이가 바뀐다.
  const scale = divergingScale(rows.map((row) => row.contribution));
  const collapsible = rows.length > CONTRIBUTION_COLLAPSED_COUNT;
  const visible =
    collapsible && !expanded
      ? rows.slice(0, CONTRIBUTION_COLLAPSED_COUNT)
      : rows;

  if (rows.length === 0) {
    return (
      <Card className="mt-4">
        <p className="text-body-1 text-text-secondary">
          이 기간 동안 특별한 기여가 없었어요.
        </p>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-caption text-text-muted">
          영향이 큰 순
        </span>

        {collapsible ? (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className="-my-1 flex-none py-1 text-body-2 font-medium whitespace-nowrap text-text-secondary"
          >
            {expanded ? '접기' : `전체 ${rows.length}종목 ›`}
          </button>
        ) : (
          <span className="flex-none text-caption text-text-muted">
            {rows.length}종목
          </span>
        )}
      </div>

      <div className="mt-3">
        {visible.map((row) => (
          <StockContributionRow key={row.ticker} row={row} scale={scale} />
        ))}
      </div>
    </Card>
  );
}

/**
 * 종목 한 줄. 위 여백과 구분선을 자기 자신이 갖는다 — `AttributionRow` 와 같다.
 *
 * 행이 세 층(`이름/기여도` · 막대 · `기간 수익률`)이라 여백만으로 가르면 층 사이
 * 간격과 행 사이 간격이 비슷해져서, 여덟 종목을 펼쳤을 때 스물네 줄이 한 덩어리로
 * 흐른다. 이 목록에 선이 가장 필요하다.
 */
function StockContributionRow({
  row,
  scale,
}: {
  row: AiAttributionRow;
  scale: number;
}) {
  const positive = row.contribution >= 0;

  return (
    <div className="mt-3.5 border-t border-divider pt-3.5 first:mt-0 first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-body-1 font-semibold text-text-primary">
          {row.name}
        </span>
        <span
          className={`flex-none text-body-1 font-bold whitespace-nowrap tabular-nums ${
            positive ? 'text-stock-up' : 'text-stock-down'
          }`}
        >
          {formatSignedPercentPoint(row.contribution)}
        </span>
      </div>

      <DivergingBar value={row.contribution} scale={scale} className="mt-2" />

      {/* 종목 자신의 수익률. 위 기여도와 다른 값이라 라벨을 반드시 붙인다.
          등락색을 얹지 않는다 — 이 행에서 색이 뜻을 갖는 자리는 기여도 하나이고,
          둘 다 칠하면 어느 쪽이 포트폴리오 이야기인지 다시 흐려진다. */}
      <p className="mt-1.5 text-caption text-text-muted tabular-nums">
        기간 수익률 {formatSignedPercent(row.return)}
      </p>
    </div>
  );
}
