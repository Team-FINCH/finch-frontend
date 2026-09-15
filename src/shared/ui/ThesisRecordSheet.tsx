import { useState } from 'react';

import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';

/**
 * 매수 이유를 적는 바텀시트 (프로토타입 `sheetRecord`, ia.md §1 바텀시트 표 —
 * "왜 담으셨나요?"). **API 를 모른다** — 저장 동작은 `onSubmit`으로 호출부가 정한다.
 *
 * 세 곳이 이 시트를 쓴다. 셋이 저장하는 것은 전부 같다 —
 * `POST`·`PUT /ai/wiki/theses` 의 `text` 한 줄이다.
 *
 * - `features/inbox/components/RecordSheet.tsx` — 알림함 "기록" 항목
 * - `features/portfolio/components/ThesisEditSheet.tsx` — 위키 탭 "아직 적지 않은
 *   종목"(신규)과 "종목별 매수 이유"(수정)
 *
 * `features/portfolio` 가 `features/inbox` 를 직접 import 하면
 * `import-x/no-restricted-paths`(컨벤션 §2, feature 끼리 import 금지)에 막힌다 —
 * 그래서 이 셸이 `shared/ui` 에 있다. 두 기능이 각자 API 훅을 갖고 이 셸에는
 * 텍스트·제출 콜백만 내려준다.
 *
 * ## 선택지 넷이 여기로 올라왔다 (FINCH-246)
 *
 * 티켓 240 이 알림함 시트에 매수 이유 선택지 넷을 넣을 때, 그때 `shared/ui` 를
 * 다른 티켓이 쥐고 있어 **알림함 안에 시트를 통째로 다시 그렸다.** 그 결과 같은
 * 것을 저장하는 시트가 둘이 됐다 — 알림함에서 열면 선택지가 있고 위키 탭에서 열면
 * 빈 칸만 있었다. 240 의 시트를 이 셸로 끌어올려 하나로 합쳤다.
 *
 * **빈 칸만 주지 않는 이유** (240 이 적은 것) — 넷 중 하나를 고르기만 해도 기록이
 * 남는다. 체결 직후 한 손으로 누르는 자리라 글을 쓰라고만 하면 대부분 그냥 닫는다.
 *
 * **글자 수 표시(`0/500`)는 뺐다.** 프로토타입에도 240 의 시트에도 없다. 상한은
 * 입력에서 잘라 지키고, 그 밖의 거절 사유는 서버 `message` 를 그대로 띄운다.
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

type ThesisRecordSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 시트 머리 제목. Radix 접근성 이름표이기도 하다(`BottomSheet.title`). */
  title?: string;
  /** 어느 종목인지 보여주는 보조 줄(예: 종목명). 제목이 이미 종목을 말하면 넘기지 않는다. */
  subtitle?: string | null;
  /** 제목 아래 안내 한 줄. 없으면 렌더하지 않는다. */
  description?: string | null;
  placeholder: string;
  /**
   * 선택지 넷을 보일지. **이미 적어 둔 글을 고치는 자리에서는 끈다** — 고르는 순간
   * 고치던 글이 지워지는데(선택지와 직접 입력은 배타다) 그 자리에 온 사용자가
   * 기대하는 동작이 아니다.
   */
  showReasonOptions?: boolean;
  /** 이미 있는 논지를 고치는 경우에만 넘긴다. 기본은 빈 텍스트(새로 적기). */
  initialText?: string;
  submitLabel?: string;
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
  description = null,
  placeholder,
  showReasonOptions = false,
  initialText = '',
  submitLabel = '매수 이유 저장하기',
  errorMessage = '저장하지 못했어요. 다시 시도해 주세요.',
  onSubmit,
  isPending,
  isError,
}: ThesisRecordSheetProps) {
  /* 고른 것을 번호가 아니라 문구로 들고 있는다. 저장 값이 문구라 번호로 두면
     `RECORD_REASONS[i]` 를 다시 찾아야 하고, 넷이 전부 다른 문구라 잃는 것이 없다. */
  const [pickedReason, setPickedReason] = useState<string | null>(null);
  /*
    **제어 컴포넌트가 아니다.** `initialText` 는 마운트할 때와 시트가 닫힐 때만
    읽는다(아래 `useEffect`) — 열려 있는 동안 바뀌어도 적고 있던 글을 덮지 않는다.
  */
  const [draft, setDraft] = useState(initialText);

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

  /*
    닫히면 고른 것과 적던 것을 비운다.

    **`onOpenChange` 핸들러 안에서 비우지 않는 이유** — 저장에 성공했을 때는 호출부가
    자기 상태(`item`·`target`)를 비워서 닫으므로 이 컴포넌트의 핸들러를 지나지
    않는다. 그때 비우지 않으면 다음에 연 시트에 지난번에 적던 글이 남는다.

    **`useEffect` 가 아니라 렌더 중에 비우는 이유** — 리액트가 권하는 "prop 이 바뀔
    때 상태를 맞추는" 방식이다(react.dev "You Might Not Need an Effect"). 효과로
    두면 한 번 더 그려진 뒤에 비워지고, `react-hooks/set-state-in-effect` 가 막는다.
  */
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) {
      setPickedReason(null);
      setDraft(initialText);
    }
  }

  const trimmedDraft = draft.trim();
  const text =
    trimmedDraft !== ''
      ? trimmedDraft
      : pickedReason !== null
        ? toThesisText(pickedReason)
        : null;

  function handleSubmit() {
    if (text === null) {
      return;
    }
    onSubmit(text);
  }

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      hideTitle
    >
      <div className="mb-4">
        {/* 프로토타입 실측 19px / 700 / -.015em. 타이포 토큰에 이 조합이 없다 —
            `--text-section-title`(18px/700)과 1px 다르다. */}
        <p className="text-[19px] leading-[26px] font-bold tracking-[-0.015em] text-text-primary">
          {title}
        </p>
        {subtitle !== null && (
          <p className="mt-1.75 text-body-2 text-text-secondary">{subtitle}</p>
        )}
        {description !== null && (
          <p className="mt-1.75 text-body-2 text-text-secondary">
            {description}
          </p>
        )}
      </div>

      {/* 안쪽 스크롤은 시트 셸이 아니라 내용이 연다(`BottomSheet` 머리 주석).
          좌우 -2px/+2px 는 선택지 버튼의 포커스 링이 잘리지 않게 하는 자리다. */}
      <div className="scroll-touch -mx-0.5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-0.5">
        {showReasonOptions &&
          RECORD_REASONS.map((reason) => {
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
          placeholder={placeholder}
          rows={showReasonOptions ? 2 : 5}
          aria-label="매수 이유 직접 입력"
          className={`mt-1.5 min-h-[60px] w-full resize-none rounded-12 border bg-surface p-3.5 text-body-2 text-text-primary outline-none placeholder:text-text-muted ${
            trimmedDraft !== '' ? 'border-text-primary' : 'border-border'
          }`}
        />
      </div>

      <div className="flex-none pt-4">
        {isError && (
          <p className="mb-2 text-caption text-danger">{errorMessage}</p>
        )}
        <Button onClick={handleSubmit} disabled={text === null || isPending}>
          {submitLabel}
        </Button>
      </div>
    </BottomSheet>
  );
}
