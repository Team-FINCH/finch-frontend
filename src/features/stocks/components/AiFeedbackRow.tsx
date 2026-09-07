import { useAiFeedback } from '../api/useAiFeedback';

/**
 * AI 응답 피드백 한 줄 (프로토타입 `fbIdle`·`fbSent`, ia.md §4 "피드백 슬롯 배치 규칙").
 *
 * **`requestId` 하나 = 피드백 슬롯 하나** (ia.md §4). 화면 단위도 섹션 단위도 아니다 —
 * 그래서 섹션마다 붙이지 않고 응답 블록의 **마지막 요소**로 한 번만 둔다.
 * `dataAsOf`·`disclaimer` 표기 아래에 온다.
 *
 * **실패·데이터 부족 자리에는 이 컴포넌트를 붙이지 않는다** (ia.md §4, design.md §10
 * "Feedback 노출 금지"). 실패 자리의 주 동작은 재시도 하나여야 한다. ia.md 이전 판이
 * 반대로 적었다가 이번 개정에서 뒤집힌 자리라 특히 주의한다.
 *
 * 전송에 성공하면 "보냈습니다" 로 바꾸고 다시 누를 수 없게 잠근다 (ia.md §4).
 *
 * TODO(계약): `down` 을 누른 뒤 펼치는 `reasons` 6종 선택과 `comment` 입력을 만들지
 * 않았다. 프로토타입이 이 자리에 `도움됐어요`·`아쉬워요` 두 버튼만 그리고 사유 선택
 * UI 가 없어서 프로토타입을 따랐다 (`AiFeedbackRequest` 에서 두 필드는 선택값이다).
 * 함께 미확정인 것 — 피드백을 붙일 자리가 "슬롯 6종 전부" 인지도 확정이 아니다.
 * PRD 는 8곳, ia.md 표는 6곳, 프로토타입 실제 UI 는 3곳으로 셋이 갈린다.
 * — 근거: ia.md §4:542 · §4:559~566 / 이슈 #26 5번
 */
type AiFeedbackRowProps = {
  /** 평가 대상 응답의 `requestId`. 이 값이 없으면 슬롯 자체를 만들지 않는다. */
  requestId: string;
};

export function AiFeedbackRow({ requestId }: AiFeedbackRowProps) {
  const feedback = useAiFeedback();

  return (
    <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4.5">
      <span className="text-caption text-text-muted">
        이 분석이 도움이 됐나요?
      </span>

      {feedback.isSuccess ? (
        <span className="text-label text-text-muted">보냈습니다</span>
      ) : (
        <span className="flex gap-1.5">
          <button
            type="button"
            disabled={feedback.isPending}
            onClick={() => feedback.mutate({ requestId, rating: 'up' })}
            className="h-7.5 rounded-sm border border-border px-2.75 text-caption font-medium text-text-secondary disabled:opacity-50"
          >
            도움됐어요
          </button>
          <button
            type="button"
            disabled={feedback.isPending}
            onClick={() => feedback.mutate({ requestId, rating: 'down' })}
            className="h-7.5 rounded-sm border border-border px-2.75 text-caption font-medium text-text-secondary disabled:opacity-50"
          >
            아쉬워요
          </button>
        </span>
      )}
    </div>
  );
}
