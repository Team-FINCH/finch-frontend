import { useQueryClient } from '@tanstack/react-query';

import { isHttpError } from '@/shared/api';
import { queryKeys } from '@/shared/config/queryKeys';
import { showToast } from '@/shared/hooks/useToastStore';
import { ThesisRecordSheet } from '@/shared/ui/ThesisRecordSheet';

import type { InboxRecordSubmit } from '../model/recordSubmit';
import type { InboxItem } from '../model/types';

/**
 * 매수 이유 기록 시트 (프로토타입 `sheetRecord`, ia.md §1 바텀시트 표 — "왜
 * 담으셨나요?"). 알림함의 "기록" 항목(`kind:'record'`)을 누르면 연다.
 *
 * 시트 UI 자체는 `shared/ui/ThesisRecordSheet.tsx` 다 — 위키 탭의 논지 시트
 * (`features/portfolio/components/ThesisEditSheet.tsx`)와 같은 셸을 쓴다.
 *
 * **저장은 `POST /ai/wiki/theses` 로 간다**(apiSpec §6.4 · §10.1, contracts C97·C99).
 * 알림함 전용 저장 경로는 없다 — 이전 판이 부르던 `POST /inbox/{itemId}/record` 는
 * 계약이 없던 시절 프론트가 지어낸 경로였고 §6.4 가 "두지 않는다"로 닫았다.
 * 뮤테이션은 `pages/InboxPage.tsx` 가 내려준다(`InboxRecordSubmit` 머리 주석).
 *
 * **`linkedTradeId` 는 문자열이다.** 항목의 `tradeId` 는 숫자(§7.1 `orderId`)라
 * `String()` 으로 바꿔 넣는다 — 숫자로 보내면 AI 쪽 필드와 타입이 어긋난다.
 *
 * **저장 뒤 목록에서 그 항목을 지우지 않는다.** `record` 는 저장된 알림이 아니라
 * 보유 종목과 활성 논지를 대조해 조회 때마다 계산되는 값이라, 논지가 생기면
 * 다음 조회에서 알아서 빠진다(§6.4). 그래서 목록을 재조회하는 것으로 끝낸다 —
 * 화면이 배열에서 항목을 빼면 서버가 세는 것과 화면이 세는 것이 갈린다.
 *
 * **본문 검증은 서버가 한다.** 500자 초과·빈 본문은 AI 의 `400 INVALID_REQUEST`
 * 가 그대로 내려오고(apiSpec §11.2) 그 `message` 를 띄운다.
 */
type RecordSheetProps = {
  item: InboxItem | null;
  onOpenChange: (open: boolean) => void;
  submit: InboxRecordSubmit;
};

export function RecordSheet({ item, onOpenChange, submit }: RecordSheetProps) {
  const queryClient = useQueryClient();

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
      errorMessage={
        isHttpError(submit.error) ? submit.error.message : undefined
      }
      onSubmit={(text) => {
        /*
          `record` 항목은 `stockCode`·`tradeId` 가 언제나 값을 갖는다(§6.4 필드 표).
          그래도 타입이 `null` 을 허용하므로 없는 경우에는 보내지 않는다 —
          종목 없이 보내면 서버가 어느 종목인지 알 길이 없다(경로에 종목이 없다).
        */
        if (item === null || item.stockCode === null || item.tradeId === null) {
          return;
        }
        submit.mutate(
          {
            stockCode: item.stockCode,
            text,
            linkedTradeId: String(item.tradeId),
          },
          {
            onSuccess: () => {
              handleOpenChange(false);
              void queryClient.invalidateQueries({
                queryKey: queryKeys.inbox.list(),
              });
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
