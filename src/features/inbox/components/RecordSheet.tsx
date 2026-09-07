import { useState } from 'react';

import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';

import { useSubmitInboxRecord } from '../api/useSubmitInboxRecord';
import type { InboxItem } from '../model/types';

/**
 * 매수 이유 기록 시트 (프로토타입 `sheetRecord`, ia.md §1 바텀시트 표 — "왜
 * 담으셨나요?"). 알림함의 "기록" 항목(`kind:'record'`)을 누르면 연다.
 *
 * **저장 API 가 실제로 존재하지 않는다.** `POST /inbox/{itemId}/record` 는 이
 * 티켓이 지어낸 경로다(`../model/types.ts` 머리 주석). 위키 투자 논지 입력은
 * 대화에서만 기록된다는 것이 확정 사실이라(ia.md §1 "AI가 이해한 나" 절) 이 시트가
 * 그 경로로 이어지지 않는다 — 매수 이유가 실제로 어디에 쌓여야 하는지는
 * GitLab 이슈 #26 회신 대기다.
 */
const REASON_MAX_LENGTH = 500;

type RecordSheetProps = {
  item: InboxItem | null;
  onOpenChange: (open: boolean) => void;
};

export function RecordSheet({ item, onOpenChange }: RecordSheetProps) {
  const [reason, setReason] = useState('');
  const submit = useSubmitInboxRecord();

  const open = item !== null;

  function handleOpenChange(next: boolean) {
    if (!next) {
      setReason('');
      submit.reset();
    }
    onOpenChange(next);
  }

  function handleSubmit() {
    if (item === null || reason.trim() === '') {
      return;
    }
    submit.mutate(
      { itemId: item.itemId, body: { reason: reason.trim() } },
      { onSuccess: () => handleOpenChange(false) },
    );
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="왜 담으셨나요?"
    >
      <div className="flex flex-col gap-4 pb-2">
        {item !== null && item.stockName !== null ? (
          <p className="text-body-2 text-text-secondary">{item.stockName}</p>
        ) : null}
        <textarea
          value={reason}
          onChange={(event) =>
            setReason(event.target.value.slice(0, REASON_MAX_LENGTH))
          }
          placeholder="이 종목을 담은 이유를 적어 두면 나중에 다시 볼 수 있어요."
          rows={5}
          className="w-full resize-none rounded-sm border border-border bg-surface p-3 text-body-2 text-text-primary outline-none placeholder:text-text-muted"
        />
        <p className="text-right text-caption text-text-muted">
          {reason.length}/{REASON_MAX_LENGTH}
        </p>
        {submit.isError ? (
          <p className="text-caption text-danger">
            저장하지 못했어요. 다시 시도해 주세요.
          </p>
        ) : null}
        <Button
          onClick={handleSubmit}
          disabled={reason.trim() === '' || submit.isPending}
        >
          저장
        </Button>
      </div>
    </BottomSheet>
  );
}
