import { useState } from 'react';

import { useFeedbackMutation } from '@/features/chat/api/useFeedbackMutation';
import { type AiFeedbackRating } from '@/shared/types/ai/feedback';

/**
 * 응답 피드백 — `requestId` 하나 = Feedback Slot 하나(design.md §9 Feedback Rule).
 * `도움됐어요 / 아쉬워요` Compact Neutral Secondary Button 둘. **Green/Red 금지** —
 * 긍정·부정을 색으로 가르지 않는다.
 *
 * 같은 `requestId` 로 다시 보내면 마지막 값으로 덮어쓴다(contracts C66) — 그래서
 * 한 번 보낸 뒤에도 버튼을 계속 눌러 평가를 바꿀 수 있게 둔다.
 */
export function ChatFeedbackButtons({ requestId }: { requestId: string }) {
  const [selected, setSelected] = useState<AiFeedbackRating | null>(null);
  const feedback = useFeedbackMutation();

  function handleRate(rating: AiFeedbackRating) {
    setSelected(rating);
    feedback.mutate({ requestId, rating, reasons: null, comment: null });
  }

  return (
    <div className="mt-2 flex gap-2">
      <button
        type="button"
        onClick={() => handleRate('up')}
        aria-pressed={selected === 'up'}
        className={`h-9 min-w-18 rounded-sm border px-3.5 text-caption ${
          selected === 'up'
            ? 'border-text-primary text-text-primary'
            : 'border-border-strong text-text-secondary'
        }`}
      >
        도움됐어요
      </button>
      <button
        type="button"
        onClick={() => handleRate('down')}
        aria-pressed={selected === 'down'}
        className={`h-9 min-w-18 rounded-sm border px-3.5 text-caption ${
          selected === 'down'
            ? 'border-text-primary text-text-primary'
            : 'border-border-strong text-text-secondary'
        }`}
      >
        아쉬워요
      </button>
    </div>
  );
}
