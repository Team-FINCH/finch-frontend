import { http, HttpResponse, type JsonBodyType } from 'msw';

import {
  API_PATHS,
  DEPOSIT_CUMULATIVE_LIMIT,
  DEPOSIT_PER_REQUEST_LIMIT,
} from '@/shared/config/apiContract';
import { ROUTES } from '@/shared/config/routes';
import {
  COMMON_ERROR_CODES,
  DEPOSIT_ERROR_CODES,
  WITHDRAWAL_ERROR_CODES,
} from '@/shared/types/errorCodes';

import { errorResponse, mockPath, readJsonBody } from '../lib/http';
import { checkIdempotency } from '../lib/idempotency';
import { requireAuth } from '../lib/session';
import { recordTransaction, store } from '../lib/store';
import { nowKstIso } from '../lib/time';

/**
 * 충전 4단계(`ready`→결제창→`mock-approve`→`confirm`) · 출금 (FINCH-35).
 *
 * **이 워크트리 시점에 `frontend/docs/contracts.md` C89~C92(오늘 등재된 충전 계약)가
 * 안 보인다.** 다른 브랜치에 있는 것으로 보인다. 아래 판정 로직·필드 이름은 티켓
 * 프롬프트가 준 값(엔드포인트 3개·에러 코드 5+1종·`Idempotency-Key` 필수 여부)을
 * 최대한 그대로 옮기고, 명시되지 않은 세부 판정(모의 이체 시나리오가 `confirm`에서
 * 정확히 어느 코드로 떨어지는지 등)은 이 파일이 **직접 설계한 것**이다. 실제 계약과
 * 다르면 그쪽이 맞다 — 코드 쪽에 TODO 를 남기지 않은 이유는 이 목 자체가 계약이
 * 아니라 화면을 굴려 보기 위한 근사치이기 때문이다.
 *
 * **상태 유지 범위** — 결제 준비~확정 사이의 대기 상태(`pendingPayments`)는 이
 * 모듈만의 것이다. 확정되고 나면 예수금·누적 충전액·원장(`lib/store.ts`)에 반영되고,
 * 그 뒤로는 다른 화면과 상태를 공유한다. 새로고침하면 대기 상태·확정 결과 모두
 * 초기화된다.
 *
 * ## 어느 입력이 어느 응답을 내는가
 *
 * | 입력 | 응답 |
 * | --- | --- |
 * | `ready` `paymentMethod` 열거값 밖 | `400 INVALID_REQUEST` |
 * | `ready` `amount <= 0` | `400 DEPOSIT_AMOUNT_INVALID` |
 * | `ready` `amount > 1,000만` | `409 DEPOSIT_PER_REQUEST_LIMIT_EXCEEDED` |
 * | `ready` 계정 누적 1억 초과 | `409 DEPOSIT_LIMIT_EXCEEDED` |
 * | `ready` `paymentMethod: 'KAKAOPAY'` | `checkoutUrl` 이 **결제 복귀 성공 화면**으로 바로 간다. 이 목은 실제 카카오 결제창을 흉내 내지 않는다 — 승인 성공을 즉시 흉내 낸다 |
 * | `ready` `paymentMethod: 'TRANSFER'` | `checkoutUrl` 이 모의 이체 화면(`/deposit/transfer`)으로 간다 |
 * | `mock-approve` 모르는 `paymentId` | `404 DEPOSIT_NOT_FOUND` |
 * | `mock-approve` 이미 확정된 결제 | `409 DEPOSIT_INVALID_STATE` |
 * | `mock-approve` `scenario` 로 실패를 예약 | 이 응답 자체는 `200` 이다. 실패는 다음 `confirm` 에서 난다(아래) |
 * | `confirm` 모르는 `paymentId` | `404 DEPOSIT_NOT_FOUND` |
 * | `confirm` `paymentKey` 불일치 | `409 DEPOSIT_INVALID_STATE` |
 * | `confirm` `amount` 불일치 | `409 DEPOSIT_AMOUNT_MISMATCH` |
 * | `confirm` 예약된 시나리오가 `TIMEOUT` | `409 DEPOSIT_NOT_APPROVED` — 만료 배치 전 상태를 흉내 낸다 |
 * | `confirm` 예약된 시나리오가 `INSUFFICIENT_BALANCE` | `402 DEPOSIT_PAYMENT_FAILED` |
 * | `confirm` 예약된 시나리오가 `LIMIT_EXCEEDED` | `409 DEPOSIT_LIMIT_EXCEEDED` |
 * | `confirm` 같은 `paymentKey` 로 재호출(정상 확정 뒤) | `200` + 최초 응답 본문 (C85 — `201` 이 아니다) |
 * | `confirm` 정상 | `201`. 예수금·누적 충전액·원장을 실제로 바꾼다 |
 * | `POST /withdrawals` 멱등성 헤더 없음·`a` 로 시작하는 키·같은 키 다른 본문 | `lib/idempotency.ts` 표 참고 |
 * | `POST /withdrawals` `amount <= 0` | `400 WITHDRAWAL_AMOUNT_INVALID` |
 * | `POST /withdrawals` 예수금 초과 | `409 WITHDRAWAL_INSUFFICIENT_CASH` (`detail.availableAmount`) |
 *
 * `POST /deposits/confirm`·`POST /deposits/{paymentId}/mock-approve` 는
 * `Idempotency-Key` 헤더를 쓰지 않는다 — 충전 쪽 멱등 기준은 `paymentKey` 다(C85).
 * `POST /withdrawals` 만 이 헤더가 필수다(C29·C86).
 */

