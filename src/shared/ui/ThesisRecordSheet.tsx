import { useState } from 'react';

import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';

/**
 * 매수 이유를 적는 바텀시트 셸 (프로토타입 `sheetRecord`, ia.md §1 바텀시트 표 —
 * "왜 담으셨나요?"). **API 를 모른다** — 저장 동작은 `onSubmit`으로 호출부가
 * 정한다. 두 호출부가 이 셸을 함께 쓴다 —
 *
 * - `features/inbox/components/RecordSheet.tsx` — 알림함 "기록" 항목. 새 이유를
 *   적는다(빈 텍스트로 연다).
 * - `features/portfolio/components/ThesisEditSheet.tsx` — 위키 탭 "종목별 매수
 *   이유"의 종목 행. **이미 있는 논지를 고친다**(`initialText`로 채워 연다).
 *
 * `features/portfolio` 가 `features/inbox` 를 직접 import 하면
 * `import-x/no-restricted-paths`(컨벤션 §2, feature 끼리 import 금지)에 막힌다 —
 * 그래서 이 셸을 `shared/ui` 로 올렸다(FINCH-28-ai-entry 감독관 승인,
 * 보고 항목 5번 참고). 두 기능이 각자 API 훅을 갖고 이 셸에는 텍스트·제출
 * 콜백만 내려준다.
 *
 * **다시 열 때마다 새 값으로 채우려면 호출부가 `key`를 바꿔야 한다** — 이
 * 컴포넌트는 `initialText`를 마운트 시점에만 로컬 상태로 읽는다(제어 컴포넌트가
 * 아니다). 알림함 쪽은 매번 다른 항목이라도 항상 빈 텍스트로 열어 문제가 안
 * 되지만, 위키 편집 쪽은 논지마다 다른 기존 텍스트를 보여줘야 하므로
 * `ThesisEditSheet`가 `key={thesis?.id}`로 논지가 바뀔 때 새로 마운트되게 한다.
 */
const REASON_MAX_LENGTH = 500;

type ThesisRecordSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Radix 접근성 이름표(`BottomSheet.title`). 기본은 프로토타입 시트 제목. */
  title?: string;
  /** 어느 종목인지 보여주는 보조 줄(예: 종목명). 없으면 렌더하지 않는다. */
  subtitle?: string | null;
  placeholder: string;
  /** 이미 있는 논지를 고치는 경우에만 넘긴다. 기본은 빈 텍스트(새로 적기). */
  initialText?: string;
  errorMessage?: string;
  onSubmit: (text: string) => void;
  isPending: boolean;
  isError: boolean;
};

export function ThesisRecordSheet({
  open,
  onOpenChange,
  title = '왜 담으셨나요?',
  subtitle = null,
  placeholder,
  initialText = '',
  errorMessage = '저장하지 못했어요. 다시 시도해 주세요.',
  onSubmit,
  isPending,
  isError,
}: ThesisRecordSheetProps) {
  const [reason, setReason] = useState(initialText);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setReason(initialText);
    }
    onOpenChange(next);
  }

  function handleSubmit() {
    const trimmed = reason.trim();
    if (trimmed === '') {
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <BottomSheet open={open} onOpenChange={handleOpenChange} title={title}>
      <div className="flex flex-col gap-4 pb-2">
        {subtitle !== null && (
          <p className="text-body-2 text-text-secondary">{subtitle}</p>
        )}
        <textarea
          value={reason}
          onChange={(event) =>
            setReason(event.target.value.slice(0, REASON_MAX_LENGTH))
          }
          placeholder={placeholder}
          rows={5}
          className="w-full resize-none rounded-sm border border-border bg-surface p-3 text-body-2 text-text-primary outline-none placeholder:text-text-muted"
        />
        <p className="text-right text-caption text-text-muted">
          {reason.length}/{REASON_MAX_LENGTH}
        </p>
        {isError && <p className="text-caption text-danger">{errorMessage}</p>}
        <Button
          onClick={handleSubmit}
          disabled={reason.trim() === '' || isPending}
        >
          저장
        </Button>
      </div>
    </BottomSheet>
  );
}
