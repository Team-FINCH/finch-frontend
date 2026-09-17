import { type AiCitation } from '@/shared/types/ai/envelope';
import { AiCitationList } from '@/shared/ui/AiCitationList';

/**
 * `FINCH가 진단했어요` — 숫자를 다 본 뒤에 오는 해석 (FINCH-325).
 *
 * ## 검정 카드를 걷었다
 *
 * 전에는 이 자리가 검정 `AiCard`(#24272C)였고 화면 **맨 위**였다. `CauseTab` 이
 * 같은 이유로 같은 수술을 받았다(FINCH-308) — 흰 배경 위 검정 덩어리는 어떤
 * 위계를 주더라도 가장 먼저 눈에 들어와서, 사용자가 자기 계좌의 숫자보다 AI 문장을
 * 먼저 읽었다.
 *
 * 이 탭은 그 근거가 더 셌다. 카드가 `summary.text` 2~3문장을 `headline` 으로 받아
 * `body-1 font-semibold` 로 여섯 줄을 굵게 깔았는데, `design.md` §8.1 은 그 자리를
 * **"핵심 결론 최대 2줄"** 로 정의했고 `AiCard` 의 prop 주석도 그렇게 적혀 있다.
 * 전부 굵으면 강조가 없는 것과 같다.
 *
 * ## 문장은 아직 한 덩어리다
 *
 * `헤드라인 / 본문` 두 자리로 쓰고 싶지만 `summary` 가 2~3문장이 이어진 하나다
 * (프롬프트가 `narrative` 한 필드를 낸다). **프론트가 마침표로 자르지 않는다** —
 * 문장이 2개로 오는 날 자리가 비고, 그건 `ia.md` §4 "프론트는 AI 응답을 조립하지
 * 않는다" 에 걸린다. `AiInsightPanel` 이 같은 판단을 이미 적어 두었다.
 *
 * 응답 쪽 요청은 별도 이슈로 나간다 — 나열 금지 · `moderate` 노출 · 자리표시자
 * 뒤 조사(`43.2%으로`).
 *
 * ## 근거와 고지가 여기로 들어왔다
 *
 * 전에는 `AiCitationList` 와 면책 문구가 탭 맨 아래에 따로 떠 있었다. 둘 다
 * **이 문장에 딸린 것**이라 같은 묶음 안으로 넣는다 — 화면에서 AI 가 만든 것과
 * 엔진이 계산한 것의 경계가 이 섹션 하나로 끝난다.
 *
 * 근거 목록은 패널 면 **밖**이다 (`ia.md` §4 · `design.md` §7.6). 안에 넣으면
 * 문장과 같은 무게로 읽힌다.
 *
 * ## 피드백을 붙이지 않는다
 *
 * 프로토타입 실제 UI 에서 피드백이 붙는 자리는 셋뿐이고 이 탭은 그중 하나가 아니다
 * (`ia.md` §4 "피드백 슬롯 배치 규칙" 각주). 면이 낮아졌다고 달라지지 않는다.
 *
 * `SoftBox` 를 쓰지 않고 같은 토큰으로 직접 그린다 — 그쪽은 `p-4`(16px) 고정이고
 * 이 패널은 20px 이 필요하다. `AiInsightPanel` 과 같은 이유다.
 */

type DiagnosisInsightPanelProps = {
  /** `summary.text`. 문장 생성이 막히면 `null` 이고 지표는 그대로 나간다 */
  text: string | null;
  citations: readonly AiCitation[];
  /** 봉투가 늘 실어 주는 면책 문구. 화면이 지어내지 않는다 */
  disclaimer: string;
};

export function DiagnosisInsightPanel({
  text,
  citations,
  disclaimer,
}: DiagnosisInsightPanelProps) {
  return (
    <section className="mt-12">
      <h2 className="text-section-title text-text-primary">
        FINCH가 진단했어요
      </h2>

      <div className="mt-4 rounded-sm bg-surface-soft p-5">
        <p className="text-body-1 text-pretty text-text-primary">
          {text ?? '진단 결과를 준비하지 못했어요.'}
        </p>
      </div>

      <AiCitationList citations={citations} className="mt-4" />

      <p className="mt-4 text-caption text-pretty text-text-muted">
        {disclaimer}
      </p>
    </section>
  );
}
