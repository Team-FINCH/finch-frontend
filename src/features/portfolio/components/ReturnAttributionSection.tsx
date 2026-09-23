import { type AiAttributionContent } from '@/shared/types/ai/attribution';
import { Card } from '@/shared/ui/Card';

import {
  ATTRIBUTION_FACTOR_LABEL,
  ATTRIBUTION_FACTOR_NOTE,
  ATTRIBUTION_FACTOR_ORDER,
  divergingScale,
  resolveMainFactor,
} from '../lib/attributionInsight';

import { ContributionRow } from './ContributionRow';
import { InsightNote } from './InsightNote';

/**
 * `기여 분석` 탭의 본문 — 시장·업종·종목 선택 세 축 (FINCH-308 · 333).
 *
 * ## 이 파일은 이제 배치만 한다
 *
 * 행을 그리는 일은 `ContributionRow` 가 한다. 종목 목록과 같은 부품이라 두 탭의
 * 행 리듬이 갈릴 수 없다 — 전에는 이 파일과 `StockContributionSection` 이 각자
 * 행을 그려서 간격이 16px 대 14px 로 달랐다.
 *
 * ## 카드가 맨 행으로 시작하지 않는다
 *
 * 맨 위에 `기여도 %p` 캡션 한 줄을 둔다. 세 가지를 한꺼번에 한다.
 *
 * - **오른쪽 숫자 열이 무엇인지 말한다.** 값에 `%p` 가 붙어 있지만 그것이 무엇에
 *   대한 퍼센트포인트인지는 적혀 있지 않았다
 * - **`종목별` 탭과 모양을 맞춘다.** 그쪽은 `영향이 큰 순 / 전체 8종목 ›` 줄로
 *   시작한다. 한쪽만 캡션 없이 바로 데이터가 나오면 두 탭이 다른 화면으로 보인다
 * - 카드 윗변과 첫 행 사이를 캡션이 받아 준다. 20px 여백 뒤에 곧장 16px 굵은
 *   글씨가 오면 "여백은 많은데 허전한" 모양이 된다
 *
 * **`영향이 큰 순` 이라고 쓰지 않는다.** 요인 셋은 `ATTRIBUTION_FACTOR_ORDER`
 * 고정 순서(시장→업종→선택)이지 정렬한 것이 아니다. 종목 목록만 정렬한다.
 *
 * ## 제목을 지웠다 (FINCH-333)
 *
 * `수익률 기여` 라는 `h2` 가 있었다. 이제 이 블록은 `기여 분석` 탭을 눌러야만
 * 나오므로 **탭 라벨이 곧 제목이다.** 패널이 `aria-labelledby` 로 탭 버튼을
 * 가리키고 있어 문서 구조에서도 이름이 빠지지 않는다.
 *
 * (그 전 이름은 `무엇이 수익률을 만들었나요?` 였다 — 프로토타입에 없는 우리
 * copy 라 줄여도 디자인 원본과 어긋나지 않았다. 세 요인의 라벨
 * `시장 영향`·`업종 영향`·`종목 선택` 은 **프로토타입 원문이라 그대로다.**)
 *
 * ## 흰 카드 안으로 들어왔다
 *
 * 전에는 페이지 배경 위 평면이었다. 그때는 "면을 갖는 것은 성과와 FINCH 해석
 * 둘뿐" 이라는 판단(FINCH-327)이 맞았다 — 한 화면에 섹션 넷이 세로로
 * 이어져서 넷 다 카드로 감싸면 카드가 겹겹이 쌓였다.
 *
 * **탭이 그 전제를 바꿨다.** 이 탭이 켜지면 화면에 서는 면은 성과 카드와 이
 * 카드 둘이다. 여전히 둘이고, 대신 이 블록이 어디서 시작해 어디서 끝나는지
 * 표시가 생겼다.
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
 * 한 수치를 두 곳에 적으면 포맷이 갈라지는 날 둘이 달라 보인다. 항등식 자체는
 * `분석 기준 및 안내` 시트가 문장으로 밝힌다.
 *
 * ## 아래 한 줄은 AI 가 쓰지 않는다
 *
 * `종목 선택의 영향이 가장 컸어요` 는 `resolveMainFactor` 의 결과를 말로 옮긴
 * 것이다. 세 값을 비교하면 누구나 같은 답을 내므로 생성할 이유가 없고, AI 에게
 * 맡기면 차트와 문장이 어긋날 자리가 생긴다. **인과를 말하지 않는다는 것이
 * 이 문장이 지켜야 할 선이다** — "가장 컸다" 까지가 데이터고, "그래서 올랐다" 부터가
 * 해석이라 그쪽은 `요약` 탭의 FINCH 카드 몫이다.
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
      <p className="text-caption text-text-muted">기여도 %p</p>

      <div className="mt-3">
        {ATTRIBUTION_FACTOR_ORDER.map((factor) => (
          <ContributionRow
            key={factor}
            label={ATTRIBUTION_FACTOR_LABEL[factor]}
            value={breakdown[factor]}
            scale={scale}
            emphasis={!allZero && factor === mainFactor ? 'lead' : 'sub'}
          />
        ))}
      </div>

      {/* 셋이 모두 0 인 기간에는 "가장 컸다" 고 말할 것이 없다. */}
      {!allZero && (
        <InsightNote className="mt-4">
          {ATTRIBUTION_FACTOR_NOTE[mainFactor]}
        </InsightNote>
      )}
    </Card>
  );
}
