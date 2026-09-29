import { http, HttpResponse } from 'msw';

import {
  API_PATHS,
  CURSOR_PAGE_DEFAULT_SIZE,
  CURSOR_PAGE_MAX_SIZE,
  MARKET_HOURS_LABEL_KST,
} from '@/shared/config/apiContract';
import {
  COMMON_ERROR_CODES,
  ORDER_ERROR_CODES,
  STOCK_ERROR_CODES,
} from '@/shared/types/errorCodes';

import { findStock, livePriceOf } from '../lib/catalog';
import {
  errorResponse,
  mockPath,
  readJsonBody,
  searchParam,
} from '../lib/http';
import { checkIdempotency } from '../lib/idempotency';
import { requireAuth } from '../lib/session';
import { findHolding, recordTransaction, store } from '../lib/store';
import { nowKstIso } from '../lib/time';
import {
  currentPriceOf,
  evaluationAmount,
  profitRate,
  totalAsset,
} from '../lib/valuation';

/**
 * 주문 · 주문 가능 정보 · 잔고 · 매매 내역 (apiSpec §7 · §8).
 *
 * **상태 유지 범위** — 주문이 예수금·보유 종목·원장을 실제로 바꾼다. 매수 뒤 잔고 화면과
 * 매매 내역이 함께 움직이는 것을 볼 수 있고, 새로고침하면 초기 상태로 돌아간다.
 *
 * ## 어느 입력이 어느 응답을 내는가
 *
 * | 입력 | 응답 |
 * | --- | --- |
 * | 멱등성 헤더 없음 · `a` 로 시작하는 키 · 같은 키 다른 본문 | `lib/idempotency.ts` 표 참고 |
 * | `side` 가 `BUY`·`SELL` 밖 | `400 INVALID_REQUEST` |
 * | `quantity <= 0` | `400 ORDER_QUANTITY_INVALID` |
 * | 카탈로그에 없는 종목코드 | `404 STOCK_NOT_FOUND` |
 * | `024060`(흥구석유) | `409 ORDER_MARKET_CLOSED` |
 * | `466100`(클로봇) | `409 ORDER_STOCK_SUSPENDED` |
 * | `058610`(에스피지) | `503 ORDER_PRICE_UNAVAILABLE` |
 * | 예수금보다 큰 매수 | `409 ORDER_INSUFFICIENT_CASH` (`detail.required`·`detail.available`) |
 * | 보유 수량보다 큰 매도 | `409 ORDER_INSUFFICIENT_QUANTITY` |
 *
 * `ORDER_PRICE_CHANGED` 는 내지 않는다. apiSpec v0.8 이 이 코드를 폐기했다 —
 * 가격 변동으로 부족해진 것과 원래 부족했던 것을 서버가 구분하지 않고
 * `ORDER_INSUFFICIENT_CASH` 하나로 응답하기로 확정했다 (§11.2, featureSpec §7.3).
 *
 * 거래 시간(`MARKET_HOURS_LABEL_KST`)은 시계로 판정하지 않는다. 그러면 장 밖에서 주문 화면을 아예
 * 만들 수 없다. `ORDER_MARKET_CLOSED` 는 위 전용 종목으로만 나온다 (`lib/catalog.ts`).
 */

const ORDER_SIDES = ['BUY', 'SELL'];
const PORTFOLIO_SORTS = ['EVALUATION', 'PROFIT_RATE'];
/**
 * `type` 필터 한 값이 어느 원장 유형을 걷어 오는가 (apiSpec §8.2 v0.8).
 * 필터 값 5종은 이 표의 키가 전부다 — 화면 이름은 "전체 / 매수 / 매도 / 충전 / 출금".
 *
 * **`DEPOSIT` 은 `INITIAL_GRANT` 를 포함하지 않는다** (apiSpec §8.2, 커밋 `af96862`).
 * `type=DEPOSIT` 은 원장 유형 `DEPOSIT`(모의 결제 충전)만이다. 이 필터의 합계가
 * `GET /deposits/limit` 의 `depositedAmount`(초기 지급 제외)와 같아야 하기 때문이다.
 * `INITIAL_GRANT` 1건은 `type=ALL` 에서만 나온다.
 *
 * **`WITHDRAWAL` 은 v0.8 신설분이다**(C87). "충전"필터에는 섞이지 않는다(C83).
 */
