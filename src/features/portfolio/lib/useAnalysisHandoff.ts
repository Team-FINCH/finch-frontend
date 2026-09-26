import { useEffect, useRef, useState } from 'react';

/**
 * 분석이 끝난 순간을 연출로 잇는다 (FINCH-353).
 *
 * ## 왜 필요한가
 *
 * 값이 도착하면 React 는 대기 화면을 그 프레임에 걷어내고 결과를 올린다. 그러면
 * 사용자가 보는 것은 "분석이 끝났다" 가 아니라 **"로딩 화면이 사라졌다"** 다. 기다린
 * 시간이 제품 경험이 되려면 끝나는 순간도 설계돼 있어야 한다.
 *
 * 이 훅은 값이 도착한 뒤 `HANDOFF_MS` 동안 `true` 를 유지한다. 그동안 대기 화면이
 * 아주 조금 작아지며 빠지고(`analysis-handoff-out`), 곧바로 결과가 아래에서
 * 떠오른다(`analysis-result-in`). 둘이 겹쳐서 넘겨받는 것처럼 보인다.
 *
 * ## 180ms 인 이유
 *
 * **기다림을 늘리는 값이다.** 결과를 그만큼 늦게 보여 주는 것이므로 짧아야 한다.
 * 180ms 는 눈이 전환으로 읽는 하한(약 150ms)은 넘기고 "느리다" 로 느끼는 구간
 * (300ms 이상)에는 닿지 않는 값이다. 이보다 키우려면 늦어지는 만큼의 값을 먼저
 * 설명할 수 있어야 한다.
 *
 * ## 처음부터 값이 있으면 아무 일도 없다
 *
 * 캐시가 맞아 한 번도 대기 상태를 거치지 않은 경우(`staleTime` 5분 안에 탭을 오갈
 * 때가 그렇다)에는 `true` 가 된 적이 없으므로 연출도 없다. 넘겨받을 것이 없는데
 * 넘겨받는 시늉을 하면 그냥 180ms 느린 화면이 된다.
 */
const HANDOFF_MS = 180;

/**
 * @param isPending 값을 기다리는 중인지.
 * @param enabled 넘겨받기를 할 상황인지. 실패로 끝난 요청에는 끈다 — 결과가 들어오는
 *   연출인데 들어올 결과가 없다.
 * @returns 대기 화면을 아직 "빠지는 중" 으로 두어야 하는지.
 */
export function useAnalysisHandoff(
  isPending: boolean,
  enabled: boolean,
): boolean {
  const [settling, setSettling] = useState(false);
  const wasPending = useRef(isPending);

  useEffect(() => {
    const justFinished = wasPending.current && !isPending;
    wasPending.current = isPending;

    if (!justFinished || !enabled) {
      return;
    }

    setSettling(true);
    const timerId = window.setTimeout(() => {
      setSettling(false);
    }, HANDOFF_MS);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [isPending, enabled]);

  return settling;
}
