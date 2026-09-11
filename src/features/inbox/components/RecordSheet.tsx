import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { isHttpError } from '@/shared/api';
import { queryKeys } from '@/shared/config/queryKeys';
import { showToast } from '@/shared/hooks/useToastStore';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';

import type { InboxRecordSubmit } from '../model/recordSubmit';
import type { InboxItem } from '../model/types';

/**
 * 매수 이유 기록 시트 (프로토타입 `sheetRecord`, ia.md §1 바텀시트 표 — "왜
 * 담으셨나요?"). 알림함의 "기록" 항목(`kind:'record'`)을 누르면 연다.
 *
 * **빈 칸만 주지 않는다.** 넷 중 하나를 고르기만 해도 기록이 남는다 — 체결 직후
 * 한 손으로 누르는 자리라 글을 쓰라고만 하면 대부분 그냥 닫는다. 직접 적고 싶으면
 * 아래 칸에 쓴다.
 *
 * **시트 셸을 `shared/ui/ThesisRecordSheet` 에서 여기로 내렸다.** 그 셸은 위키 탭의
 * `features/portfolio/components/ThesisEditSheet` 와 함께 쓰는 것이라 선택지를
 * 넣으려면 `shared/` 를 고쳐야 하는데, 지금 티켓 241 이 `shared/ui` 를 쥐고 있어
 * 건드리지 않는다. 그래서 이 시트만 `shared/ui/BottomSheet` 위에 직접 그린다.
 * **위키 탭의 논지 시트는 프로토타입에서 이 시트와 같은 것이다**(`edit` 도
 * `openSheet("record")` 를 부른다) — 241 이 머지되면 이 화면을 다시 `shared` 로
 * 올려 두 곳이 같은 시트를 쓰게 해야 한다. 지금은 알림함 쪽만 프로토타입과 같다.
 *
 * **저장은 `POST /ai/wiki/theses` 로 간다**(apiSpec §6.4 · §10.1, contracts C97·C99).
 * 알림함 전용 저장 경로는 없다 — 이전 판이 부르던 `POST /inbox/{itemId}/record` 는
 * 계약이 없던 시절 프론트가 지어낸 경로였고 §6.4 가 "두지 않는다"로 닫았다.
 * 뮤테이션은 `pages/InboxPage.tsx` 가 내려준다(`InboxRecordSubmit` 머리 주석).
 *
 * **여기서는 언제나 신규 기록이다.** 프로토타입의 이 시트에는 수정 모드
 * (`recordEdit` — 제목 `{종목명} 매수 이유`, 보조 문구 `지금 생각이 달라졌다면
 * 고쳐두세요.`, 버튼 `수정 저장하기`)가 있지만 **알림함에서는 닿지 않는다.**
 * 계약이 `record` 항목을 "보유 중이면서 **`active` 논지가 없는** 종목"에만 만들기
 * 때문이다(apiSpec §6.4 "`record` 규칙"). 수정으로 여는 경로는 위키 탭이고 그쪽은
 * `ThesisEditSheet` 가 이미 논지 유무로 `POST`·`PUT` 을 가른다. 닿지 않을 분기를
 * 여기에 미리 두지 않는다 — 프로토타입에 남아 있던 `i===4`(선택지가 넷인데 다섯째를
 * 보는 분기)가 그렇게 생긴 죽은 코드다.
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

/**
 * 선택지 넷. **모든 종목에 같은 고정 문자열이다** — AI 가 만드는 것도 종목마다
 * 달라지는 것도 아니다. 프로토타입 `recordOptions` 의 `opts` 그대로다.
 */
const RECORD_REASONS = [
  '실적이 좋아질 것 같아서',
  '업종 전망이 좋아 보여서',
  '배당이 괜찮아 보여서',
  '가격이 저평가됐다고 생각해서',
] as const;

/**
 * 고른 선택지를 저장 값으로 바꾼다. **계약이 받는 것은 `text` 1~500자 하나뿐이라
 * (`POST /ai/wiki/theses`, §10.1) 선택지 번호를 따로 보낼 자리가 없다.**
 *
 * 프로토타입은 고른 문구 뒤에 `담았어요.` 를 붙여 한 문장으로 만든다
 * (`saveRecord` — `labels[pick]+" 담았어요."`). 그대로 따른다. 저장된 논지는 위키
 * 탭에 그 문장 그대로 보이는데, `실적이 좋아질 것 같아서` 로 끝나면 말이 끊긴 것으로
 * 읽힌다.
 */
function toThesisText(reason: string): string {
  return `${reason} 담았어요.`;
}

/** 계약의 `text` 상한(§10.1). 넘겨도 서버가 막지만 넘겨 보낼 이유가 없다. */
const REASON_MAX_LENGTH = 500;

type RecordSheetProps = {
  item: InboxItem | null;
  onOpenChange: (open: boolean) => void;
  submit: InboxRecordSubmit;
};