const TRANSACTION_FILTER_LEDGER_TYPES = {
  ALL: ['INITIAL_GRANT', 'DEPOSIT', 'WITHDRAWAL', 'BUY', 'SELL'],
  BUY: ['BUY'],
  SELL: ['SELL'],
  DEPOSIT: ['DEPOSIT'],
  WITHDRAWAL: ['WITHDRAWAL'],
} as const satisfies Record<string, readonly string[]>;

type TransactionFilterValue = keyof typeof TRANSACTION_FILTER_LEDGER_TYPES;

function isTransactionFilter(value: string): value is TransactionFilterValue {
  return Object.hasOwn(TRANSACTION_FILTER_LEDGER_TYPES, value);
}

/** 주문 거절 코드의 HTTP 상태 (apiSpec §7.2 에러 표). */
const ORDER_REJECTION_STATUS: Record<string, number> = {
  [ORDER_ERROR_CODES.MARKET_CLOSED]: 409,
  [ORDER_ERROR_CODES.STOCK_SUSPENDED]: 409,
  [ORDER_ERROR_CODES.PRICE_UNAVAILABLE]: 503,
};

const ORDER_REJECTION_MESSAGE: Record<string, string> = {
  // 실 서버 `OrderErrorCode.ORDER_MARKET_CLOSED` 와 같은 문자열이어야 한다.
  // 목만 옛 시간을 말하면 화면이 어느 쪽을 그리는지 목에서 검증할 수 없다.
  [ORDER_ERROR_CODES.MARKET_CLOSED]: `지금은 주문할 수 없어요 (거래 시간 ${MARKET_HOURS_LABEL_KST})`,
  [ORDER_ERROR_CODES.STOCK_SUSPENDED]: '거래정지 종목입니다',
  [ORDER_ERROR_CODES.PRICE_UNAVAILABLE]:
    '시세를 불러올 수 없어 주문이 제한됩니다',
};

/** 커서는 불투명 문자열이다 (apiSpec §1.5). 목은 오프셋을 감싸서 쓴다. */
function encodeCursor(offset: number): string {
  return btoa(JSON.stringify({ offset }));
}

function decodeCursor(cursor: string): number | null {
  try {
    const parsed = JSON.parse(atob(cursor)) as { offset?: unknown };
    return typeof parsed.offset === 'number' ? parsed.offset : null;
  } catch {
    return null;
  }
}

