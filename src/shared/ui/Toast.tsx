import { useEffect } from 'react';

import { useBottomFixedSpace } from '@/shared/hooks/useBottomFixedSpace';
import { useToastStore } from '@/shared/hooks/useToastStore';

/** 자동 소멸까지의 시간. 프로토타입 `setTimeout(...,2200)` 실측값이다 */
const TOAST_DURATION_MS = 2200;

/** 하단 고정 요소와 토스트 사이 간격. 디자인 회신(이슈 #54)의 규칙값이다 */
const GAP_ABOVE_BOTTOM_FIXED_PX = 14;

/** 하단에 고정 요소가 없는 화면에서 바닥까지의 거리 (같은 회신의 표 넷째 줄) */
const BOTTOM_WITHOUT_FIXED_PX = 24;

/**
 * 토스트 레이어 (FINCH-232). 앱 전체에 **하나만** 둔다 —
 * `app/layouts/RootLayout.tsx` 가 렌더한다.
 *
 * 문구를 띄우는 쪽은 `shared/hooks/useToastStore` 의 `showToast()` 를 부른다.
 * 이 컴포넌트를 직접 쓰는 화면은 없다.
 *
 * ## 자리
 *
 * 규칙은 고정값이 아니라 **"하단 고정 요소 위 14px"** 이다 (이슈 #54 회신,
 * 2026-09-11). 프로토타입의 `bottom:112px` 는 탭 바 98px 위 14px 이라는 뜻이었다.
 * 지금 화면에 무엇이 깔려 있는지는 `useBottomFixedSpace` 가 답한다 — 하단 고정
 * 요소들이 스스로 등록하므로 **화면마다 값을 손으로 적지 않는다.**
 * 그래서 화면이 늘어도 빠뜨릴 자리가 없다. 자세한 근거는 그 파일에 적었다.
 *
 * 좌우 16px · `z-index:30` · 반경 13 · 안쪽 18 · 15px/500/22 · 그림자
 * `0 6px 20px rgba(31,35,40,.2)` 는 모두 프로토타입 `.toast` 실측값이고
 * 토큰(`--radius-toast`·`--color-toast-bg`·`--color-toast-fg`·`--shadow-float`)으로
 * 옮겨 뒀다. 가로 폭을 `max-w-md` 로 가운데 정렬하는 것은 `TabBar`·`ActionBar` 와
 * 같다 — 넓은 화면에서 본문은 가운데인데 토스트만 화면 끝까지 가면 어긋나 보인다.
 *
 * **`.dark .toast` 분기는 만들지 않는다.** 다크 모드는 팀에서 없애기로 정했다
 * (`styles/index.css` 머리 주석).
 *
 * ## 겹칠 때
 *
 * 큐를 쌓지 않고 앞의 것을 즉시 갈아 끼운다. 타이머도 함께 다시 돈다 —
 * `sequence` 가 바뀌면 아래 이펙트가 정리되고 새로 걸린다(프로토타입의
 * `clearTimeout` 과 같다). 근거는 `useToastStore` 주석에 적었다.
 *
 * ## 스크린리더
 *
 * 토스트는 화면이 바뀌지 않는데 내용만 생기는 자리라 그냥 두면 낭독기가 읽지
 * 않는다. `role="status"` + `aria-live="polite"` 를 붙인다.
 * **`assertive` 는 쓰지 않는다** — 하던 읽기를 끊는다.
 *
 * 바깥 상자는 문구가 없을 때도 **항상 렌더한다.** 라이브 영역은 내용이 바뀌기
 * 전부터 DOM 에 있어야 낭독기가 변화를 감지한다. 상자째 붙였다 떼면 첫 토스트가
 * 읽히지 않는다.
 *
 * `pointer-events-none` 인 이유 — 토스트는 누르는 것이 아닌데 좌우 16px 을 뺀
 * 폭 전체를 덮고 있어서, 그대로 두면 그 아래 있는 것이 2.2초 동안 눌리지 않는다.
 *
 * ## 움직임 줄이기
 *
 * `prefers-reduced-motion` 에서는 등장 애니메이션만 끈다
 * (`motion-reduce:animate-none`). **머무는 시간은 그대로 2200ms 다** — 읽는 데
 * 필요한 시간이지 움직임이 아니다.
 */
export function ToastViewport() {
  const message = useToastStore((state) => state.message);
  const sequence = useToastStore((state) => state.sequence);
  const dismiss = useToastStore((state) => state.dismiss);
  const bottomFixedSpace = useBottomFixedSpace();

  useEffect(() => {
    if (message === null) {
      return;
    }

    const timer = setTimeout(dismiss, TOAST_DURATION_MS);
    return () => {
      clearTimeout(timer);
    };
    // `sequence` 는 쓰지 않지만 의존성에 둔다 — 같은 문구를 연달아 띄웠을 때
    // `message` 가 그대로라 이 이펙트가 다시 돌지 않으면 타이머가 첫 번째 것
    // 그대로 남아 두 번째 토스트가 일찍 사라진다.
  }, [message, sequence, dismiss]);

  const bottom =
    bottomFixedSpace > 0
      ? `${bottomFixedSpace + GAP_ABOVE_BOTTOM_FIXED_PX}px`
      : `calc(${BOTTOM_WITHOUT_FIXED_PX}px + env(safe-area-inset-bottom))`;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ bottom }}
      className="pointer-events-none fixed inset-x-0 z-30 mx-auto w-full max-w-md px-4"
    >
      {message !== null && (
        <p
          key={sequence}
          className="animate-[toast-pop_var(--motion-toast)_var(--ease-standard)] rounded-toast bg-toast-bg p-4.5 text-body-2 font-medium text-pretty text-toast-fg shadow-float motion-reduce:animate-none"
        >
          {message}
        </p>
      )}
    </div>
  );
}
