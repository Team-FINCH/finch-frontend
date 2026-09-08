import { http, HttpResponse } from 'msw';

import {
  API_PATHS,
  DEPOSIT_CUMULATIVE_LIMIT,
  DEPOSIT_PER_REQUEST_LIMIT,
} from '@/shared/config/apiContract';

import { mockPath } from '../lib/http';
import { requireAuth } from '../lib/session';
import { store } from '../lib/store';
import { nowKstIso } from '../lib/time';
import { evaluationAmount, totalAsset } from '../lib/valuation';

/**
 * 계좌 요약 · 충전 한도 조회 (apiSpec §3 · §4.1).
 *
 * **상태 유지 범위** — 예수금·누적 충전액이 `lib/store.ts` 의 모듈 변수다.
 * 충전·출금이 그 값을 실제로 바꾸므로 잔고 화면이 갱신되는 것을 볼 수 있고,
 * 새로고침하면 초기값으로 돌아간다.
 *
 * **`POST /account/reset`·`GET /rounds` 는 apiSpec v0.7 에서 사라졌다** (이슈 #27).
 * `GET /account` 도 계좌 식별자를 받지 않고 내려주지 않는다 (§1.6).
 *
 * **단발 `POST /deposits`(구 apiSpec §4.2)는 이 파일에 더 없다.** apiSpec v0.8 에서
 * 그 경로가 삭제되고 충전이 `ready`·`confirm`·`mock-approve` 4단계로 바뀌었다
 * (contracts C49 · C85, FINCH-35). 그 셋과 `POST /withdrawals`는
 * `mocks/handlers/deposit.ts`가 맡는다 — 자기 상태(대기 중인 결제)가 있어
 * 이 파일의 단순 조회 둘과 분리했다.
 */

export const accountHandlers = [
  http.get(mockPath(API_PATHS.account.summary), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    return HttpResponse.json({
      cashBalance: store.cashBalance,
      evaluationAmount: evaluationAmount(),
      totalAsset: totalAsset(),
      asOf: nowKstIso(),
    });
  }),

  http.get(mockPath(API_PATHS.deposits.limit), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    return HttpResponse.json({
      perRequestLimit: DEPOSIT_PER_REQUEST_LIMIT,
      cumulativeLimit: DEPOSIT_CUMULATIVE_LIMIT,
      depositedAmount: store.depositedAmount,
      remainingAmount: DEPOSIT_CUMULATIVE_LIMIT - store.depositedAmount,
    });
  }),
];
