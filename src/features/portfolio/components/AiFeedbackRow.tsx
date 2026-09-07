import { useState } from 'react';

import { useAiFeedback } from '../api/useAiFeedback';

type AiFeedbackRowProps = {
  /** 평가 대상 응답의 `requestId`. `POST /ai/feedback` 이 이 값으로 원본을 찾는다. */
  requestId: string;
  className?: string;
};

/**
 * 응답 피드백 한 줄 — "이 분석이 도움이 됐나요?" + 도움됐어요/아쉬워요
 * (프로토타입 실측 문구·스타일 그대로).
 *
 * **`requestId` 하나 = 슬롯 하나** 원칙에 따라 이 컴포넌트도 `requestId` 단위로
 * 쓰인다(ia.md §4 "피드백 슬롯 배치 규칙"). 프로토타입 실제 UI에 피드백이 붙는
 * 자리는 셋뿐이고 그중 하나가 이 자리(수익률 원인 분석)다 — `tab=diagnosis` 탭에는
 * 붙이지 않는다.
 *
 * `reasons`·`comment` 입력 UI는 만들지 않는다. 둘 다 선택 값이고(`AiFeedbackRequestSchema`)
 * 이 티켓의 범위가 아니다 — 평가 자체(up/down)만 접수한다.
 */
export function AiFeedbackRow({
  requestId,
  className = '',
}: AiFeedbackRowProps) {
  const [submitted, setSubmitted] = useState<'up' | 'down' | null>(null);
  const feedback = useAiFeedback();

  function submit(rating: 'up' | 'down') {
    if (submitted !== null) {
      return;
    }
    setSubmitted(rating);
    feedback.mutate({ requestId, rating });
  }

  if (submitted !== null) {
    return (
      <div
        className={`flex items-center justify-between gap-3 border-t border-border pt-4 ${className}`}
      >
        <span className="text-caption text-text-secondary">
          평가해 주셔서 감사해요.
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 border-t border-border pt-4 ${className}`}
    >
      <span className="text-caption text-text-secondary">
        이 분석이 도움이 됐나요?
      </span>
      <span className="flex gap-1.5">
        <button
          type="button"
          onClick={() => submit('up')}
          className="h-7.5 rounded-sm border border-border px-2.75 text-caption font-medium text-text-secondary"
        >
          도움됐어요
        </button>
        <button
          type="button"
          onClick={() => submit('down')}
          className="h-7.5 rounded-sm border border-border px-2.75 text-caption font-medium text-text-secondary"
        >
          아쉬워요
        </button>
      </span>
    </div>
  );
}
