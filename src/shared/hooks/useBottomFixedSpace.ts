import { useCallback, useEffect, useId, useState } from 'react';
import { create } from 'zustand';

/**
 * 화면 아래쪽을 차지하고 있는 고정 요소가 지금 몇 px 을 가리는지 모으는 스토어
 * (FINCH-232).
 *
 * 토스트가 앉을 자리를 정하는 데 쓴다. 디자인이 준 규칙은 고정값이 아니라
 * **"하단 고정 요소 위 14px"** 이다 (이슈 #54 회신, 2026-09-11).
 *
 * | 화면                                            | 하단 고정 요소  | bottom |
 * | ----------------------------------------------- | --------------- | ------ |
 * | 홈 · 탐색 · 포트폴리오 · 내 정보 · 종목 상세    | 탭 바 98px      | 112px  |
 * | 주문 · 출금                                     | 버튼 바 88px    | 102px  |
 * | AI 채팅                                         | 입력창          | 높이+14|
 * | 아무것도 없는 화면                              | —               | 24px   |
 *
 * ## 왜 CSS 상속이 아니라 스토어인가
 *
 * `PageMain` 의 `--page-bottom-space` 는 껍데기(`TabBarLayout`)가 CSS 변수로
 * 내려 주고 본문이 상속받는다. 같은 방식을 여기 쓸 수 없다 — 토스트 레이어는
 * 껍데기의 **자손이 아니라 형제**다(`RootLayout` 바로 아래). CSS 변수는 DOM
 * 트리를 따라 내려가므로 `TabBarLayout` 이 자기 div 에 적은 값은 토스트에 닿지
 * 않는다. 게다가 주문·출금·AI 채팅에는 껍데기 자체가 없다(`app/router.tsx` —
 * 셋 다 `RootLayout` 바로 아래다).
 *
 * 그래서 **하단 고정 요소 자신이 자기 자리를 등록한다.** 규칙의 주어가 원래
 * 그것들이고("하단 고정 요소 위 14px"), 화면은 아무것도 적지 않는다. 화면이
 * 손으로 적는 방식이면 새 화면을 만든 사람이 빠뜨렸을 때 토스트가 버튼 바 밑에
 * 깔리는 것으로만 드러난다.
 *
 * 이 저장소에 이미 같은 모양의 전례가 있다 — `useSheetOverlayStore` 에서
 * `BottomSheet` 가 마운트 이펙트로 스스로 등록한다. "쓰는 사람이 잊으면 조용히
 * 어긋나는 종류의 값은 컴포넌트가 스스로 책임진다" 는 같은 판단이다.
 *
 * ## 높이가 아니라 "바닥에서 가린 높이" 를 잰다
 *
 * `getBoundingClientRect().height` 가 아니라 `innerHeight - rect.top` 이다.
 * 탭 바는 `bottom: env(safe-area-inset-bottom)` 으로 홈 인디케이터만큼 떠 있어서,
 * 높이(98px)만 재면 실제로 가리는 높이(98px + safe-area)보다 작게 나온다.
 * 프로토타입이 고정 크기 기기 프레임이라 `env()` 를 쓰지 않은 것과 같은 자리다 —
 * `PageMain`·`ActionBar` 도 같은 이유로 safe-area 를 우리가 더했다.
 * safe-area 가 0 인 환경(데스크톱 브라우저)에서는 위 표의 112px·102px 이 그대로 나온다.
 */
type BottomFixedSpaceState = {
  /** 등록한 요소별로 "바닥에서 가린 높이(px)". 키는 등록한 컴포넌트 인스턴스다 */
  spaces: Record<string, number>;
  register: (id: string, space: number) => void;
  unregister: (id: string) => void;
};

const useBottomFixedSpaceStore = create<BottomFixedSpaceState>((set) => ({
  spaces: {},
  register: (id, space) =>
    set((state) =>
      state.spaces[id] === space
        ? state
        : { spaces: { ...state.spaces, [id]: space } },
    ),
  unregister: (id) =>
    set((state) => {
      if (!(id in state.spaces)) {
        return state;
      }
      const next = { ...state.spaces };
      delete next[id];
      return { spaces: next };
    }),
}));

/**
 * 하단에 고정된 요소가 자기 자리를 등록한다. 쓰는 쪽은 돌려받은 ref 를 달면 된다.
 *
 * ```tsx
 * const bottomFixedRef = useRegisterBottomFixedSpace();
 * return <div ref={bottomFixedRef} className="fixed inset-x-0 bottom-0 ...">…</div>;
 * ```
 *
 * **`useRef` 가 아니라 콜백 ref 를 돌려주는 이유** — 이 훅을 쓰는 요소는 조건부로
 * 사라진다. `TabBarShell` 은 바텀시트가 열리면 `null` 을 돌려주고, AI 채팅 입력창은
 * 화면을 떠나면 사라진다. `useRef` 로 받으면 요소가 빠질 때 `ref.current` 만 조용히
 * `null` 이 되고 이펙트는 다시 돌지 않아서, **없어진 요소의 높이가 등록된 채로 남아
 * 토스트가 허공에 뜬다.** 콜백 ref 는 붙고 떨어질 때마다 상태를 바꿔 이펙트를 다시
 * 돌린다.
 *
 * 재는 시점이 셋이다 — 요소가 붙을 때, 요소 크기 변경(`ResizeObserver`), 뷰포트 크기
 * 변경. AI 채팅 입력창처럼 내용에 따라 높이가 자라는 요소가 있어서 한 번만 재면
 * 모자란다. 뷰포트 변경까지 듣는 이유는 `innerHeight` 를 쓰기 때문이다 — 요소 크기가
 * 그대로여도 모바일 주소창이 접히면 값이 달라진다.
 */
export function useRegisterBottomFixedSpace(): (
  element: HTMLElement | null,
) => void {
  const id = useId();
  const [element, setElement] = useState<HTMLElement | null>(null);
  const register = useBottomFixedSpaceStore((state) => state.register);
  const unregister = useBottomFixedSpaceStore((state) => state.unregister);

  useEffect(() => {
    if (element === null) {
      unregister(id);
      return;
    }

    const target = element;
    function measure() {
      const { top } = target.getBoundingClientRect();
      register(id, Math.max(0, window.innerHeight - top));
    }

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(target);
    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      unregister(id);
    };
  }, [element, id, register, unregister]);

  return useCallback((next: HTMLElement | null) => {
    setElement(next);
  }, []);
}

/**
 * 지금 화면 아래쪽이 가려진 높이(px). 가린 것이 없으면 0 이다.
 *
 * 둘 이상이 동시에 등록돼 있으면 가장 큰 값을 쓴다. 정상적인 화면에는 하나뿐이지만
 * (탭 바와 버튼 바가 같이 뜨는 화면은 없다), 전환 중 한 프레임 동안 둘이 겹칠 수
 * 있다. 그때 작은 쪽을 고르면 토스트가 큰 쪽 밑으로 들어간다.
 *
 * 파생된 숫자 하나만 구독하므로 등록값이 바뀌어도 결과가 같으면 리렌더되지 않는다
 * (컨벤션 §4 "셀렉터로 필요한 값만 구독한다").
 */
export function useBottomFixedSpace(): number {
  return useBottomFixedSpaceStore((state) => {
    const spaces = Object.values(state.spaces);
    return spaces.length === 0 ? 0 : Math.max(...spaces);
  });
}