const PAYMENT_METHODS = ['KAKAOPAY', 'TRANSFER'];
const MOCK_APPROVE_SCENARIOS = [
  'SUCCESS',
  'INSUFFICIENT_BALANCE',
  'LIMIT_EXCEEDED',
  'TIMEOUT',
];

type PendingPaymentStatus = 'READY' | 'CONFIRMED';

interface PendingPayment {
  paymentId: number;
  amount: number;
  paymentMethod: 'KAKAOPAY' | 'TRANSFER';
  status: PendingPaymentStatus;
  paymentKey: string | null;
  /** `TRANSFER` 모의 이체 화면이 고른 실패 시연 시나리오. `mock-approve` 가 채운다 */
  scenario: string | null;
  /** `confirm` 이 이미 낸 응답. 같은 `paymentKey` 재호출에 그대로 되돌려준다(C85) */
  confirmedResponse: JsonBodyType | null;
}

const pendingPayments = new Map<number, PendingPayment>();

/**
 * 서버는 DB 채번이라 숫자를 준다 (apiSpec §4.2 `"paymentId": 77`).
 * **한때 목만 `pay_1` 같은 문자열을 냈다** — 프론트 Zod 스키마도 같이 틀려 있어서
 * 목에서는 통과하고 실제 백엔드에서만 깨졌다(FINCH-160). 목이 계약을 따른다.
 */
function issuePaymentId(): number {
  const paymentId = store.nextPaymentId;
  store.nextPaymentId += 1;
  return paymentId;
}

