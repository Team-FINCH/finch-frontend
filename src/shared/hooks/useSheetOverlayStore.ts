import { create } from 'zustand';

/**
 * 화면 어딘가에 열려 있는 오버레이(바텀시트·모달)가 하나라도 있는지 세는 전역
 * 카운터
 * (FINCH-28). `TabBar`(`shared/ui/TabBar.tsx`)와 `AiFloatingOverlay`
 * (`app/layouts/AiFloatingOverlay.tsx`)가 이 값을 구독해 시트가 열려 있는 동안
 * 렌더에서 빠진다 — 프로토타입의 `showTabs`·`showFab`이 `!s.sheet`인 것과 같다.
 *
 * **각 시트 자신의 열림 여부는 이 스토어에 없다.** `frontConvention.md` §4가
 * "바텀시트 열림 여부"를 로컬 상태로, "전역 바텀시트 제어"를 Zustand 대상으로
 * 따로 적어 둔 것이 이 구분이다 — 시트 하나하나는 그걸 띄운 화면의 로컬
 * `useState`가 주인이고, 이 스토어는 그 로컬 상태들을 모아 "지금 열린 시트가
 * 있나"만 답한다.
 *
 * **왜 불리언이 아니라 카운터인가.** `BottomSheet`는 각자 로컬 상태로 여닫히는
 * 재사용 컴포넌트라, 이 레이어가 동시에 두 개 이상 열리는 것을 막지 않는다
 * (시트 본문이 또 다른 시트를 여는 흐름 등). 불리언이면 바깥 시트가 아직 열려
 * 있는데 안쪽 시트가 닫히는 순간 `false`로 떨어져 탭바/AI 버튼이 시트 위로
 * 돌아온다. 카운트가 정확히 0으로 떨어질 때만 "열린 시트 없음"이어야 해서
 * 카운터로 뒀다. 프로토타입 자체의 `sheet` 필드는 스칼라(값 하나)라 화면 하나가
 * 동시에 두 시트를 열지 않지만, 그건 프로토타입의 화면별 상태 설계이지
 * 컴포넌트 계층의 제약이 아니다 — 우리 컴포넌트는 그 제약을 상속하지 않는다.
 *
 * **`BottomSheet`와 `Modal`이 마운트 이펙트로 스스로 increment/decrement한다.**
 * `BottomSheet`를 쓰는 화면이 이 스토어를 직접 건드리지 않는다 — 쓰는 사람이
 * 잊으면 탭바가 시트 위에 남는 종류의 버그라 컴포넌트가 스스로 책임진다.
 */
type SheetOverlayState = {
  openCount: number;
  increment: () => void;
  decrement: () => void;
};

export const useSheetOverlayStore = create<SheetOverlayState>((set) => ({
  openCount: 0,
  increment: () => set((state) => ({ openCount: state.openCount + 1 })),
  decrement: () =>
    set((state) => ({ openCount: Math.max(0, state.openCount - 1) })),
}));

/**
 * 소비 측 전용 셀렉터. 카운트 자체가 아니라 파생된 불리언만 구독한다 —
 * 컨벤션 §4 "셀렉터로 필요한 값만 구독한다"를 따른다. 카운트가 1→2 로 바뀌어도
 * 이 훅을 쓰는 컴포넌트는 리렌더되지 않는다(불리언 값이 그대로라서).
 */
export function useIsAnySheetOpen() {
  return useSheetOverlayStore((state) => state.openCount > 0);
}
