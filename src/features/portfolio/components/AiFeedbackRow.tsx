import { useState } from 'react';

import { type AiFeedbackReason } from '@/shared/types/ai/feedback';

import { useAiFeedback } from '../api/useAiFeedback';

import { AiFeedbackReasonSheet } from './AiFeedbackReasonSheet';

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
 * **"도움됐어요" 는 바로 보내고 "아쉬워요" 는 사유 시트를 연다** (이슈 #32 회신으로
 * 확정, 프로토타입 `sheetFbReason`). `reasons`·`comment` 는 계약상 선택 값이라
 * 시트를 닫아도(사유 없이) 평가는 이미 접수된다 — 시트는 보탤 뿐 막지 않는다.
 */
export function AiFeedbackRow({
  requestId,
  className = '',
}: AiFeedbackRowProps) {
  const [submitted, setSubmitted] = useState<'up' | 'down' | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reasonSent, setReasonSent] = useState(false);
  const feedback = useAiFeedback();

  function submit(rating: 'up' | 'down') {
    if (submitted !== null) {
      return;
    }
    setSubmitted(rating);
    feedback.mutate({ requestId, rating });
    if (rating === 'down') {
      setReasonOpen(true);
    }
  }

  /**
   * 사유는 같은 `requestId` 로 다시 보낸다. 재전송은 덮어쓰기라 중복 접수가
   * 되지 않는다(contracts C66) — 그래서 평가를 먼저 넣고 사유를 나중에 보태는
   * 두 번 호출이 성립한다.
   */
  function submitReasons(reasons: AiFeedbackReason[], comment: string) {
    feedback.mutate({
      requestId,
      rating: 'down',
      reasons,
      ...(comment === '' ? {} : { comment }),
    });
    setReasonSent(true);
  }

  if (submitted !== null) {
    return (
      <>
        <div
          className={`flex items-center justify-between gap-3 border-t border-border pt-4 ${className}`}
        >
          <span className="text-caption text-text-secondary">
            {reasonSent
              ? '의견을 보냈어요. 더 나아지도록 반영할게요.'
              : '평가해 주셔서 감사해요.'}
          </span>
        </div>
        <AiFeedbackReasonSheet
          open={reasonOpen}
          onOpenChange={setReasonOpen}
          onSubmit={submitReasons}
        />
      </>
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
