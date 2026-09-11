import { isHttpError } from '@/shared/api';
import { showToast } from '@/shared/hooks/useToastStore';
import { type WikiThesis } from '@/shared/types/ai/wiki';
import { type StockCode } from '@/shared/types/primitives';
import { ThesisRecordSheet } from '@/shared/ui/ThesisRecordSheet';

import { useCreateWikiThesis } from '../api/useCreateWikiThesis';
import { useUpdateWikiThesis } from '../api/useUpdateWikiThesis';

/**
 * 위키 탭의 매수 이유 시트 (FINCH-28-ai-entry · FINCH-238-wiki-create).
 *
 * **신규와 수정이 같은 시트다.** 사용자에게는 둘 다 "이 종목을 왜 담았는지 적는
 * 자리"라 화면을 나눌 이유가 없다 — 이슈 #42 에서 "위키 화면 안에서 신규 기록·수정·
 * 사실 삭제가 모두 일어난다"로 정해진 범위를 그대로 따른다. 두 곳에서 연다 —
 *
 * - "종목별 매수 이유"의 종목 행 → 기존 논지를 고친다(`target.thesis`)
 * - "아직 적지 않은 종목"의 행 → 처음 적는다(`target.stockCode`만 있다)
 *
 * **그런데 저장 경로는 갈라야 한다.** `PUT /wiki/theses/{stockCode}` 는 upsert 가
 * 아니라 활성 논지가 없으면 `InvalidRequest` 다. 그래서 논지가 있으면 `PUT`,
 * 없으면 `POST /wiki/theses`(contracts C97, 2026-09-11 개설)를 부른다. 갈리는
 * 지점은 이 파일 하나이고 시트 셸·문구·토스트는 공유한다. 자세한 계약은
 * `../api/postWikiThesis.ts` 머리 주석을 본다.
 *
 * 시트 셸은 `shared/ui/ThesisRecordSheet.tsx` 다 — 알림함의 `RecordSheet`와 같은
 * 컴포넌트다. `features/inbox`를 직접 import 하는 대신 셸을 `shared/ui`로 올린
 * 이유는 그 파일 머리 주석에 적었다(feature 간 import 금지,
 * `import-x/no-restricted-paths`).
 *
 * **신규 기록에서는 매수 이유 선택지 넷을 함께 보인다**(FINCH-246). 알림함에서
 * 열든 "아직 적지 않은 종목"에서 열든 저장되는 것은 같은 `POST /ai/wiki/theses` 의
 * `text` 한 줄이라, 들어온 문이 다르다고 시트가 달라질 이유가 없다.
 * **수정에서는 끈다** — 이미 적어 둔 글이 채워져 열리는데 선택지를 고르면 그 글이
 * 지워진다(선택지와 직접 입력은 배타다). 고치러 온 자리에서 기대하는 동작이 아니다.
 *
 * **본문 검증은 서버가 한다.** 길이·필수 검사를 여기서 다시 만들지 않고 AI 의
 * `400 INVALID_REQUEST` `message`를 그대로 띄운다(apiSpec §11.2). 빈 입력으로
 * 저장 버튼이 눌리지 않게 막는 것은 셸이 이미 하고 있고, 그건 검증이 아니라 버튼
 * 상태다.
 *
 * **알림함 항목을 "처리됨"으로 바꾸는 것과는 별개다.** 여기서는 위키 저장만 하고,
 * 알림함 쪽 읽음·처리 표시는 알림함 계약(미확정 P31)의 몫이라 건드리지 않는다.
 *
 * 호출부(`WikiTab.tsx`)가 `key`로 대상이 바뀔 때마다 새로 마운트해야 한다 —
 * `ThesisRecordSheet`가 `initialText`를 마운트 시점에만 읽으므로, 다른 대상을 열 때
 * 새로 마운트되지 않으면 이전 텍스트가 남는다.
 */

/**
 * 시트가 여는 대상. 기존 논지를 고치거나(`thesis`) 종목만 알고 처음 적거나
 * (`stockCode`) 둘 중 하나다. `null`이면 시트가 닫혀 있다.
 */
export type ThesisSheetTarget =
  | { thesis: WikiThesis; stockCode?: undefined; stockName?: undefined }
  | { thesis?: undefined; stockCode: StockCode; stockName: string };

type ThesisEditSheetProps = {
  target: ThesisSheetTarget | null;
  onOpenChange: (open: boolean) => void;
};

export function ThesisEditSheet({
  target,
  onOpenChange,
}: ThesisEditSheetProps) {
  const createThesis = useCreateWikiThesis();
  const updateThesis = useUpdateWikiThesis();

  const thesis = target?.thesis ?? null;
  const mutation = thesis === null ? createThesis : updateThesis;

  function handleOpenChange(next: boolean) {
    if (!next) {
      createThesis.reset();
      updateThesis.reset();
    }
    onOpenChange(next);
  }

  function handleSubmit(text: string) {
    if (target === null) {
      return;
    }

    // 저장 뒤 문구도 갈린다 — 처음 적는 자리는 `기록했어요`, 고치는 자리는 `수정했어요`.
    function onSuccess(message: string) {
      handleOpenChange(false);
      showToast(message);
    }

    if (target.thesis === undefined) {
      createThesis.mutate(
        { stockCode: target.stockCode, text },
        { onSuccess: () => onSuccess('매수 이유를 기록했어요.') },
      );
      return;
    }

    updateThesis.mutate(
      {
        stockCode: target.thesis.ticker,
        text,
        /*
          이미 이 논지에 붙어 있던 값만 그대로 넘긴다 — 모르는 값을 지어내
          채우지 않는다(ia.md §1 "편집·삭제 동작"). 신규 기록 쪽은 넘길 값
          자체가 없어 아예 보내지 않는다.
        */
        horizon: target.thesis.horizon ?? undefined,
        linkedTradeId: target.thesis.linkedTradeId ?? undefined,
      },
      { onSuccess: () => onSuccess('매수 이유를 수정했어요.') },
    );
  }

  const isNew = thesis === null;

  return (
    <ThesisRecordSheet
      open={target !== null}
      onOpenChange={handleOpenChange}
      title={isNew ? '왜 담으셨나요?' : '기록 수정하기'}
      subtitle={thesis?.name ?? target?.stockName ?? null}
      /*
        신규는 알림함과 같은 문구를 쓴다 — 같은 시트이므로 안내도 같아야 한다.
        수정은 프로토타입 `recordSub` 의 수정 문구다.
      */
      description={
        isNew
          ? '지금 남겨두면 다음 판단에서 다시 볼 수 있어요.'
          : '지금 생각이 달라졌다면 고쳐두세요.'
      }
      placeholder={
        isNew
          ? '매수 이유를 직접 적어주세요'
          : '이 종목을 담은 이유를 적어 두면 AI가 이 기록을 근거로 더 맞는 추천을 해줘요.'
      }
      showReasonOptions={isNew}
      submitLabel={isNew ? '매수 이유 저장하기' : '수정 저장하기'}
      initialText={thesis?.text ?? ''}
      /*
        서버가 왜 거절했는지를 그대로 보여준다. 500자 초과·빈 본문이 여기로 온다
        (apiSpec §11.2). 네트워크 실패처럼 `message`가 없는 실패는 셸의 기본 문구로
        떨어진다.
      */
      errorMessage={
        isHttpError(mutation.error) ? mutation.error.message : undefined
      }
      onSubmit={handleSubmit}
      isPending={mutation.isPending}
      isError={mutation.isError}
    />
  );
}
