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
  children: ReactNode;
  className?: string;
};

export function BottomSheet({
  open,
  onOpenChange,
  title,
  hideTitle = false,
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
            'fixed inset-x-0 bottom-0 z-50 flex max-h-[80%] w-full flex-col rounded-t-sheet ' +
            'bg-surface px-5 pt-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))] ' +
            'data-[state=open]:animate-[sheet-slide-up_var(--motion-sheet)_var(--ease-standard)] ' +
            className
          }
        >
          <div
            aria-hidden
            className="mx-auto mt-1.5 mb-3.5 h-1 w-10 flex-none rounded-full bg-border-strong"
          />
          <Dialog.Title className={hideTitle ? 'sr-only' : undefined}>
            {title}
          </Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
