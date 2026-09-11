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
 * **시트 자체는 `shared/ui/ThesisRecordSheet` 다.** 여기 남는 것은 알림함 사정뿐이다 —
 * 제목을 어디서 가져오는지, `linkedTradeId` 를 어떻게 채우는지, 저장 뒤 어느
 * 쿼리를 무효화하고 어떤 토스트를 띄우는지.
 *
 * 240 이 선택지 넷을 넣을 때는 `shared/ui` 를 다른 티켓이 쥐고 있어 이 파일이 시트를
 * 통째로 다시 그렸고, 그 바람에 같은 것을 저장하는 시트가 둘이 됐다 — 위키 탭에서
 * 여는 쪽에는 선택지가 없었다. 246 에서 그 마크업을 셸로 올려 하나로 합쳤다.
 *
 * **저장은 `POST /ai/wiki/theses` 로 간다**(apiSpec §6.4 · §10.1, contracts C97·C99).
 * 알림함 전용 저장 경로는 없다 — 이전 판이 부르던 `POST /inbox/{itemId}/record` 는
 * 계약이 없던 시절 프론트가 지어낸 경로였고 §6.4 가 "두지 않는다"로 닫았다.
 * 뮤테이션은 `pages/InboxPage.tsx` 가 내려준다(`InboxRecordSubmit` 머리 주석).
 *
 * **여기서는 언제나 신규 기록이다.** 계약이 `record` 항목을 "보유 중이면서 **`active`
 * 논지가 없는** 종목"에만 만들기 때문이다(apiSpec §6.4 "`record` 규칙"). 수정으로
 * 여는 경로는 위키 탭이고 그쪽은 `ThesisEditSheet` 가 논지 유무로 `POST`·`PUT` 을
 * 가른다. 닿지 않을 분기를 여기에 미리 두지 않는다.
 *
 * **`linkedTradeId` 는 문자열이다.** 항목의 `tradeId` 는 숫자(§7.1 `orderId`)라
 * `String()` 으로 바꿔 넣는다 — 숫자로 보내면 AI 쪽 필드와 타입이 어긋난다.
 *
 * **저장 뒤 목록에서 그 항목을 지우지 않는다.** `record` 는 저장된 알림이 아니라
 * 보유 종목과 활성 논지를 대조해 조회 때마다 계산되는 값이라, 논지가 생기면
 * 다음 조회에서 알아서 빠진다(§6.4). 그래서 목록을 재조회하는 것으로 끝낸다 —
 * 화면이 배열에서 항목을 빼면 서버가 세는 것과 화면이 세는 것이 갈린다.
 *
 * **본문 검증은 서버가 한다.** 빈 본문은 저장 버튼이 막고, 500자 초과는 입력에서
 * 막는다. 그 밖의 거절은 AI 의 `400 INVALID_REQUEST` 가 그대로 내려오고
 * (apiSpec §11.2) 그 `message` 를 띄운다.
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

  function handleSubmit(text: string) {
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
  }

  /*
    제목은 서버가 완성해 준 항목 제목(`SK하이닉스, 왜 담으셨나요?`)을 그대로 쓴다.
    프로토타입은 `{종목명}를 왜 담으셨나요?` 로 직접 조립하는데, 그러면 받침에 따라
    `를`·`을` 이 갈려 `SK하이닉스를` 같은 문장이 나온다. 계약도 `title` 을 "서버가
    완성한 문구. 화면이 다시 만들지 않는다" 로 못박았다(§6.4 · §1.3).
  */
  const title = item?.title ?? '왜 담으셨나요?';

  return (
    <ThesisRecordSheet
      open={item !== null}
      onOpenChange={handleOpenChange}
      title={title}
      description="지금 남겨두면 다음 판단에서 다시 볼 수 있어요."
      placeholder="매수 이유를 직접 적어주세요"
      showReasonOptions
      errorMessage={
        isHttpError(submit.error)
          ? submit.error.message
          : '저장하지 못했어요. 다시 시도해 주세요.'
      }
      onSubmit={handleSubmit}
      isPending={submit.isPending}
      isError={submit.isError}
    />
  );
}
