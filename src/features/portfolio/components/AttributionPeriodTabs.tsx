import { type AiAttributionPeriod } from '@/shared/types/ai/attribution';

import { ATTRIBUTION_PERIODS } from '../lib/attributionInsight';

/**
 * 분석 기간 선택 (FINCH-308).
 *
 * ## 만들어도 되는 근거
 *
 * AI 서버가 다섯 기간을 **실제로 처리한다** — `Period` enum 이 `1d`·`1w`·`1m`·`3m`·
 * `ytd` 를 갖고 `_period_start()` 가 각각의 시작일을 계산한다(`ytd` 는 그해 1월 1일).
 * FE 쪽 `AiAttributionPeriodSchema` 에도 이미 다섯이 있었고, 지금까지는
 * `postAiAttribution` 이 본문을 비워 보내 서버 기본값 `1d` 만 쓰고 있었을 뿐이다.
 * **화면만 붙인 가짜 선택지가 아니다.**
 *
 * ## 큰 pill 버튼을 쓰지 않는다
 *
 * 기간 선택은 이 화면의 주인공이 아니다. 채워진 버튼 다섯 개를 얹으면 바로 아래
 * 오는 hero 수익률보다 먼저 눈에 띈다. 그래서 글자만 두고, 고른 것만 진하게·굵게
 * 한다. 밑줄이나 배경 없이 **색과 굵기 두 가지로만** 가른다.
 *
 * ## 고를 때마다 요청이 나간다
 *
 * `1d` 만 아침 배치가 미리 만들어 둔다. 나머지는 고른 순간 LLM 생성이 돌아 처음에는
 * 몇 초 걸리고, 그날 안에서는 서버가 캐시한다. react-query 도 기간별로 키를 따로
 * 잡으므로 되돌아오면 다시 부르지 않는다.
 *
 * 포트폴리오 계열 호출 한도가 분당 10회라 다섯 기간을 다 눌러도 남는다.
 */

type AttributionPeriodTabsProps = {
  value: AiAttributionPeriod;
  onChange: (period: AiAttributionPeriod) => void;
};

export function AttributionPeriodTabs({
  value,
  onChange,
}: AttributionPeriodTabsProps) {
  return (
    // 좌우 여백(px-6.5)을 뚫고 화면 끝까지 흘려 보낸다 — 기간이 늘어 가로로 넘칠 때
    // 마지막 항목이 여백에 걸려 반쯤 잘리지 않게 한다.
    <div
      role="tablist"
      aria-label="분석 기간"
      className="scroll-touch -mx-6.5 flex gap-4 overflow-x-auto px-6.5"
    >
      {ATTRIBUTION_PERIODS.map((period) => {
        const selected = period.value === value;
        return (
          <button
            key={period.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(period.value)}
            className={`flex-none py-2 text-body-2 whitespace-nowrap transition-colors duration-(--motion-fast) ease-standard ${
              selected
                ? 'font-bold text-text-primary'
                : 'font-medium text-text-muted'
            }`}
          >
            {period.label}
          </button>
        );
      })}
    </div>
  );
}