export const tradingHandlers = [
  http.get(mockPath(API_PATHS.orders.available), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const stockCode = searchParam(request, 'stockCode') ?? '';
    const side = searchParam(request, 'side') ?? '';

    if (!ORDER_SIDES.includes(side)) {
      return errorResponse(
        COMMON_ERROR_CODES.INVALID_REQUEST,
        '요청 값이 올바르지 않습니다',
        400,
        { side: 'BUY 또는 SELL 이어야 합니다' },
      );
    }

    const stock = findStock(stockCode);
    if (stock === undefined) {
      return errorResponse(
        STOCK_ERROR_CODES.STOCK_NOT_FOUND,
        '종목을 찾을 수 없습니다',
        404,
      );
    }

    const holdingQuantity = findHolding(stockCode)?.quantity ?? 0;

    /* 최대 수량은 지금 가격으로 나눈 값이다. 가격이 움직이면 이 수도 함께 움직여야
       화면의 비율 버튼이 실제로 살 수 있는 수를 가리킨다. */
    const livePrice = livePriceOf(stock);

    // tradable: false 도 HTTP 200 이다 (apiSpec §7.3). 화면은 reason 으로 버튼을 잠근다.
    return HttpResponse.json({
      tradable: stock.orderRejection === null,
      reason: stock.orderRejection,
      currentPrice: livePrice,
      availableCash: store.cashBalance,
      maxQuantity:
        side === 'BUY'
          ? Math.floor(store.cashBalance / livePrice)
          : holdingQuantity,
      holdingQuantity,
    });
  }),

  http.post(mockPath(API_PATHS.orders.create), async ({ request }) => {
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

    const { stockCode, side, quantity } = body;

    if (typeof side !== 'string' || !ORDER_SIDES.includes(side)) {
      return errorResponse(
        COMMON_ERROR_CODES.INVALID_REQUEST,
        '요청 값이 올바르지 않습니다',
        400,
        { side: 'BUY 또는 SELL 이어야 합니다' },
      );
    }

    if (
      typeof quantity !== 'number' ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return errorResponse(
        ORDER_ERROR_CODES.QUANTITY_INVALID,
        '주문 수량을 확인해 주세요',
        400,
      );
    }

    const stock =
      typeof stockCode === 'string' ? findStock(stockCode) : undefined;
    if (stock === undefined) {
      return errorResponse(
        STOCK_ERROR_CODES.STOCK_NOT_FOUND,
        '종목을 찾을 수 없습니다',
        404,
      );
    }

    if (stock.orderRejection !== null) {
      return errorResponse(
        stock.orderRejection,
        ORDER_REJECTION_MESSAGE[stock.orderRejection] ?? '주문할 수 없습니다',
        ORDER_REJECTION_STATUS[stock.orderRejection] ?? 409,
      );
    }

    // 시장가라 체결가는 낸 순간의 값이다. 화면이 보여 준 `예상 주문 금액` 과
    // 조금 어긋날 수 있는 것이 정상이고, 그 어긋남 자체가 시장가의 성질이다.
    const executedPrice = livePriceOf(stock);
    const executedAmount = executedPrice * quantity;
    const holding = findHolding(stock.stockCode);

    if (side === 'BUY' && executedAmount > store.cashBalance) {
      return errorResponse(
        ORDER_ERROR_CODES.INSUFFICIENT_CASH,
        '예수금이 부족합니다',
        409,
        { required: executedAmount, available: store.cashBalance },
      );
    }

    if (
      side === 'SELL' &&
      (holding === undefined || holding.quantity < quantity)
    ) {
      return errorResponse(
        ORDER_ERROR_CODES.INSUFFICIENT_QUANTITY,
        '보유 수량이 부족합니다',
        409,
      );
    }

    const executedAt = nowKstIso();
    let realizedProfit: number | null = null;
    let realizedProfitRate: number | null = null;

    if (side === 'BUY') {
      store.cashBalance -= executedAmount;
      if (holding === undefined) {
        store.holdings.push({
          stockCode: stock.stockCode,
          quantity,
          avgBuyPrice: executedPrice,
        });
      } else {
        const totalCost =
          holding.avgBuyPrice * holding.quantity + executedAmount;
        holding.quantity += quantity;
        holding.avgBuyPrice = Math.round(totalCost / holding.quantity);
      }
    } else if (holding !== undefined) {
      store.cashBalance += executedAmount;
      realizedProfit = (executedPrice - holding.avgBuyPrice) * quantity;
      realizedProfitRate = profitRate(
        realizedProfit,
        holding.avgBuyPrice * quantity,
      );
      holding.quantity -= quantity;
      if (holding.quantity === 0) {
        store.holdings = store.holdings.filter(
          (entry) => entry.stockCode !== stock.stockCode,
        );
      }
    }

    recordTransaction({
      type: side === 'BUY' ? 'BUY' : 'SELL',
      occurredAt: executedAt,
      stockCode: stock.stockCode,
      stockName: stock.stockName,
      price: executedPrice,
      quantity,
      amount: executedAmount,
      realizedProfit,
      realizedProfitRate,
      paymentMethod: null,
    });

    const orderId = store.nextOrderId;
    store.nextOrderId += 1;

    return idempotency.commit(201, {
      orderId,
      stockCode: stock.stockCode,
      stockName: stock.stockName,
      side,
      quantity,
      executedPrice,
      executedAmount,
      executedAt,
      cashBalanceAfter: store.cashBalance,
      realizedProfit,
    });
  }),

  http.get(mockPath(API_PATHS.portfolio), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const sort = searchParam(request, 'sort') ?? 'EVALUATION';
    if (!PORTFOLIO_SORTS.includes(sort)) {
      return errorResponse(
        COMMON_ERROR_CODES.INVALID_REQUEST,
        '요청 값이 올바르지 않습니다',
        400,
        { sort: 'EVALUATION 또는 PROFIT_RATE 여야 합니다' },
      );
    }

    // 시세가 없는 종목은 평가 네 필드가 전부 null 이고 정렬에서 뒤로 간다 (apiSpec v0.8.2).
    // 목록에서 빠지지는 않는다 — 가진 주식은 시세를 모를 때에도 보여야 한다.
    const holdings = store.holdings
      .map((holding) => {
        const stock = findStock(holding.stockCode);
        const currentPrice = currentPriceOf(holding.stockCode);
        const profit =
          currentPrice === null
            ? null
            : (currentPrice - holding.avgBuyPrice) * holding.quantity;

        return {
          stockCode: holding.stockCode,
          stockName: stock?.stockName ?? holding.stockCode,
          quantity: holding.quantity,
          avgBuyPrice: holding.avgBuyPrice,
          currentPrice,
          evaluationAmount:
            currentPrice === null ? null : currentPrice * holding.quantity,
          evaluationProfit: profit,
          evaluationProfitRate:
            profit === null
              ? null
              : profitRate(profit, holding.avgBuyPrice * holding.quantity),
        };
      })
      .sort((left, right) => {
        const key =
          sort === 'PROFIT_RATE' ? 'evaluationProfitRate' : 'evaluationAmount';
        const leftValue = left[key];
        const rightValue = right[key];
        if (leftValue === null || rightValue === null) {
          // 값 없음은 언제나 마지막이다. 둘 다 없으면 원래 순서를 지킨다.
          return leftValue === rightValue ? 0 : leftValue === null ? 1 : -1;
        }
        return rightValue - leftValue;
      });

    return HttpResponse.json({
      cashBalance: store.cashBalance,
      evaluationAmount: evaluationAmount(),
      totalAsset: totalAsset(),
      asOf: nowKstIso(),
      holdings,
    });
  }),

  http.get(mockPath(API_PATHS.transactions), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const type = searchParam(request, 'type') ?? 'ALL';
    if (!isTransactionFilter(type)) {
      return errorResponse(
        COMMON_ERROR_CODES.INVALID_REQUEST,
        '요청 값이 올바르지 않습니다',
        400,
        { type: 'ALL · BUY · SELL · DEPOSIT · WITHDRAWAL 중 하나여야 합니다' },
      );
    }

    const sizeParam = searchParam(request, 'size');
    const size =
      sizeParam === null ? CURSOR_PAGE_DEFAULT_SIZE : Number(sizeParam);
    if (!Number.isInteger(size) || size < 1 || size > CURSOR_PAGE_MAX_SIZE) {
      return errorResponse(
        COMMON_ERROR_CODES.INVALID_REQUEST,
        '요청 값이 올바르지 않습니다',
        400,
        { size: `1 이상 ${CURSOR_PAGE_MAX_SIZE} 이하여야 합니다` },
      );
    }

    const cursor = searchParam(request, 'cursor');
    const offset = cursor === null || cursor === '' ? 0 : decodeCursor(cursor);
    if (offset === null) {
      return errorResponse(
        COMMON_ERROR_CODES.INVALID_REQUEST,
        '요청 값이 올바르지 않습니다',
        400,
        { cursor: '손상된 커서입니다' },
      );
    }

    const ledgerTypes: readonly string[] =
      TRANSACTION_FILTER_LEDGER_TYPES[type];
    const filtered = store.transactions.filter((entry) =>
      ledgerTypes.includes(entry.type),
    );
    const page = filtered.slice(offset, offset + size);
    const nextOffset = offset + page.length;
    const hasNext = nextOffset < filtered.length;

    return HttpResponse.json({
      items: page.map((entry) => ({
        transactionId: entry.transactionId,
        type: entry.type,
        occurredAt: entry.occurredAt,
        stockCode: entry.stockCode,
        stockName: entry.stockName,
        price: entry.price,
        quantity: entry.quantity,
        amount: entry.amount,
        realizedProfit: entry.realizedProfit,
        realizedProfitRate: entry.realizedProfitRate,
        paymentMethod: entry.paymentMethod,
      })),
      nextCursor: hasNext ? encodeCursor(nextOffset) : null,
      hasNext,
    });
  }),
];
