import { http, HttpResponse } from 'msw';

import { API_PATHS, WATCHLIST_MAX_COUNT } from '@/shared/config/apiContract';
import {
  COMMON_ERROR_CODES,
  STOCK_ERROR_CODES,
} from '@/shared/types/errorCodes';

import { changeAmountOf, changeRateOf, findActiveStock } from '../lib/catalog';
import {
  errorResponse,
  mockPath,
  readJsonBody,
  searchParam,
} from '../lib/http';
import { requireAuth } from '../lib/session';
import { findHolding, store } from '../lib/store';
import { nowKstIso } from '../lib/time';

/**
 * 관심 종목 (apiSpec §6.3).
 *
 * **상태 유지 범위** — 목록이 `lib/store.ts` 의 모듈 변수다. 추가·삭제가 실제로 반영돼
 * 종목 상세의 `watched` 토글과 이어진다. 새로고침하면 초기 3건으로 돌아간다.
 *
 * ## 어느 입력이 어느 응답을 내는가
 *
 * | 입력 | 응답 |
 * | --- | --- |
 * | `sort` 열거값 밖 | `400 INVALID_REQUEST` |
 * | 카탈로그에 없는 종목코드 | `404 STOCK_NOT_FOUND` |
 * | 이미 등록된 종목 | `409 WATCHLIST_ALREADY_EXISTS` |
 * | `068270`(셀트리온) 추가 | `409 WATCHLIST_LIMIT_EXCEEDED` — 아래 이유 참고 |
 * | `DELETE /watchlist/{stockCode}` | 대상이 없어도 `204` (멱등) |
 *
 * 판정 순서는 apiSpec §11.2 다 — 종목 존재 → 중복 → 한도.
 *
 * 한도 초과를 목 상태로 재현하려면 50건을 채워야 하는데, 그러면 목록 화면이 처음부터
 * 50줄이라 평상시 렌더를 볼 수 없다. 그래서 **전용 종목 한 개**로 그 갈래만 연다.
 */

/** 이 종목을 추가하면 항상 `WATCHLIST_LIMIT_EXCEEDED` 다. 한도 문구 렌더 확인용이다. */
const WATCHLIST_LIMIT_DEMO_STOCK_CODE = '068270';

const WATCHLIST_SORTS = ['REGISTERED', 'NAME', 'CHANGE_RATE'];

export const watchlistHandlers = [
  http.get(mockPath(API_PATHS.watchlist.list), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const sort = searchParam(request, 'sort') ?? 'REGISTERED';
    if (!WATCHLIST_SORTS.includes(sort)) {
      return errorResponse(
        COMMON_ERROR_CODES.INVALID_REQUEST,
        '요청 값이 올바르지 않습니다',
        400,
        { sort: 'REGISTERED · NAME · CHANGE_RATE 중 하나여야 합니다' },
      );
    }

    /*
     * **상장폐지 종목은 목록에서 빠지고 한도 계산에도 안 들어간다** (계약 C94,
     * 백엔드 MR !107 커밋 `ed003ce`). 목록에 남기면 탭했을 때 404 가 나고,
     * 목록만 거르고 한도는 전체 행을 세면 "47/50 인데 왜 못 담지" 가 된다.
     * 등록 행 자체는 지우지 않는다 — 재상장되면 목록과 한도에 함께 돌아온다.
     */
    // `quoteState: 'missing'` 이면 가격 셋이 `null` 이다 — `toStockSummary` 와 같은
    // 규칙이고 근거도 같다 (apiSpec §5.4 셋째 행). `900140`(엘브이엠씨홀딩스)이 이
    // 상태의 유일한 픽스처라, 여기서 놓치면 관심 목록에서는 시세 없음 화면을
    // 한 번도 재현하지 못한다 (FINCH-265).
    const items = store.watchlist
      .map((entry) => {
        const stock = findActiveStock(entry.stockCode);
        if (stock === undefined) {
          return null;
        }
        const missing = stock.quoteState === 'missing';
        return {
          stockCode: stock.stockCode,
          stockName: stock.stockName,
          currentPrice: missing ? null : stock.currentPrice,
          changeAmount: missing ? null : changeAmountOf(stock),
          changeRate: missing ? null : changeRateOf(stock),
          held: findHolding(stock.stockCode) !== undefined,
          registeredAt: entry.registeredAt,
        };
      })
      .filter((item) => item !== null);

    if (sort === 'NAME') {
      items.sort((left, right) =>
        left.stockName.localeCompare(right.stockName),
      );
    }
    if (sort === 'CHANGE_RATE') {
      // 시세 없음(`changeRate: null`)은 0% 가 아니다 — 등락 중간에 끼워 넣지 않고
      // 정렬 방향과 무관하게 항상 맨 뒤로 보낸다 (FINCH-265).
      items.sort((left, right) => {
        if (left.changeRate === null) {
          return right.changeRate === null ? 0 : 1;
        }
        if (right.changeRate === null) {
          return -1;
        }
        return right.changeRate - left.changeRate;
      });
    }

    return HttpResponse.json({
      count: items.length,
      maxCount: WATCHLIST_MAX_COUNT,
      items,
    });
  }),

  http.post(mockPath(API_PATHS.watchlist.list), async ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const body = await readJsonBody(request);
    const stockCode = body?.stockCode;

    // 영문자를 허용하는 이유는 `StockCodeSchema` 주석에 있다 (FINCH-255) —
    // 우선주·전환우선주 코드에 문자가 섞인다(`02826K`). 목이 숫자만 받으면
    // 실제 백엔드에서는 되는 요청이 여기서만 400 이 된다.
    if (typeof stockCode !== 'string' || !/^[0-9A-Z]{6}$/.test(stockCode)) {
      return errorResponse(
        COMMON_ERROR_CODES.INVALID_REQUEST,
        '요청 값이 올바르지 않습니다',
        400,
        { stockCode: '6자리 문자열이어야 합니다' },
      );
    }

    if (findActiveStock(stockCode) === undefined) {
      return errorResponse(
        STOCK_ERROR_CODES.STOCK_NOT_FOUND,
        '종목을 찾을 수 없습니다',
        404,
      );
    }

    if (store.watchlist.some((entry) => entry.stockCode === stockCode)) {
      return errorResponse(
        STOCK_ERROR_CODES.WATCHLIST_ALREADY_EXISTS,
        '이미 관심 종목에 있어요',
        409,
      );
    }

    if (stockCode === WATCHLIST_LIMIT_DEMO_STOCK_CODE) {
      return errorResponse(
        STOCK_ERROR_CODES.WATCHLIST_LIMIT_EXCEEDED,
        `관심 종목은 최대 ${WATCHLIST_MAX_COUNT}개까지 등록할 수 있어요`,
        409,
      );
    }

    store.watchlist.push({ stockCode, registeredAt: nowKstIso() });

    // 명세가 `201 Created` 만 적고 응답 본문을 정의하지 않았다 (apiSpec §6.3).
    // 본문을 지어내면 계약처럼 굳으므로 비워 둔다. 화면은 목록을 재조회한다.
    return new HttpResponse(null, { status: 201 });
  }),

  http.delete(
    mockPath(API_PATHS.watchlist.remove(':stockCode')),
    ({ request, params }) => {
      const unauthorized = requireAuth(request);
      if (unauthorized !== null) {
        return unauthorized;
      }

      const stockCode = String(params.stockCode);
      store.watchlist = store.watchlist.filter(
        (entry) => entry.stockCode !== stockCode,
      );

      return new HttpResponse(null, { status: 204 });
    },
  ),
];
