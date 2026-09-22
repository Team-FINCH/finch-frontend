import { type AiAttributionContent } from '@/shared/types/ai/attribution';
import { Card } from '@/shared/ui/Card';

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
import { InsightBox } from './InsightBox';

/**
 * `기여 분석` 탭의 본문 — 시장·업종·종목 선택 세 축 (FINCH-308 · 333).
 *
 * ## 제목을 지웠다 (FINCH-333)
 *
 * `수익률 기여` 라는 `h2` 가 있었다. 이제 이 블록은 `기여 분석` 탭을 눌러야만
 * 나오므로 **탭 라벨이 곧 제목이다.** 패널이 `aria-labelledby` 로 탭 버튼을
 * 가리키고 있어 문서 구조에서도 이름이 빠지지 않는다. 남겨 두면 `기여 분석`
 * 바로 아래 `수익률 기여` 가 서서 같은 말이 두 줄을 먹는다.
 *
 * (그 전 이름은 `무엇이 수익률을 만들었나요?` 였다 — 프로토타입에 없는 우리
 * copy 라 줄여도 디자인 원본과 어긋나지 않았다. 세 요인의 라벨
 * `시장 영향`·`업종 영향`·`종목 선택` 은 **프로토타입 원문이라 그대로다.**)
 *
 * ## 흰 카드 안으로 들어왔다 (FINCH-333)
 *
 * 전에는 페이지 배경 위 평면이었다. 그때는 "면을 갖는 것은 성과와 FINCH 해석
 * 둘뿐" 이라는 판단(FINCH-327)이 맞았다 — 한 화면에 섹션 넷이 세로로
 * 이어져서 넷 다 카드로 감싸면 카드가 겹겹이 쌓였다.
 *
 * **탭이 그 전제를 바꿨다.** 이 탭이 켜지면 화면에 서는 면은 성과 카드와 이
 * 카드 둘이다. 여전히 둘이고, 대신 이 블록이 어디서 시작해 어디서 끝나는지
 * 표시가 생겼다.
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
 * ───────────────────────────────────  ← --color-divider
 * 업종 영향                    -0.18%p
 * ```
 *
 * 라벨과 값이 같은 줄 양끝에 서고(`justify-between`) 막대는 그 아래 폭을 다 쓴다.
 *
 * ## 줄 사이에 선을 그었다 (FINCH-333)
 *
 * 전에는 `gap-4` 여백뿐이었다. 한 행이 **`라벨/값` 줄 + 막대 줄** 두 층이라
 * 여백만으로는 "1행의 막대" 와 "2행의 라벨" 사이가 행 안쪽 간격과 비슷해 보여서,
 * 막대가 위 줄 것인지 아래 줄 것인지 매번 눈으로 다시 묶어야 했다.
 *
 * `--color-divider` 다. 카드 테두리(`--color-border`)보다 반톤 진한 값이고
 * **카드 안에서 내용 덩어리를 가르라고 만든 토큰**이라 이 자리가 그 쓰임이다.
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
 *
 * FINCH-333 에서 맨 `<p>` 를 `InsightBox` 로 옮겼다. 이유는 그쪽 주석에 있다.
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
    <Card className="mt-4">
      <div>
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
        <InsightBox className="mt-5">
          {ATTRIBUTION_FACTOR_NOTE[mainFactor]}
        </InsightBox>
      )}
    </Card>
  );
}

/**
 * 요인 한 줄. 위 여백과 구분선을 **자기 자신이** 갖는다 (`first:` 로 첫 줄만 뺀다).
 * 부모가 `gap` 으로 주면 선과 여백이 따로 놀아 선이 두 행 중 어디에 속하는지
 * 흐려진다 — `SoftBoxRow` 와 같은 처리다.
 */
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
    <div className="mt-4 border-t border-divider pt-4 first:mt-0 first:border-t-0 first:pt-0">
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
