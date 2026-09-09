import { useEffect, useState } from 'react';

/**
 * 값이 멈춘 뒤에야 바뀌는 사본을 돌려준다.
 *
 * 수량이 한 자씩 바뀔 때마다 AI 점검을 부르면 요금이 그만큼 나간다. 그래서 요청을
 * 거는 쪽은 이 사본을 쓴다 — 입력이 멈춘 뒤 한 번만 값이 옮겨진다.
 *
 * `shared` 로 올리지 않았다. 지금 쓰는 곳이 주문 하나뿐이고, 컨벤션 §2 가
 * `shared` 를 "두 개 이상의 feature 가 쓰는 것" 으로 정했다.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}
