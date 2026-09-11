import { http, HttpResponse } from 'msw';

import { API_PATHS } from '@/shared/config/apiContract';

import { mockPath } from '../lib/http';
import { requireAuth } from '../lib/session';
import { nowKstIso } from '../lib/time';

/**
 * 시장 지수 (apiSpec §5.7 시장 지수 조회, v0.8.7 · 티켓 225).
 *
 * **상태 유지 범위** — 기준값이 모듈 상수이고, 값만 호출 때마다 흔들린다.
 * 폴링(15초)이 실제로 새 값을 받아 오는지 눈으로 확인하려면 응답이 매번 같으면
 * 안 된다. 흔들림 폭은 기준값의 ±0.35% 로 좁게 뒀다 — 지수가 한 번에 몇 퍼센트씩
 * 튀면 등락 색이 새로고침마다 뒤집혀 색 규약을 확인할 수 없다.
 *
 * ## 어느 입력이 어느 응답을 내는가
 *
 * 파라미터가 없어 갈래를 입력으로 고를 수 없다. 대신 **두 지수를 서로 다른
 * 상태로 고정**해 한 응답에서 두 갈래가 같이 보이게 했다.
 *
 * | 항목 | 상태 |
 * | --- | --- |
 * | `KOSPI` | 정상 수신 — 값 있음 · `stale: false` |
 * | `KOSDAQ` | **`stale: true` + 마지막 수신 값 유지** — 지연 표시 갈래 |
 *
 * 세 번째 갈래인 **값 없음**(전부 `null` + `stale: true`)은 서버 기동 직후에만
 * 나오는 상태라 기본 응답에 두지 않았다. 그 갈래를 보려면 아래 `MOCK_INDICES`
 * 한 줄의 `emptyValues` 를 `true` 로 바꾼다 — 화면은 그 지수 자리만 비우고
 * 나머지 한 줄은 그대로 돈다(둘 다 비워도 롤링 자체는 남는다).
 *
 * **장 마감을 흉내 내지 않는다.** 장이 닫혀 있어도 서버는 `stale: false` 에
 * 마지막 종가를 준다(§5.7). 장 운영 여부는 이 응답에 실리지 않는다.
 */

type MockIndex = {
  indexCode: string;
  baseValue: number;
  basePreviousClose: number;
  stale: boolean;
  /** `true` 면 값 3필드와 `asOf` 가 전부 `null` 로 나간다. `stale` 도 함께 참이다 */
  emptyValues: boolean;
};

/** 소수 둘째 자리까지. **정수로 반올림하지 않는다** (§5.7 — 금액 규칙의 예외). */
function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

/** 기준값 언저리에서 흔들린다. 폭은 ±0.35%. */
function jitter(baseValue: number): number {
  return roundToTwo(baseValue * (1 + (Math.random() - 0.5) * 0.007));
}

/**
 * 기준값은 프로토타입 스크립트에 박혀 있던 상수를 그대로 쓴다
 * (`2,600.54` · `793.84`). 전일 종가는 apiSpec §5.7 예시의 변동폭에서 역산했다.
 */
const MOCK_INDICES: MockIndex[] = [
  {
    indexCode: 'KOSPI',
    baseValue: 2600.54,
    basePreviousClose: 2612.85,
    stale: false,
    emptyValues: false,
  },
  {
    indexCode: 'KOSDAQ',
    baseValue: 793.84,
    basePreviousClose: 792.89,
    stale: true,
    emptyValues: false,
  },
];

export const marketHandlers = [
  http.get(mockPath(API_PATHS.market.indices), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const asOf = nowKstIso();

    return HttpResponse.json({
      // 순서는 KOSPI → KOSDAQ 고정이다 (§5.7). 정렬하지 않는다.
      items: MOCK_INDICES.map((index) => {
        if (index.emptyValues) {
          return {
            indexCode: index.indexCode,
            currentValue: null,
            changeValue: null,
            changeRate: null,
            asOf: null,
            stale: true,
          };
        }

        const currentValue = jitter(index.baseValue);
        const changeValue = roundToTwo(currentValue - index.basePreviousClose);

        return {
          indexCode: index.indexCode,
          currentValue,
          changeValue,
          /*
            백분율 값이다 (§1.1 · §5.7). 비율에 100 을 곱한 값을 서버가 주고
            화면은 `%` 만 붙인다 — 목이 0~1 소수를 주면 화면이 100배로 보인다.
          */
          changeRate: roundToTwo((changeValue / index.basePreviousClose) * 100),
          asOf,
          stale: index.stale,
        };
      }),
    });
  }),
];
