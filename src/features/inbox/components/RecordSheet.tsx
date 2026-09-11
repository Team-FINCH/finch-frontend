import { showToast } from '@/shared/hooks/useToastStore';
import { ThesisRecordSheet } from '@/shared/ui/ThesisRecordSheet';

import { useSubmitInboxRecord } from '../api/useSubmitInboxRecord';
import type { InboxItem } from '../model/types';

/**
 * 매수 이유 기록 시트 (프로토타입 `sheetRecord`, ia.md §1 바텀시트 표 — "왜
 * 담으셨나요?"). 알림함의 "기록" 항목(`kind:'record'`)을 누르면 연다.
 *
 * 시트 UI 자체는 `shared/ui/ThesisRecordSheet.tsx` 다 — 위키 탭의 논지 수정
 * 시트(`features/portfolio/components/ThesisEditSheet.tsx`, FINCH-28-ai-entry)와
 * 같은 셸을 쓴다. 여기서는 알림함 항목별 제출(`useSubmitInboxRecord`)만 wiring한다.
 *
 * **저장 API 가 실제로 존재하지 않는다.** `POST /inbox/{itemId}/record` 는 이
 * 티켓이 지어낸 경로다(`../model/types.ts` 머리 주석). 위키 투자 논지 입력은
 * 대화에서만 기록된다는 것이 확정 사실이라(ia.md §1 "AI가 이해한 나" 절) 이 시트가
 * 그 경로로 이어지지 않는다 — 매수 이유가 실제로 어디에 쌓여야 하는지는
 * GitLab 이슈 #26 회신 대기다.
 */
type RecordSheetProps = {
  item: InboxItem | null;
  onOpenChange: (open: boolean) => void;
};

export function RecordSheet({ item, onOpenChange }: RecordSheetProps) {
  const submit = useSubmitInboxRecord();

  function handleOpenChange(next: boolean) {
    if (!next) {
      submit.reset();
    }
    onOpenChange(next);
  }

  return (
    <ThesisRecordSheet
      open={item !== null}
      onOpenChange={handleOpenChange}
      subtitle={item?.stockName ?? null}
      placeholder="이 종목을 담은 이유를 적어 두면 AI가 이 기록을 근거로 더 맞는 추천을 해줘요."
      onSubmit={(text) => {
        if (item === null) {
          return;
        }
        submit.mutate(
          { itemId: item.itemId, body: { reason: text } },
          {
            onSuccess: () => {
              handleOpenChange(false);
              // 새로 적는 자리라 `기록했어요` 다. 고치는 쪽은
              // `features/portfolio/components/ThesisEditSheet.tsx` 가 맡는다.
              showToast('매수 이유를 기록했어요.');
            },
          },
        );
      }}
      isPending={submit.isPending}
      isError={submit.isError}
    />
  );
}
