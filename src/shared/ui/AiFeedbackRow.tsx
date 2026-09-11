import { useState } from 'react';

import { useAiFeedback } from '@/shared/hooks/useAiFeedback';
import { showToast } from '@/shared/hooks/useToastStore';
import { type AiFeedbackReason } from '@/shared/types/ai/feedback';

import { AiFeedbackReasonSheet } from './AiFeedbackReasonSheet';

type AiFeedbackRowProps = {
  /**
   * 평가 대상 응답의 `requestId`. `POST /ai/feedback` 이 이 값으로 원본을 찾는다.
   * 이 값이 없으면 슬롯 자체를 만들지 않는다 (contracts C14·C70).
   */
  requestId: string;
  className?: string;
};

/**
 * AI 응답 피드백 한 줄 — "이 분석이 도움이 됐나요?" + 도움됐어요/아쉬워요
 * (프로토타입 `fbIdle`·`fbSent` 실측 문구·스타일, design.md §9 "Feedback Rule").
 *
 * **`requestId` 하나 = 피드백 슬롯 하나** (ia.md §4 "피드백 슬롯 배치 규칙").
 * 화면 단위도 섹션 단위도 아니다 — 그래서 섹션마다 붙이지 않고 응답 블록의
 * **마지막 요소**로 한 번만 둔다. `dataAsOf`·`disclaimer` 표기 아래에 온다.
 * `requestId` 하나만 받아 동작하므로 feature 가 아니라 여기 있다 — "feature 에
 * 두면 여섯 곳에서 재구현된다"(ia.md §5). `features/stocks` 와 `features/portfolio`
 * 에 따로 있던 두 벌을 합쳤고, 사유 시트가 있던 portfolio 판을 기준으로 삼았다.
 *
 * **실패·데이터 부족 자리에는 이 컴포넌트를 붙이지 않는다** (ia.md §4, design.md §10
 * "Feedback 노출 금지"). 실패 자리의 주 동작은 재시도 하나여야 한다.
 *
 * **"도움됐어요" 는 바로 보내고 "아쉬워요" 는 사유 시트를 연다** (이슈 #32 회신으로
 * 확정, design.md §9 "슬롯 3곳이 같은 시트를 쓴다", 프로토타입 `sheetFbReason`).
 * `reasons`·`comment` 는 계약상 선택 값이라 시트를 닫아도(사유 없이) 평가는 이미
 * 접수된다 — 시트는 보탤 뿐 막지 않는다.
 *
 * 한 번 누르면 잠긴다. 잠금은 로컬 상태로 즉시 걸고(누른 순간 확인 문구로 바뀐다),
 * 전송 중에는 버튼도 비활성화해 이중 전송을 막는다.
 *
 * **전송 확인은 토스트가 맡는다** (FINCH-232). 토스트 기구가 없던 동안은 이
 * 줄 자리에 같은 문장을 대신 썼는데, 이제 프로토타입대로 `의견을 보냈어요.` 를
 * 토스트로 띄운다. 그때 쓰던 `의견을 보냈어요. 더 나아지도록 반영할게요.` 는
 * **버렸다** — 반영을 약속하는 문장인데 그 보장이 없고 design.md §13(단정을
 * 피한다)과 어긋난다 (이슈 #54 회신). 문구는 사유를 보탰든 아니든 하나다.
 *
 * "아쉬워요" 만 누르고 사유 시트를 닫으면 토스트를 띄우지 않는다 — 프로토타입도
 * `down` 은 시트만 열고 확인을 띄우지 않는다. 그 자리의 확인은 사유를 보낸 뒤다.
 *
 * 위 여백은 컴포넌트가 갖지 않는다. 앞 요소(`disclaimer`)와의 간격은 호출부가
 * `className` 으로 정한다.
 */
export function AiFeedbackRow({
  requestId,
  className = '',
}: AiFeedbackRowProps) {
  const [submitted, setSubmitted] = useState<'up' | 'down' | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const feedback = useAiFeedback();

  function submit(rating: 'up' | 'down') {
    if (submitted !== null) {
      return;
    }
    setSubmitted(rating);
    feedback.mutate({ requestId, rating });
    if (rating === 'down') {
      setReasonOpen(true);
      return;
    }
    showToast('의견을 보냈어요.');
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
    showToast('의견을 보냈어요.');
  }

  if (submitted !== null) {
    return (
      <>
        <div
          className={`flex items-center justify-between gap-3 border-t border-border pt-4 ${className}`}
        >
          <span className="text-caption text-text-secondary">
            평가해 주셔서 감사해요.
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
          disabled={feedback.isPending}
          onClick={() => submit('up')}
          className="h-7.5 rounded-tag border border-border px-2.75 text-caption font-medium text-text-secondary disabled:opacity-50"
        >
          도움됐어요
        </button>
        <button
          type="button"
          disabled={feedback.isPending}
          onClick={() => submit('down')}
          className="h-7.5 rounded-tag border border-border px-2.75 text-caption font-medium text-text-secondary disabled:opacity-50"
        >
          아쉬워요
        </button>
      </span>
    </div>
  );
}
