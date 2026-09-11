import { create } from 'zustand';

/**
 * 토스트 한 줄을 담는 전역 스토어 (FINCH-232).
 *
 * **큐를 쌓지 않는다.** 새 토스트가 오면 앞의 것을 즉시 갈아 끼운다 —
 * 프로토타입 `toast(m){ setState({toast:m}); clearTimeout(this._t); ... }` 와 같다.
 * 이유는 토스트가 **방금 한 행동의 확인**이기 때문이다. 큐로 밀면 세 번째가 뜰 때
 * 사용자는 이미 다른 화면에 있고, 그 화면에서 한 다른 행동의 결과로 오독한다.
 *
 * `sequence` 는 같은 문구를 연달아 띄웠을 때도 등장 애니메이션과 자동 소멸 타이머가
 * 다시 도는 데 쓴다. `message` 만 보면 `관심 종목에 담았어요` 를 두 번 연속 띄울 때
 * 값이 그대로라 아무 일도 일어나지 않은 것처럼 보인다.
 *
 * **소멸 타이머는 여기 두지 않고 `shared/ui/Toast.tsx` 가 가진다.** 타이머를 스토어에
 * 두면 테스트와 HMR 에서 떠도는 `setTimeout` 이 남고, 스토어를 구독하는 화면이 하나도
 * 없을 때도 타이머가 돈다. 뷰포트가 마운트돼 있는 동안만 타이머가 사는 쪽이 맞다.
 */
type ToastState = {
  message: string | null;
  /** 같은 문구를 연달아 띄워도 등장이 다시 일어나게 하는 일련번호 */
  sequence: number;
  show: (message: string) => void;
  dismiss: () => void;
};

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  sequence: 0,
  show: (message) =>
    set((state) => ({ message, sequence: state.sequence + 1 })),
  dismiss: () => set({ message: null }),
}));

/**
 * 토스트를 띄운다. **훅이 아니라 그냥 함수다.**
 *
 * 부르는 자리가 뮤테이션 `onSuccess` 콜백·이벤트 핸들러라 훅을 쓸 수 없는 곳이 많고,
 * 훅으로 두면 토스트를 띄우기만 하는 화면이 스토어를 구독하게 되어 토스트가 뜰 때마다
 * 그 화면이 통째로 리렌더된다. 구독은 뷰포트 하나면 된다.
 *
 * ```ts
 * showToast(`${stock.name}를 관심 종목에 담았어요.`);
 * ```
 */
export function showToast(message: string): void {
  useToastStore.getState().show(message);
}