export function RecordSheet({ item, onOpenChange, submit }: RecordSheetProps) {
  const queryClient = useQueryClient();
  /* 고른 것을 번호가 아니라 문구로 들고 있는다. 저장 값이 문구라 번호로 두면
     `RECORD_REASONS[i]` 를 다시 찾아야 하고, 넷이 전부 다른 문구라 잃는 것이 없다. */
  const [pickedReason, setPickedReason] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  /*
    선택지와 직접 입력은 **배타다.** 프로토타입도 그렇다 — 선택지를 누르면
    `recordDraft` 를 비우고, 입력 칸에 포커스가 가거나 글자가 들어오면
    `recordPick` 을 푼다.

    겸용으로 두지 않은 이유는 보낼 자리가 하나이기 때문이다. 계약의 `text` 는 한
    개고, 둘 다 값이 있으면 화면이 말없이 하나를 고르게 된다(프로토타입의
    `saveRecord` 도 그때 직접 입력 쪽을 쓴다). 고른 것과 저장된 것이 다른데 화면에는
    둘 다 켜져 있는 상태가 만들어진다 — 사용자가 알 길이 없다. 배타로 두면 지금
    저장될 것이 화면에 하나만 켜져 있다.
  */
  function pick(reason: string) {
    setPickedReason(reason);
    setDraft('');
  }

  function editDraft(next: string) {
    setDraft(next.slice(0, REASON_MAX_LENGTH));
    setPickedReason(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setPickedReason(null);
      setDraft('');
      submit.reset();
    }
    onOpenChange(next);
  }

  const trimmedDraft = draft.trim();
  const text =
    trimmedDraft !== ''
      ? trimmedDraft
      : pickedReason !== null
        ? toThesisText(pickedReason)
        : null;

  function handleSubmit() {
    /*
      `record` 항목은 `stockCode`·`tradeId` 가 언제나 값을 갖는다(§6.4 필드 표).
      그래도 타입이 `null` 을 허용하므로 없는 경우에는 보내지 않는다 —
      종목 없이 보내면 서버가 어느 종목인지 알 길이 없다(경로에 종목이 없다).
    */
    if (
      text === null ||
      item === null ||
      item.stockCode === null ||
      item.tradeId === null
    ) {
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
    <BottomSheet
      open={item !== null}
      onOpenChange={handleOpenChange}
      title={title}
      hideTitle
    >
      <div className="mb-4">
        {/* 프로토타입 실측 19px / 700 / -.015em. 타이포 토큰에 이 조합이 없다 —
            `--text-section-title`(18px/700)과 1px 다르다. */}
        <p className="text-[19px] leading-[26px] font-bold tracking-[-0.015em] text-text-primary">
          {title}
        </p>
        <p className="mt-1.75 text-body-2 text-text-secondary">
          지금 남겨두면 다음 판단에서 다시 볼 수 있어요.
        </p>
      </div>

      {/* 안쪽 스크롤은 시트 셸이 아니라 내용이 연다(`BottomSheet` 머리 주석).
          좌우 -2px/+2px 는 선택지 버튼의 포커스 링이 잘리지 않게 하는 자리다. */}
      <div className="-mx-0.5 min-h-0 flex-1 overflow-y-auto px-0.5">
        {RECORD_REASONS.map((reason) => {
          const selected = pickedReason === reason;
          return (
            <button
              key={reason}
              type="button"
              aria-pressed={selected}
              onClick={() => pick(reason)}
              /* 반경 11px 은 프로토타입 실측이다. --radius-sm(10px)과
                 --radius-12(12px) 사이라 계단에 자리가 없다. */
              className={`flex min-h-[50px] w-full items-center gap-[11px] rounded-[11px] px-3 text-left ${
                selected ? 'bg-surface-soft' : 'bg-transparent'
              }`}
            >
              <span
                className={`flex size-[19px] flex-none items-center justify-center rounded-full border-[1.5px] ${
                  selected ? 'border-text-primary' : 'border-border-strong'
                }`}
              >
                {selected && (
                  <span className="size-[9px] rounded-full bg-text-primary" />
                )}
              </span>
              <span className="min-w-0 flex-1 text-body-2 text-text-primary">
                {reason}
              </span>
            </button>
          );
        })}

        <textarea
          value={draft}
          onChange={(event) => editDraft(event.target.value)}
          /* 포커스만으로 선택을 푼다. 글자를 지우고 다시 고르는 동안 선택지와
             입력 칸이 함께 켜져 보이는 순간이 없다. */
          onFocus={() => setPickedReason(null)}
          placeholder="매수 이유를 직접 적어주세요"
          rows={2}
          aria-label="매수 이유 직접 입력"
          className={`mt-1.5 min-h-[60px] w-full resize-none rounded-12 border bg-surface p-3.5 text-body-2 text-text-primary outline-none placeholder:text-text-muted ${
            trimmedDraft !== '' ? 'border-text-primary' : 'border-border'
          }`}
        />
      </div>

      <div className="flex-none pt-4">
        {submit.isError && (
          <p className="mb-2 text-caption text-danger">
            {isHttpError(submit.error)
              ? submit.error.message
              : '저장하지 못했어요. 다시 시도해 주세요.'}
          </p>
        )}
        <Button
          onClick={handleSubmit}
          disabled={text === null || submit.isPending}
        >
          매수 이유 저장하기
        </Button>
      </div>
    </BottomSheet>
  );
}
