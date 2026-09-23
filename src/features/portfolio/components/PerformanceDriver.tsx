import { type AiAttributionContent } from '@/shared/types/ai/attribution';

import {
  ATTRIBUTION_FACTOR_LABEL,
  formatSignedPercentPoint,
  sortFactorsByImpact,
} from '../lib/attributionInsight';

/**
 * 질문 3 — "왜 이런 성과가 발생했나" (FINCH-333).
 *
 * ## 설정 메뉴가 아니라 귀속 분석이다
 *
 * 전 판은 `가장 큰 요인 / 종목 선택 +1.42%p ›` 한 줄이었고 바로 아래 종목 줄이
 * 같은 모양으로 붙어 있었다. **같은 무게 + 같은 셰브런 = 설정 메뉴**다.
 *
 * 지금은 요인 전부를 막대와 함께 세운다.
 *
 * ```
 * 초과 성과는 어디서 왔나요?
 *
 * 종목 선택                          +1.42%p   ← 18px/700
 * ████████████████████████
 * 시장 영향                          +0.89%p   ← 15px/500
 * ███████████████
 * 업종 영향                          -0.18%p
 * ███
 * ```
 *
 * 1위만 크고 나머지는 한 단 낮다. **셋을 같은 크기로 늘어놓으면 다시 목록**이
 * 되고, 1위 하나만 두면 "나머지는 뭐였나" 에 답을 못 한다.
 *
 * ## 셰브런을 없앴다
 *
 * 누를 것이 아니다. 요인별 상세는 `기여 분석` 탭이 통째로 맡고 있고, 이 섹션은
 * 요약 화면이 답해야 할 "왜" 에 대한 답이다. 화살표가 있으면 읽는 것이 아니라
 * 눌러야 하는 줄로 보인다.
 *
 * ## 막대는 한 방향이다
 *
 * 절댓값 비율이라 전부 왼쪽에서 오른쪽으로 뻗는다. **`DivergingBar` 를 쓰지
 * 않는다** — 0 을 가운데 두고 좌우로 발산하는 그 막대는 `기여 분석` 탭의 그림이고,
 * 여기 질문은 "부호가 어느 쪽인가" 가 아니라 "어느 것이 컸나" 다. 부호는 옆 숫자가
 * 말한다.
 *
 * 스케일은 절댓값이 가장 큰 요인이 100% 다. 고정 축을 쓰면 하루 구간에서 셋 다
 * 실오라기가 된다 — `divergingScale` 과 같은 판단이다.
 *
 * 색은 저채도 짝이고 **음수 요인은 파랑**이다. 길이만으로는 `-0.18%p` 가 깎았다는
 * 사실이 안 보인다.
 *
 * ## 확장을 막지 않는다
 *
 * `sortFactorsByImpact` 가 정렬된 배열을 주고 이 컴포넌트는 `[0]` 과 `slice(1)`
 * 로만 나눈다. 요인이 넷으로 늘면 1위 블록은 그대로고 아래에 한 줄이 더 붙는다 —
 * 라벨은 `ATTRIBUTION_FACTOR_LABEL` 이 `Record` 라 타입이 요구한다.
 *
 * ## 인과를 말하지 않는다
 *
 * 제목이 질문이고 본문은 요인명과 값뿐이다. "종목 선택 덕분에 올랐어요" 같은
 * 해석은 맨 아래 FINCH 몫이다 — `attributionInsight.ts` 가 못박은 선이고,
 * 엔진 값과 AI 문장이 같은 사실을 두 번 말하지 않게 한다.
 */

type PerformanceDriverProps = {
  breakdown: AiAttributionContent['breakdown'];
};

/** 값이 0 이 아닌데 막대가 안 보이면 "없음" 으로 읽힌다. */
const MIN_VISIBLE_WIDTH = 2;

export function PerformanceDriver({ breakdown }: PerformanceDriverProps) {
  const ranked = sortFactorsByImpact(breakdown);
  const [lead, ...rest] = ranked;

  if (lead === undefined) {
    return null;
  }

  const scale = Math.abs(lead.value) || 1;
  const widthOf = (value: number) =>
    value === 0
      ? 0
      : Math.max((Math.abs(value) / scale) * 100, MIN_VISIBLE_WIDTH);

  return (
    <section>
      <h2 className="text-section-title text-text-primary">
        초과 성과는 어디서 왔나요?
      </h2>

      <div className="mt-4">
        <FactorRow
          label={ATTRIBUTION_FACTOR_LABEL[lead.factor]}
          value={lead.value}
          width={widthOf(lead.value)}
          lead
        />

        {rest.map((item) => (
          <FactorRow
            key={item.factor}
            label={ATTRIBUTION_FACTOR_LABEL[item.factor]}
            value={item.value}
            width={widthOf(item.value)}
            lead={false}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * 요인 한 줄. 1위만 18px/700 이고 나머지는 15px/500 · `--t2` 다.
 *
 * 막대 높이도 갈린다(6px 대 4px) — 굵기·크기·길이 셋이 같은 방향으로 움직여야
 * 1위가 하나라는 사실이 한눈에 들어온다.
 */
function FactorRow({
  label,
  value,
  width,
  lead,
}: {
  label: string;
  value: number;
  width: number;
  lead: boolean;
}) {
  const tone =
    value === 0
      ? 'bg-stock-neutral'
      : value > 0
        ? 'bg-stock-up-muted'
        : 'bg-stock-down-muted';

  return (
    <div className={lead ? '' : 'mt-4'}>
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={`min-w-0 truncate ${
            lead
              ? 'text-title-3 font-bold text-text-primary'
              : 'text-body-2 font-medium text-text-secondary'
          }`}
        >
          {label}
        </span>
        <span
          className={`flex-none whitespace-nowrap tabular-nums ${
            lead ? 'text-title-3 font-bold' : 'text-body-2 font-semibold'
          } ${
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

      <span
        aria-hidden="true"
        className={`mt-2 block w-full rounded-full ${lead ? 'h-1.5' : 'h-1'}`}
      >
        <span
          className={`block h-full rounded-full ${tone}`}
          style={{ width: `${width}%` }}
        />
      </span>
    </div>
  );
}
