import * as Dialog from '@radix-ui/react-dialog';
import { type ReactNode, useEffect } from 'react';

import { useSheetOverlayStore } from '@/shared/hooks/useSheetOverlayStore';

/**
 * 바텀시트 (FINCH-28). `@radix-ui/react-dialog` 위에 프로토타입
 * `.scrim`·`.sheet`·`.handle` 스타일을 씌운 것이다.
 *
 * 포커스 트랩·스크롤 잠금·ESC 닫기·오버레이 클릭 닫기는 Radix `Dialog`가 이미
 * 한다 — 여기서 다시 구현하지 않는다.
 *
 * 실측값 (프로토타입 c78163c 시점) —
 * 스크림 `rgba(23,29,38,.4)` · 시트 반경 `24px 24px 0 0`(`--radius-sheet`) ·
 * 안쪽 여백 `8px 20px 24px` · `max-height:80%` · 핸들 `40x4 #D9DEE5`
 * (`--color-border-strong`). 여닫힘 애니메이션(`up`·`fade`)은
 * `styles/index.css`의 `sheet-slide-up`·`sheet-scrim-fade-in`으로 옮겨 뒀다.
 * 프로토타입에 닫힘 애니메이션이 없어 열림만 정의했다 — Radix 는 별도 닫힘
 * 애니메이션을 못 찾으면 바로 언마운트한다.
 *
 * 안쪽 스크롤은 이 컴포넌트가 강제하지 않는다. 프로토타입도 시트 셸 자체에는
 * `overflow-y`가 없고, 내용이 긴 시트(기록·인사이트)만 자기 안에
 * `flex:1;overflow-y:auto` 래퍼를 따로 둔다 — 짧은 시트(약관)까지 스크롤 영역을
 * 두면 스크롤바가 없는데 영역만 생기는 것과 같다. 필요한 화면이 `children` 안에서
 * 직접 연다.
 *
 * **열림/닫힘을 `useSheetOverlayStore`에 스스로 알린다.** `TabBar`·
 * `AiFloatingOverlay`가 "지금 열린 시트가 있나"를 판정하는 근거다. 이 컴포넌트를
 * 쓰는 화면이 그 스토어를 직접 건드릴 필요가 없다 — 잊으면 탭바가 시트 위에
 * 남는 종류의 버그라 컴포넌트가 책임진다.
 */
type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * 접근성 상 필수(Radix 가 `aria-labelledby`로 연결한다). 본문에 이미 같은
   * 제목이 시각적으로 보이면 `hideTitle`로 화면에서만 숨긴다.
   */
  title: string;
  hideTitle?: boolean;
  /**
   * 보이는 제목의 꾸밈 (FINCH-341). **기본값이 있다** — `Modal` 쪽은 값을
   * 안 넘기면 아무 꾸밈도 없는데, 시트는 반대로 두었다.
   *
   * 그 전에는 `Dialog.Title` 이 클래스 없이 나갔다. Tailwind preflight 가 `h2` 의
   * 크기·굵기·여백을 전부 지우므로 **제목이 본문과 같은 글자였고 아래 첫 문단에
   * 붙어 있었다.** 시트 다섯 곳이 전부 그랬다(`hideTitle` 인 주문 결과 시트만
   * 예외). 한 곳씩 클래스를 넘기게 두면 다섯이 조금씩 다른 제목을 갖게 된다.
   *
   * `hideTitle` 이 켜져 있으면 무시된다.
   */
  titleClassName?: string;
  children: ReactNode;
  className?: string;
};

/**
 * 시트 제목의 기본 꾸밈. **프로토타입에도 design.md 에도 시트 제목 치수가 없어서**
 * 있는 토큰에서 끌어왔다 — `--text-section-title`(18px/700)은 화면 제목·섹션 제목이
 * 쓰는 계단이고, 시트는 화면 하나를 덮는 면이라 그 자리에 든다. 새 값을 만들지 않았다.
 *
 * 모달 제목(22~28px)보다 한 단 아래다. 모달은 흐름을 끊고 말을 거는 자리라 제목이
 * 크고, 시트는 보던 화면 위에 얹히는 자리다.
 *
 * 아래 12px 은 제목과 첫 문단을 가르는 최소값이다. 시트 다섯 곳의 본문이 전부
 * 위 여백 없이 시작하므로 이 여백이 없으면 두 줄이 붙는다.
 */
const DEFAULT_TITLE_CLASS = 'mb-3 text-section-title text-text-primary';

export function BottomSheet({
  open,
  onOpenChange,
  title,
  hideTitle = false,
  titleClassName = DEFAULT_TITLE_CLASS,
  children,
  className = '',
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const { increment, decrement } = useSheetOverlayStore.getState();
    increment();
    return decrement;
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(23,29,38,0.4)] data-[state=open]:animate-[sheet-scrim-fade-in_200ms_var(--ease-standard)]" />
        <Dialog.Content
          aria-describedby={undefined}
          className={
            // 가로 폭은 ActionBar·TabBar 와 같은 max-w-md 다 (ActionBar 주석 참고).
            'fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[80%] w-full max-w-md flex-col rounded-t-sheet ' +
            'bg-surface px-5 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))] ' +
            'data-[state=open]:animate-[sheet-slide-up_var(--motion-sheet)_var(--ease-standard)] ' +
            className
          }
        >
          <div
            aria-hidden
            className="mx-auto mt-1.5 mb-3.5 h-1 w-10 flex-none rounded-full bg-border-strong"
          />
          <Dialog.Title
            className={hideTitle ? 'sr-only' : `flex-none ${titleClassName}`}
          >
            {title}
          </Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
