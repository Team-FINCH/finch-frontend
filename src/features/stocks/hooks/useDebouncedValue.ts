import { useEffect, useState } from 'react';

/**
 * 값이 `delayMs` 동안 멈춘 뒤에야 따라오는 사본.
 *
 * 검색 입력이 쓴다. 글자마다 요청을 보내면 "삼성전자" 를 치는 동안 다섯 번이 나가고,
 * 그중 마지막 하나만 화면에 남는다. 목록이 중간 응답으로 한 번씩 깜빡이기도 한다.
 *
 * 타이머를 정리하지 않으면 이전 글자의 타이머가 살아 있어 옛 값이 나중에 도착한다.
 */
export function useDebouncedValue<TValue>(
  value: TValue,
  delayMs: number,
): TValue {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
