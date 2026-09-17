import { useState } from 'react';

import { formatSignedPercent } from '@/shared/lib/formatNumber';
import { type AiAttributionRow } from '@/shared/types/ai/attribution';

import {
  CONTRIBUTION_COLLAPSED_COUNT,
  divergingScale,
  formatSignedPercentPoint,
} from '../lib/attributionInsight';

import { DivergingBar } from './DivergingBar';

/**
 * "종목별 기여" — 어떤 종목이 포트폴리오 수익률을 얼마나 움직였는가
 * (FINCH-308).
 *
 * ## 한 행에서 두 가지를 덜어냈다
 *
 * 전에는 한 종목에 로고·이름·공시 제목·막대·기여도·수익률 여섯이 들어가 행이
 * 무엇을 말하려는지 흐려졌다. 이 영역의 질문은 **하나**다 — "이 종목이 내 수익률을
 * 얼마나 움직였나".
 *
 * - **로고를 뺐다.** 종목을 *고르는* 화면(보유 목록·탐색)에서는 로고가 눈으로 종목을
 *   찾게 해 주지만, 여기서는 이미 이름이 세로로 정렬돼 있고 읽을 것은 오른쪽 숫자다.
 *   로고가 매 행 왼쪽에 서면 시선이 숫자에 닿기 전에 한 번 걸린다.
 * - **공시 제목을 뺐다.** 공시는 "왜 움직였나" 의 재료이지 기여도가 아니다.
 *   아래 AI 영역의 `분석 자세히 보기` 로 옮겼다 — 데이터는 버리지 않는다.
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
 * ## 크기 순으로 줄을 세운다
 *
 * `sortByImpact` 가 절댓값 기준으로 정렬한 결과를 받는다 — 근거는 그 함수 주석에
 * 있다. 막대가 위에서 아래로 짧아지는 하나의 그림이 되고, 상위 몇만 남겨도
 * 오른 종목과 내린 종목이 함께 살아남는다.
 *
 * ## 기본 화면이 보유 수에 끌려가지 않게 한다 (FINCH-327)
 *
 * 이 섹션은 **아래에 무엇이 더 있는지를 사용자가 모르는 자리**다. 기본 노출을
 * 다섯에서 셋으로 줄이고 행 안팎의 여백을 조였다. 한 종목이 60px 대로 내려와
 * 세 종목이 200px 남짓에 들어간다 — 전에는 다섯 종목이 430px 이었다.
 *
 * **`전체 보기` 를 섹션 제목 줄로 올렸다.** 전에는 목록 맨 아래 폭을 다 쓰는 버튼
 * 이라 그 자체로 한 행 높이를 먹었고, 접힌 상태에서 "더 있다" 는 사실을 목록을 다
 * 지나간 뒤에야 알 수 있었다. 제목 오른쪽에 두면 종목 수(`전체 8종목`)가 곧 문이
 * 되어 **개수 표시와 진입점이 한 자리로 합쳐진다.**
 *
 * 펼침은 그대로 이 자리에서 일어난다. 바닥 시트로 보내지 않는 이유는 목록의 정렬과
 * 막대 스케일이 본문과 같아야 해서다 — 시트로 옮기면 같은 그림을 두 벌 유지하게
 * 된다.
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

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-section-title text-text-primary">종목별 기여</h2>

        {collapsible ? (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex-none py-1 text-body-2 font-medium whitespace-nowrap text-text-secondary"
          >
            {expanded ? '접기' : `전체 ${rows.length}종목 ›`}
          </button>
        ) : (
          rows.length > 0 && (
            <span className="flex-none text-caption text-text-muted">
              {rows.length}종목
            </span>
          )
        )}
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-body-1 text-text-secondary">
          이 기간 동안 특별한 기여가 없었어요.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-4.5">
          {visible.map((row) => (
            <StockContributionRow key={row.ticker} row={row} scale={scale} />
          ))}
        </div>
      )}
    </section>
  );
}

function StockContributionRow({
  row,
  scale,
}: {
  row: AiAttributionRow;
  scale: number;
}) {
  const positive = row.contribution >= 0;

  return (
    <div>
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
