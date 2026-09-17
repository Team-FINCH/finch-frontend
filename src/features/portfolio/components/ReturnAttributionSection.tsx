import { type AiAttributionContent } from '@/shared/types/ai/attribution';

import {
  ATTRIBUTION_FACTOR_LABEL,
  ATTRIBUTION_FACTOR_NOTE,
  ATTRIBUTION_FACTOR_ORDER,
  divergingScale,
  formatSignedPercentPoint,
  resolveMainFactor,
  type AttributionFactor,
} from '../lib/attributionInsight';

import { DivergingBar } from './DivergingBar';

/**
 * "수익률 기여" — 시장·업종·종목 선택 세 축 (FINCH-308).
 *
 * ## 제목을 줄였다 (FINCH-327)
 *
 * 전에는 `무엇이 수익률을 만들었나요?` 였다. 프로토타입에 없는 우리 copy 라 바꿔도
 * 디자인 원본과 어긋나지 않고, 바로 아래 `종목별 기여` 와 나란히 서서 **요인별 →
 * 종목별** 이라는 두 단이 제목만으로 읽힌다. 질문형은 한 줄을 다 쓰면서 아래
 * 섹션과의 관계를 말해 주지 않았다.
 *
 * 세 요인의 라벨(`시장 영향`·`업종 영향`·`종목 선택`)은 그대로다 —
 * **프로토타입 원문이다.** 코드에서만 줄이면 디자인 원본과 갈린다.
 *
 * ## 라벨과 값을 붙여 놓는다
 *
 * 전에는 `라벨 | 막대 | 값` 을 한 줄에 가로로 늘어놓았다. 화면 폭이 좁아 셋 사이가
 * 멀어지고 **막대가 가운데 떠 있는 모양**이 됐다 — 라벨을 읽고 눈이 오른쪽 끝까지
 * 건너가야 값을 만났다.
 *
 * 그래서 두 줄로 접는다.
 *
 * ```
 * 시장 영향                    +0.89%p
 *              │━━━━━━
 * ```
 *
 * 라벨과 값이 같은 줄 양끝에 서고(`justify-between`) 막대는 그 아래 폭을 다 쓴다.
 * 라벨→값이 한 눈에 이어지고, 막대는 폭이 넓어져 짧은 값도 길이가 드러난다.
 *
 * ## 단위는 `%p` 다
 *
 * 셋을 더하면 기간 수익률이 된다 — 수익률의 조각이라 퍼센트포인트다.
 * 위 hero 의 `+2.13%` 와 단위가 다른 것이 맞다.
 *
 * ## 합계를 적지 않는다
 *
 * `market + sector + selection` 은 기간 수익률과 정확히 같다(엔진이 §6.3 항등식을
 * 검증한다). 그래도 합계 줄을 두지 않는다 — 같은 값이 hero 에 이미 가장 크게 있고,
 * 한 수치를 두 곳에 적으면 포맷이 갈라지는 날 둘이 달라 보인다.
 *
 * ## 강조는 굵기 하나로만
 *
 * 가장 큰 축의 라벨만 굵게 한다. 뱃지·아이콘·배경을 새로 만들지 않는다 — 셋 중
 * 하나라는 사실은 이미 막대 길이가 말하고 있어서 표시를 더 얹으면 반복이다.
 *
 * ## 아래 한 줄은 AI 가 쓰지 않는다
 *
 * `종목 선택의 영향이 가장 컸어요` 는 `resolveMainFactor` 의 결과를 말로 옮긴
 * 것이다. 세 값을 비교하면 누구나 같은 답을 내므로 생성할 이유가 없고, AI 에게
 * 맡기면 차트와 문장이 어긋날 자리가 생긴다. **인과를 말하지 않는다는 것이
 * 이 문장이 지켜야 할 선이다** — "가장 컸다" 까지가 데이터고, "그래서 올랐다" 부터가
 * 해석이라 그쪽은 아래 AI 영역 몫이다.
 */

type ReturnAttributionSectionProps = {
  breakdown: AiAttributionContent['breakdown'];
};

export function ReturnAttributionSection({
  breakdown,
}: ReturnAttributionSectionProps) {
  const values = ATTRIBUTION_FACTOR_ORDER.map((factor) => breakdown[factor]);
  const scale = divergingScale(values);
  const mainFactor = resolveMainFactor(breakdown);
  const allZero = values.every((value) => value === 0);

  return (
    <section className="mt-8">
      <h2 className="text-section-title text-text-primary">수익률 기여</h2>

      <div className="mt-4 flex flex-col gap-4">
        {ATTRIBUTION_FACTOR_ORDER.map((factor) => (
          <AttributionRow
            key={factor}
            factor={factor}
            value={breakdown[factor]}
            scale={scale}
            emphasized={!allZero && factor === mainFactor}
          />
        ))}
      </div>

      {/* 셋이 모두 0 인 기간에는 "가장 컸다" 고 말할 것이 없다. */}
      {!allZero && (
        <p className="mt-4 text-body-2 text-text-secondary">
          {ATTRIBUTION_FACTOR_NOTE[mainFactor]}
        </p>
      )}
    </section>
  );
}

function AttributionRow({
  factor,
  value,
  scale,
  emphasized,
}: {
  factor: AttributionFactor;
  value: number;
  scale: number;
  emphasized: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span
          className={`min-w-0 truncate text-body-1 ${
            emphasized
              ? 'font-bold text-text-primary'
              : 'font-medium text-text-secondary'
          }`}
        >
          {ATTRIBUTION_FACTOR_LABEL[factor]}
        </span>
        <span
          className={`flex-none text-body-1 font-bold whitespace-nowrap tabular-nums ${
            value === 0
              ? 'text-stock-neutral'
              : value > 0
                ? 'text-stock-up'
                : 'text-stock-down'
          }`}
        >
          {formatSignedPercentPoint(value)}
        </span>
      </div>

      <DivergingBar value={value} scale={scale} className="mt-2" />
    </div>
  );
}
