import { useCallback, useEffect, useRef } from 'react';

/**
 * 꾹 누르고 있으면 같은 동작을 반복해서 부른다. 입금 금액 프리셋(`+1만` `+10만`
 * `+100만`)이 쓴다 — 100만 원을 채우려고 `+10만` 을 열 번 누르게 두지 않는다.
 *
 * **`click` 을 걷어내고 `pointerdown` 으로 옮기지 않는다.** 키보드의 Enter·Space 는
 * `pointerdown` 을 내지 않는다 — 눌림을 포인터 이벤트로만 처리하면 키보드로는
 * 프리셋을 아예 쓸 수 없게 된다. 그래서 **한 번의 실행은 여전히 `click` 이 하고,
 * 이 훅은 그 위에 반복만 얹는다.**
 *
 * 대신 꾹 누른 뒤 손을 떼면 `click` 이 한 번 더 온다(`pointerup` 다음에 온다).
 * 그 한 번은 버린다 — 반복이 한 번이라도 돌았으면 `repeatedRef` 가 참이고,
 * 그때의 `click` 은 사용자가 의도한 열한 번째 증가가 아니라 손을 뗀 흔적이다.
 *
 * **가속한다.** 간격을 고정하면 `+1만` 으로 1,000만 원까지 가는 데 너무 오래 걸리고,
 * 처음부터 빠르면 한 칸만 올리려던 사람이 두세 칸을 넘긴다. 그래서 **누른 뒤 잠깐
 * 기다렸다가(`HOLD_DELAY_MS`) 보통 속도로 시작하고, 계속 누르고 있으면 빨라진다.**
 *
 * 멈추는 자리를 넷 다 잡는다 — `pointerup`(손 뗌) · `pointerleave`(누른 채 밖으로
 * 벗어남) · `pointercancel`(누른 채 스크롤해서 브라우저가 제스처를 가져감) ·
 * 언마운트. 하나라도 빠지면 손을 뗐는데 숫자가 계속 올라간다.
 */

/** 꾹 누름으로 인정하기까지 기다리는 시간. 이보다 짧으면 그냥 한 번 누른 것이다 */
const HOLD_DELAY_MS = 400;
/** 반복 간격 */
const REPEAT_INTERVAL_MS = 90;
/** 이 횟수를 넘기면 간격을 좁힌다 */
const ACCELERATE_AFTER = 12;
const FAST_INTERVAL_MS = 45;

type RepeatPressHandlers = {
  onPointerDown: () => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
  onClick: () => void;
  onContextMenu: (event: { preventDefault: () => void }) => void;
};

export function useRepeatPress(action: () => void): RepeatPressHandlers {
  /*
   * 최신 `action` 을 렌더가 아니라 이펙트에서 담아 둔다. 반복 타이머는 누르는
   * 동안 살아 있는데 그 사이 `action` 은 매 렌더 새 함수가 되므로, 타이머가 처음
   * 잡은 함수를 계속 부르면 오래된 값을 더하게 된다.
   */
  const actionRef = useRef(action);
  const timerRef = useRef<number | undefined>(undefined);
  const repeatedRef = useRef(false);

  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  const stop = useCallback(() => {
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  // 누른 채로 화면이 바뀌면 타이머만 남아 계속 돈다.
  useEffect(() => stop, [stop]);

  const start = useCallback(() => {
    stop();
    repeatedRef.current = false;
    let count = 0;
    /*
     * `setInterval` 이 아니라 `setTimeout` 을 이어 건다. 가속하려면 간격을 중간에
     * 바꿔야 하는데 `setInterval` 은 그게 안 된다.
     */
    const tick = () => {
      count += 1;
      repeatedRef.current = true;
      actionRef.current();
      timerRef.current = window.setTimeout(
        tick,
        count >= ACCELERATE_AFTER ? FAST_INTERVAL_MS : REPEAT_INTERVAL_MS,
      );
    };
    timerRef.current = window.setTimeout(tick, HOLD_DELAY_MS);
  }, [stop]);

  const handleClick = useCallback(() => {
    if (repeatedRef.current) {
      // 손을 뗀 흔적이다. 위 머리 주석 참고.
      repeatedRef.current = false;
      return;
    }
    actionRef.current();
  }, []);

  return {
    onPointerDown: start,
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onClick: handleClick,
    /*
     * 안드로이드 크롬은 길게 누르면 컨텍스트 메뉴를 띄우면서 `pointercancel` 을
     * 함께 낸다 — 그러면 반복이 시작하자마자 끊긴다. 꾹 누름이 필요한 버튼에서는
     * 그 메뉴로 할 일이 없으므로 막는다. iOS 쪽은 `-webkit-touch-callout:none`
     * 으로 호출부가 막는다.
     */
    onContextMenu: (event) => {
      event.preventDefault();
    },
  };
}
