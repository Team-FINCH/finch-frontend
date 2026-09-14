import * as Dialog from '@radix-ui/react-dialog';
import { type ReactNode, useEffect } from 'react';

import { useSheetOverlayStore } from '@/shared/hooks/useSheetOverlayStore';

/**
 * 화면 가운데 뜨는 모달 (FINCH-262).
 *
 * `BottomSheet` 와 **같은 Radix `Dialog` 위에 얹은 형제**다. 포커스 트랩 · 스크롤
 * 잠금 · ESC 닫기 · 오버레이 클릭 닫기는 Radix 가 하고, 우리가 정하는 것은 위치와
 * 모양뿐이다. 스크림 색과 페이드도 시트와 같은 값을 쓴다 — 같은 층에 뜨는 것이
 * 화면마다 다른 어둠으로 깔리면 안 된다.
 *
 * ## 언제 이것을 쓰고 언제 시트를 쓰나
 *
 * **기본은 `BottomSheet` 다.** 프로토타입의 오버레이가 전부 시트이고(`.scrim` 이
 * `align-items:flex-end` 로 못박혀 있다) 모바일에서 엄지가 닿는 자리도 아래다.
 * 선택지를 고르거나 무언가를 입력하는 흐름은 전부 시트로 간다.
 *
 * 이것은 **읽고 닫는 짧은 안내** 자리다. 흐름을 잇는 것이 아니라 한 번 끊고
 * 말을 거는 것이라, 화면 아래에 붙는 것보다 가운데 떠 있는 편이 맞다.
 *
 * ## 치수는 우리가 정했다
 *
 * **프로토타입에도 design.md 에도 근거가 없다.** design.md 는 §11 에서
 * "Bottom Sheet / Modal 활성 시 숨김" 으로 Modal 을 이름만 알고 치수를 적지
 * 않았고, 프로토타입에는 가운데 팝업이 나오는 화면 자체가 없다. 그래서 있는
 * 토큰에서 끌어왔다 — 새 값을 만들지 않았다.
 *
 * - 반경 `--radius-card`(12px) — 이 모달은 결국 **스크림 위에 뜬 카드**다.
 *   `--radius-sheet`(24px)는 바닥에 붙는 시트가 위 두 모서리만 굴리는 값이라
 *   네 모서리에 다 주면 알약처럼 보인다
 * - 그림자 `--shadow-float` — 토큰 주석이 "floating button · bottom sheet ·
 *   sticky layer 에만" 이라고 적어 둔 그 떠 있는 층이다
 * - 폭은 좌우 20px 을 남기고 최대 328px. 기준 뷰포트 375px 에서 335px, 최소 지원
 *   320px 에서 280px 이다
 * - 높이는 `max-h` 로 묶고 안쪽이 구른다. 시트와 달리 위아래로 잘릴 수 있어서
 *   컨테이너가 스크롤을 맡는다
 *
 * ## 탭바·AI 버튼에 스스로 알린다
 *
 * `useSheetOverlayStore` 를 `BottomSheet` 와 같이 쓴다. 스크림(z-50)이 탭바(z-30)를
 * 덮기는 하지만, 40% 스크림 아래로 탭바가 유령처럼 비쳐 보인다. design.md §11 이
 * "Bottom Sheet / **Modal** 활성 시 숨김" 이라고 둘을 같이 적은 이유다.
 *
 * **쓰는 화면이 그 스토어를 건드리지 않는다** — 잊으면 탭바가 모달 위에 남는
 * 종류의 버그라 컴포넌트가 책임진다.
 */
type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * 접근성 상 필수(Radix 가 `aria-labelledby` 로 연결한다).
   * 본문에 같은 제목이 이미 보이면 `hideTitle` 로 화면에서만 숨긴다.
   */
  title: string;
  hideTitle?: boolean;
  children: ReactNode;
  className?: string;
};

export function Modal({
  open,
  onOpenChange,
  title,
  hideTitle = false,
  children,
  className = '',
}: ModalProps) {
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
            // `top-1/2 left-1/2` + `-translate-1/2` 로 가운데 세운다. flex 로 가운데
            // 두려면 래퍼가 하나 더 필요한데, Radix 가 `Content` 에 직접 포커스와
            // 애니메이션 상태를 붙여서 그 사이에 요소를 끼우면 둘이 어긋난다.
            'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-4rem)] w-[calc(100%-2.5rem)] max-w-82 ' +
            '-translate-1/2 flex-col overflow-y-auto rounded-card bg-surface p-5 shadow-float ' +
            // 등장은 크기로 말한다 (`styles/index.css` 의 `modal-pop-in` 주석).
            // `prefers-reduced-motion` 에서는 끈다 — `Toast` 와 같은 처리다.
            'data-[state=open]:animate-[modal-pop-in_var(--motion-sheet)_var(--ease-standard)] motion-reduce:animate-none ' +
            className
          }
        >
          <Dialog.Title className={hideTitle ? 'sr-only' : undefined}>
            {title}
          </Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
