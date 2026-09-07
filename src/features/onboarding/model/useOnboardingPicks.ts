import { useCallback, useState } from 'react';

/**
 * 온보딩에서 고른 종목코드. 순서를 지킨다 — 고른 순서대로 관심 목록에 담긴다.
 *
 * `Set` 이 아니라 배열인 이유는 등록 순서가 관심 목록의 기본 정렬(`REGISTERED`)과
 * 이어지기 때문이다. 먼저 고른 종목이 목록에서도 먼저 온다.
 */
export function useOnboardingPicks() {
  const [picks, setPicks] = useState<readonly string[]>([]);

  const toggle = useCallback((stockCode: string) => {
    setPicks((current) =>
      current.includes(stockCode)
        ? current.filter((code) => code !== stockCode)
        : [...current, stockCode],
    );
  }, []);

  return { picks, toggle };
}