export const depositHandlers = [
  http.post(mockPath(API_PATHS.deposits.ready), async ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const body = await readJsonBody(request);
    if (body === null) {
      return errorResponse(
        COMMON_ERROR_CODES.INVALID_REQUEST,
        '요청 값이 올바르지 않습니다',
        400,
      );
    }

    const { amount, paymentMethod } = body;

    if (
      typeof paymentMethod !== 'string' ||
      !PAYMENT_METHODS.includes(paymentMethod)
    ) {
      return errorResponse(
        COMMON_ERROR_CODES.INVALID_REQUEST,
        '요청 값이 올바르지 않습니다',
        400,
        { paymentMethod: 'KAKAOPAY 또는 TRANSFER 여야 합니다' },
      );
    }

    if (
      typeof amount !== 'number' ||
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      return errorResponse(
        DEPOSIT_ERROR_CODES.AMOUNT_INVALID,
        '충전 금액을 확인해 주세요',
        400,
      );
    }

    if (amount > DEPOSIT_PER_REQUEST_LIMIT) {
      return errorResponse(
        DEPOSIT_ERROR_CODES.PER_REQUEST_LIMIT_EXCEEDED,
        '한 번에 1,000만 원까지 충전할 수 있어요',
        409,
      );
    }

    const remainingAmount = DEPOSIT_CUMULATIVE_LIMIT - store.depositedAmount;
    if (amount > remainingAmount) {
      return errorResponse(
        DEPOSIT_ERROR_CODES.LIMIT_EXCEEDED,
        '충전할 수 있는 금액을 넘었어요',
        409,
        { remainingAmount },
      );
    }

    const paymentId = issuePaymentId();
    const method = paymentMethod as 'KAKAOPAY' | 'TRANSFER';

    /*
     * 카카오페이는 이 목이 실제 결제창을 흉내 낼 수 없다 — 그건 백엔드와 카카오
     * 사이의 실제 연동이다. 그래서 승인 성공을 즉시 흉내 내고 결제 복귀 성공
     * 화면으로 바로 보낸다. 계좌이체는 우리 화면(모의 이체)이 있으니 그리로 보낸다.
     */
    const paymentKey = method === 'KAKAOPAY' ? `mock_pk_${paymentId}` : null;
    pendingPayments.set(paymentId, {
      paymentId,
      amount,
      paymentMethod: method,
      status: 'READY',
      paymentKey,
      scenario: null,
      confirmedResponse: null,
    });

    const checkoutUrl =
      method === 'KAKAOPAY'
        ? `${ROUTES.depositComplete}?paymentId=${paymentId}&paymentKey=${paymentKey}&amount=${amount}`
        : `${ROUTES.depositTransfer}?paymentId=${paymentId}`;

    return HttpResponse.json({ paymentId, checkoutUrl }, { status: 201 });
  }),

  http.post(
    mockPath(API_PATHS.deposits.mockApprove(':paymentId')),
    async ({ request, params }) => {
      const unauthorized = requireAuth(request);
      if (unauthorized !== null) {
        return unauthorized;
      }

      const paymentId = Number(params.paymentId);
      const payment = pendingPayments.get(paymentId);
      if (payment === undefined) {
        return errorResponse(
          DEPOSIT_ERROR_CODES.NOT_FOUND,
          '충전 요청을 찾을 수 없어요',
          404,
        );
      }

      if (payment.status !== 'READY') {
        return errorResponse(
          DEPOSIT_ERROR_CODES.INVALID_STATE,
          '이미 처리된 충전이에요',
          409,
        );
      }

      const body = await readJsonBody(request);
      const scenarioInput = body?.scenario;
      const scenario =
        typeof scenarioInput === 'string' &&
        MOCK_APPROVE_SCENARIOS.includes(scenarioInput)
          ? scenarioInput
          : 'SUCCESS';

      payment.scenario = scenario;
      payment.paymentKey ??= `mock_pk_${paymentId}`;

      return HttpResponse.json({
        paymentId: payment.paymentId,
        paymentKey: payment.paymentKey,
        amount: payment.amount,
      });
    },
  ),

  http.post(mockPath(API_PATHS.deposits.confirm), async ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const body = await readJsonBody(request);
    if (body === null) {
      return errorResponse(
        COMMON_ERROR_CODES.INVALID_REQUEST,
        '요청 값이 올바르지 않습니다',
        400,
      );
    }

    const { paymentId, paymentKey, amount } = body;
    if (
      typeof paymentId !== 'number' ||
      !Number.isSafeInteger(paymentId) ||
      typeof paymentKey !== 'string' ||
      typeof amount !== 'number'
    ) {
      return errorResponse(
        COMMON_ERROR_CODES.INVALID_REQUEST,
        '요청 값이 올바르지 않습니다',
        400,
      );
    }

    const payment = pendingPayments.get(paymentId);
    if (payment === undefined) {
      return errorResponse(
        DEPOSIT_ERROR_CODES.NOT_FOUND,
        '충전 요청을 찾을 수 없어요',
        404,
      );
    }

    // 같은 paymentKey 재호출은 재시도 성공 경로다 — 201 이 아니라 200 + 최초 응답(C85).
    if (payment.status === 'CONFIRMED') {
      if (payment.paymentKey === paymentKey && payment.confirmedResponse) {
        return HttpResponse.json(payment.confirmedResponse, { status: 200 });
      }
      return errorResponse(
        DEPOSIT_ERROR_CODES.INVALID_STATE,
        '이미 처리된 충전이에요',
        409,
      );
    }

    if (payment.paymentKey !== paymentKey) {
      return errorResponse(
        DEPOSIT_ERROR_CODES.INVALID_STATE,
        '결제 상태를 확인할 수 없어요',
        409,
      );
    }

    if (payment.amount !== amount) {
      return errorResponse(
        DEPOSIT_ERROR_CODES.AMOUNT_MISMATCH,
        '결제 금액이 요청과 달라요',
        409,
      );
    }

    // `TRANSFER` 모의 이체 화면이 예약해 둔 실패 시나리오 (mock-approve 참고).
    if (payment.scenario === 'TIMEOUT') {
      return errorResponse(
        DEPOSIT_ERROR_CODES.NOT_APPROVED,
        '결제 확인 시간이 지났어요',
        409,
      );
    }
    if (payment.scenario === 'INSUFFICIENT_BALANCE') {
      return errorResponse(
        DEPOSIT_ERROR_CODES.PAYMENT_FAILED,
        '결제 수단의 잔액이 부족해요',
        402,
      );
    }
    if (payment.scenario === 'LIMIT_EXCEEDED') {
      return errorResponse(
        DEPOSIT_ERROR_CODES.LIMIT_EXCEEDED,
        '충전할 수 있는 금액을 넘었어요',
        409,
        { remainingAmount: 0 },
      );
    }

    const remainingAmount = DEPOSIT_CUMULATIVE_LIMIT - store.depositedAmount;
    if (amount > remainingAmount) {
      return errorResponse(
        DEPOSIT_ERROR_CODES.LIMIT_EXCEEDED,
        '충전할 수 있는 금액을 넘었어요',
        409,
        { remainingAmount },
      );
    }

    const confirmedAt = nowKstIso();
    store.cashBalance += amount;
    store.depositedAmount += amount;
    recordTransaction({
      type: 'DEPOSIT',
      occurredAt: confirmedAt,
      stockCode: null,
      stockName: null,
      price: null,
      quantity: null,
      amount,
      realizedProfit: null,
      realizedProfitRate: null,
      paymentMethod: payment.paymentMethod,
    });

    payment.status = 'CONFIRMED';
    const responseBody: JsonBodyType = {
      // 이 응답만 `depositId` 다 — v0.7 단발 `POST /deposits` 응답을 물려받았다(apiSpec §4.4).
      depositId: paymentId,
      amount,
      paymentMethod: payment.paymentMethod,
      cashBalanceAfter: store.cashBalance,
      depositedAt: confirmedAt,
    };
    payment.confirmedResponse = responseBody;

    return HttpResponse.json(responseBody, { status: 201 });
  }),

  http.post(mockPath(API_PATHS.withdrawals.create), async ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const body = await readJsonBody(request);

    // 멱등성 판정이 본문 검증보다 앞선다 (apiSpec §1.4).
    const idempotency = checkIdempotency(request, body);
    if (idempotency.blocked) {
      return idempotency.response;
    }

    if (body === null) {
      return errorResponse(
        COMMON_ERROR_CODES.INVALID_REQUEST,
        '요청 값이 올바르지 않습니다',
        400,
      );
    }

    const { amount } = body;
    if (
      typeof amount !== 'number' ||
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      return errorResponse(
        WITHDRAWAL_ERROR_CODES.AMOUNT_INVALID,
        '출금 금액을 확인해 주세요',
        400,
      );
    }

    if (amount > store.cashBalance) {
      return errorResponse(
        WITHDRAWAL_ERROR_CODES.INSUFFICIENT_CASH,
        '출금 가능 금액을 초과했습니다',
        409,
        { availableAmount: store.cashBalance },
      );
    }

    const withdrawnAt = nowKstIso();
    store.cashBalance -= amount;
    recordTransaction({
      type: 'WITHDRAWAL',
      occurredAt: withdrawnAt,
      stockCode: null,
      stockName: null,
      price: null,
      quantity: null,
      amount,
      realizedProfit: null,
      realizedProfitRate: null,
      paymentMethod: null,
    });

    const withdrawalId = store.nextWithdrawalId;
    store.nextWithdrawalId += 1;

    return idempotency.commit(201, {
      withdrawalId,
      amount,
      cashBalanceAfter: store.cashBalance,
      withdrawnAt,
    });
  }),
];
