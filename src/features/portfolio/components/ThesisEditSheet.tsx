import { type WikiThesis } from '@/shared/types/ai/wiki';
import { ThesisRecordSheet } from '@/shared/ui/ThesisRecordSheet';

import { useUpdateWikiThesis } from '../api/useUpdateWikiThesis';

/**
 * 위키 탭 "종목별 매수 이유"의 논지 수정 시트 (FINCH-28-ai-entry).
 *
 * **사용자 결정("나" 방식)** — 그 섹션은 종목이 이미 정해져 있으므로(각 행이
 * 자기 `WikiThesis.ticker`를 이미 안다) 알림함을 거칠 이유가 없다. 종목 행을
 * 누르면 바로 이 시트가 열려 그 종목의 기록을 고친다. 알림함 경로(`RecordSheet`,
 * `/inbox`)는 그대로 둔다 — 지우지 않는다.
 *
 * 시트 셸은 `shared/ui/ThesisRecordSheet.tsx` 를 그대로 쓴다 — 알림함의
 * `RecordSheet`와 같은 컴포넌트다. `features/inbox`를 직접 import 하는 대신
 * 셸을 `shared/ui`로 올린 이유는 그 파일 머리 주석에 적었다(feature 간 import
 * 금지, `import-x/no-restricted-paths`).
 *
 * **저장 경로는 새 API 가 아니라 이미 있는 계약이다** — `PUT
 * /api/v1/ai/wiki/theses/{stockCode}`(contracts C80), 본문은 camelCase
 * `ThesisIn`(C75) 그대로 `useUpdateWikiThesis`/`putWikiThesis.ts`가 쓴다.
 * `linkedTradeId`는 이 논지에 이미 연결돼 있던 값(`thesis.linkedTradeId`)을
 * 그대로 넘긴다 — 모르는 값을 지어내 채우지 않는다.
 *
 * **알림함 항목을 "처리됨"으로 바꾸는 것과는 별개다.** 여기서는 위키 저장만
 * 하고, 알림함 쪽 읽음·처리 표시는 알림함 계약(미확정)의 몫이라 건드리지 않는다.
 *
 * 호출부(`WikiTab.tsx`)가 `key={thesis?.id ?? 'none'}`로 이 컴포넌트를 렌더해야
 * 한다 — `ThesisRecordSheet`가 `initialText`를 마운트 시점에만 읽으므로, 다른
 * 논지를 열 때 새로 마운트되지 않으면 이전 텍스트가 남는다.
 */
type ThesisEditSheetProps = {
  thesis: WikiThesis | null;
  onOpenChange: (open: boolean) => void;
};

export function ThesisEditSheet({
  thesis,
  onOpenChange,
}: ThesisEditSheetProps) {
  const updateThesis = useUpdateWikiThesis();

  function handleOpenChange(next: boolean) {
    if (!next) {
      updateThesis.reset();
    }
    onOpenChange(next);
  }

  return (
    <ThesisRecordSheet
      open={thesis !== null}
      onOpenChange={handleOpenChange}
      title="기록 수정하기"
      subtitle={thesis?.ticker ?? null}
      placeholder="이 종목을 담은 이유를 적어 두면 AI가 이 기록을 근거로 더 맞는 추천을 해줘요."
      initialText={thesis?.text ?? ''}
      onSubmit={(text) => {
        if (thesis === null) {
          return;
        }
        updateThesis.mutate(
          {
            stockCode: thesis.ticker,
            text,
            horizon: thesis.horizon ?? undefined,
            linkedTradeId: thesis.linkedTradeId ?? undefined,
          },
          { onSuccess: () => handleOpenChange(false) },
        );
      }}
      isPending={updateThesis.isPending}
      isError={updateThesis.isError}
    />
  );
}
