import { type AiAttributionContent } from '@/shared/types/ai/attribution';

import {
  ATTRIBUTION_FACTOR_NOTE,
  ATTRIBUTION_FACTOR_ORDER,
  resolveMainFactor,
} from '../lib/attributionInsight';

import { AttributionWaterfall } from './AttributionWaterfall';
import { InsightNote } from './InsightNote';

/**
 * `기여 분석` 탭의 본문 — 시장·업종·종목 선택 세 축 (FINCH-308 · 333 · 341).
 *
 * ## 이 파일은 배치만 한다
 *
 * ```
 * 수익률은 이렇게 만들어졌어요        ← 머리 한 줄
 * [워터폴]                          ← AttributionWaterfall
 * 종목 선택의 영향이 가장 컸어요.      ← InsightNote
 * ```
 *
 * ## 카드를 벗었다 (FINCH-341)
 *
 * 흰 `Card` 안이었다. `요약` 탭이 2026-09-23 에 카드를 전부 걷으면서 **세 탭의
 * 결이 갈렸고**, 그때 `CauseTab` 주석이 *"`기여 분석`·`종목별` 탭은 아직 카드다.
 * 세 탭의 결이 갈리므로 같은 처리를 이어서 하는 것이 맞다"* 로 남겨 둔 숙제가
 * 이것이다.
 *
 * 이 탭이 켜지면 화면에 서는 면은 위 성과 히어로도 아니고 서브탭 트랙 하나뿐이다.
 * 위계는 상자가 아니라 타이포와 여백이 진다.
 *
 * ## 머리 한 줄이 제목을 대신한다
 *
 * `기여도 %p` 라는 캡션이었다. **오른쪽 숫자 열이 무엇인지**는 말했지만 이 블록이
 * 무엇을 보여주는 곳인지는 말하지 않았다. `수익률은 이렇게 만들어졌어요` 는
 * 그 자리를 대신하면서 아래 워터폴이 답할 질문을 먼저 세운다 — 단위는 각 값에
 * 이미 `%p` 로 붙어 있다.
 *
 * `h2` 로 올리지 않는다. 이 블록은 `기여 분석` 탭을 눌러야 나오므로 **탭 라벨이
 * 곧 제목이고**, 패널이 `aria-labelledby` 로 탭 버튼을 가리킨다.
 *
 * ## 합계 규칙이 좁혀졌다
 *
 * *합계를 적지 않는다* 였다. 이제 *본문 중간에 큰 숫자로 세우지 않는다* 이고,
 * 흐름의 도착점에는 적는다 — 근거는 `AttributionWaterfall` 주석에 있다.
 *
 * ## 아래 한 줄은 AI 가 쓰지 않는다
 *
 * `종목 선택의 영향이 가장 컸어요` 는 `resolveMainFactor` 의 결과를 말로 옮긴
 * 것이다. 세 값을 비교하면 누구나 같은 답을 내므로 생성할 이유가 없고, AI 에게
 * 맡기면 차트와 문장이 어긋날 자리가 생긴다. **인과를 말하지 않는다는 것이
 * 이 문장이 지켜야 할 선이다** — "가장 컸다" 까지가 데이터고, "그래서 올랐다" 부터가
 * 해석이라 그쪽은 `요약` 탭의 FINCH 카드 몫이다.
 *
 * 요인마다 붙는 설명(`ATTRIBUTION_FACTOR_DESCRIPTION`)은 이 문장과 역할이 다르다.
 * 그쪽은 기간과 무관한 **정의**이고 이 줄은 **이번 기간의 판정**이다. 셋 다
 * 판정을 말하면 무엇을 먼저 읽어야 하는지가 사라진다.
 */

type ReturnAttributionSectionProps = {
  breakdown: AiAttributionContent['breakdown'];
  /** 워터폴의 도착점. 응답 값 그대로 넘긴다 */
  portfolioReturn: number;
};

export function ReturnAttributionSection({
  breakdown,
  portfolioReturn,
}: ReturnAttributionSectionProps) {
  const mainFactor = resolveMainFactor(breakdown);
  const allZero = ATTRIBUTION_FACTOR_ORDER.every(
    (factor) => breakdown[factor] === 0,
  );

  return (
    <section className="mt-5">
      <p className="text-label font-medium text-text-muted">
        수익률은 이렇게 만들어졌어요
      </p>

      <div className="mt-4">
        <AttributionWaterfall
          breakdown={breakdown}
          portfolioReturn={portfolioReturn}
        />
      </div>

      {/* 셋이 모두 0 인 기간에는 "가장 컸다" 고 말할 것이 없다. */}
      {!allZero && (
        <InsightNote className="mt-4">
          {ATTRIBUTION_FACTOR_NOTE[mainFactor]}
        </InsightNote>
      )}
    </section>
  );
}
