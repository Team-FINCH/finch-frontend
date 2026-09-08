import { useState } from 'react';

import {
  AI_FEEDBACK_COMMENT_MAX_LENGTH,
  AI_FEEDBACK_REASONS,
  type AiFeedbackReason,
} from '@/shared/types/ai/feedback';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';

/**
 * "아쉬워요" 뒤에 뜨는 사유 시트 (프로토타입 `sheetFbReason`, FINCH-154).
 *
 * 이슈 #32 회신(2026-09-04)으로 확정된 것이 프로토타입에 그려졌고, 이 시트를
 * 만들 자리는 `AiFeedbackRow` 가 master 에 들어온 뒤에야 생겼다 — 그전에는
 * 부를 곳이 없어 미뤄 두었다.
 *
 * **라벨은 계약 열거값과 순서까지 같다.** 프로토타입이 여섯 문구를 배열 순서로만
 * 갖고 있어서, `AI_FEEDBACK_REASONS` 의 순서에 하나씩 대응시켰다. 열거값을
 * 늘리거나 순서를 바꾸면 이 표도 함께 고쳐야 한다 — 그래서 `Record` 로 두어
 * 값이 빠지면 타입이 잡히게 했다.
 */
const REASON_LABEL: Record<AiFeedbackReason, string> = {
  wrong_number: '숫자가 틀렸어요',
  not_relevant: '관련이 없어요',
  outdated: '오래된 정보예요',
  too_generic: '너무 뻔해요',
  unclear: '이해하기 어려워요',
  wrong_citation: '근거가 이상해요',
};

/** 프로토타입 `.chip` 실측 — 34px · 좌우 14px · 반경 11px · 14px/500. */
const CHIP_BASE_CLASS =
  'inline-flex h-8.5 items-center rounded-[11px] px-3.5 text-[14px] font-medium ' +
  'transition-all duration-(--motion-fast) ease-standard active:scale-[0.97] ' +
  'motion-reduce:transition-none motion-reduce:active:scale-100';

type AiFeedbackReasonSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 고른 사유와 자유 입력을 함께 넘긴다. 시트는 전송하지 않는다. */
  onSubmit: (reasons: AiFeedbackReason[], comment: string) => void;
};

export function AiFeedbackReasonSheet({
  open,
  onOpenChange,
  onSubmit,
}: AiFeedbackReasonSheetProps) {
  const [reasons, setReasons] = useState<AiFeedbackReason[]>([]);
  const [comment, setComment] = useState('');

  // 하나라도 고르거나 적어야 보낼 수 있다 (프로토타입 `fbCanSend`).
  const canSend = reasons.length > 0 || comment.trim() !== '';

  function toggle(reason: AiFeedbackReason) {
    setReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((value) => value !== reason)
        : [...prev, reason],
    );
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      // 닫으면 고른 것을 버린다. 다시 열었을 때 지난 선택이 남아 있으면
      // 사용자가 이미 보낸 것으로 오해한다.
      setReasons([]);
      setComment('');
    }
    onOpenChange(next);
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="어떤 점이 아쉬웠나요?"
      hideTitle
    >
      <p className="mb-1.5 text-title-3 text-text-primary">
        어떤 점이 아쉬웠나요?
      </p>
      <p className="mb-4.5 text-body-2 text-text-secondary">
        해당하는 것을 골라주세요. 여러 개도 괜찮아요.
      </p>

      <div className="mb-4.5 flex flex-wrap gap-2">
        {AI_FEEDBACK_REASONS.map((reason) => {
          const selected = reasons.includes(reason);
          return (
            <button
              key={reason}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(reason)}
              className={`${CHIP_BASE_CLASS} ${
                selected
                  ? 'bg-text-primary text-surface'
                  : 'bg-primary-soft text-text-secondary'
              }`}
            >
              {REASON_LABEL[reason]}
            </button>
          );
        })}
      </div>

      <input
        type="text"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={AI_FEEDBACK_COMMENT_MAX_LENGTH}
        placeholder="더 알려주실 내용이 있다면 적어주세요"
        aria-label="더 알려주실 내용"
        className="border-border2 h-12 w-full rounded-12 border bg-surface px-3.5 text-[15px] text-text-primary placeholder:text-text-muted"
      />

      {/*
        버튼은 보낼 수 있을 때만 나타난다 (프로토타입). 비활성 버튼을 계속 두는
        것보다 "무언가 고르면 보낼 수 있다"가 눈에 더 잘 들어온다.
      */}
      {canSend ? (
        <Button
          className="mt-4.5"
          onClick={() => {
            onSubmit(reasons, comment.trim());
            handleOpenChange(false);
          }}
        >
          의견 보내기
        </Button>
      ) : null}
    </BottomSheet>
  );
}
