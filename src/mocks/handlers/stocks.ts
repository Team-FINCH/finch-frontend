import { http, HttpResponse } from 'msw';

import {
  API_PATHS,
  STOCK_PRICES_MAX_CODES,
  STOCK_SEARCH_MIN_KEYWORD_LENGTH,
} from '@/shared/config/apiContract';
import { CandleIntervalSchema } from '@/shared/types/candleInterval';
import {
  COMMON_ERROR_CODES,
  STOCK_ERROR_CODES,
} from '@/shared/types/errorCodes';
import { CandlePeriodSchema } from '@/shared/types/stock';

import {
  ACTIVE_MOCK_STOCKS,
  findActiveStock,
  findStock,
  toStockQuote,
  toStockSummary,
} from '../lib/catalog';
import { errorResponse, mockPath, searchParam } from '../lib/http';
import { requireAuth } from '../lib/session';
import {
  findHolding,
  store,
  touchRecentSearchKeyword,
  touchRecentStock,
} from '../lib/store';
import { nowKstIso, toKstDateString } from '../lib/time';
import { currentPriceOf, profitRate } from '../lib/valuation';

/**
 * 종목 조회 · 검색 · 차트 · 시세 (apiSpec §5).
 *
 * **상태 유지 범위** — 종목 카탈로그는 고정이고 바뀌지 않는다. 상태를 건드리는 것은 둘이다.
 * `GET /stocks/{stockCode}` 호출이 최근 본 종목을, `GET /stocks/search` 호출이 최근 검색어를
 * 갱신한다. **둘 다 별도 등록 API 가 없어 조회 자체가 기록이다** (contracts C51 · apiSpec §6.2).
 * 두 목록의 목은 `handlers/recent.ts` 에 있다.
 *
 * ## 어느 입력이 어느 응답을 내는가
 *
 * | 입력 | 응답 |
 * | --- | --- |
 * | 카탈로그에 없는 종목코드 | `404 STOCK_NOT_FOUND` |
 * | `keyword` 2글자 미만 · `period`·`interval` 열거값 밖 · `stockCodes` 누락이나 50건 초과 | `400 INVALID_REQUEST` |
 * | `036570`(엔씨소프트) | `suspended: true` — 뱃지와 주문 차단 렌더 |
 * | `010950`(에스오일) | `stale: true` + 마지막 수신 값 유지 |
 * | `900140`(엘브이엠씨홀딩스) | `stale: true` + 가격 3필드와 `asOf` 가 전부 `null` |
 *
 * 시세 없음은 에러가 아니다 (apiSpec §11.2) — 위 두 종목이 그 두 상태를 재현한다.
 */

/**
 * 일봉 개수. 넉넉히 둔다 — 확대/축소가 이번에 들어갔는데 일봉이 몇십 개뿐이면
 * 줌아웃했을 때 볼 것이 없어 기능 확인이 안 된다. 1000개면 대략 2.7년치라
 * 주봉으로 묶어도 100개 이상, 월봉으로 묶어도 30개 안팎이 남는다.
 */
const BASE_DAILY_COUNT = 1000;

type MockCandle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

/**
 * 결정적 의사난수. 같은 종목이면 항상 같은 일봉 시계열이 나온다 — 봉 종류가
 * 바뀌어도(주봉·월봉은 이 일봉을 묶어 만들므로) 시드가 같다. 새로고침할 때마다
 * 캔들이 요동치면 차트 렌더 문제인지 데이터 문제인지 가릴 수 없다.
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/** 일봉 시계열 하나를 만든다. 과거로 거슬러 올라가며 마지막 종가를 현재가에 맞춘다. */
function buildDailyCandles(stockCode: string, lastClose: number): MockCandle[] {
  const random = seededRandom(Number(stockCode) + BASE_DAILY_COUNT);

  const closes: number[] = [lastClose];
  for (let index = 1; index < BASE_DAILY_COUNT; index += 1) {
    const previous = closes[0] ?? lastClose;
    const drift = (random() - 0.48) * 0.03;
    closes.unshift(Math.max(100, Math.round(previous * (1 - drift))));
  }

  const dayMs = 24 * 60 * 60 * 1000;
  return closes.map((close, index) => {
    const open = Math.round(close * (1 + (random() - 0.5) * 0.012));
    const high = Math.max(open, close) + Math.round(close * random() * 0.008);
    const low = Math.min(open, close) - Math.round(close * random() * 0.008);
    // 주말을 건너뛰지 않는다. 목 차트의 목적은 렌더 확인이지 거래일 달력이 아니다.
    const date = new Date(Date.now() - (BASE_DAILY_COUNT - 1 - index) * dayMs);

    return {
      date: toKstDateString(date),
      open,
      high,
      low,
      close,
      volume: 1_000_000 + Math.round(random() * 20_000_000),
    };
  });
}

/** 그 주의 월요일 날짜(`YYYY-MM-DD`)를 그룹 키로 쓴다. */
function weekKey(date: string): string {
  const monday = new Date(`${date}T00:00:00Z`);
  const dayOfWeek = monday.getUTCDay(); // 0=일 .. 6=토
  monday.setUTCDate(monday.getUTCDate() - ((dayOfWeek + 6) % 7));
  return toKstDateString(monday);
}

/** 그 달(`YYYY-MM`)을 그룹 키로 쓴다. */
function monthKey(date: string): string {
  return date.slice(0, 7);
}

/**
 * 일봉을 봉 하나로 묶는다. 난수를 따로 굴려 주봉·월봉을 새로 만들지 않는다 —
 * 그러면 같은 종목인데 봉마다 시가·종가·고저가 서로 다른 이야기를 하게 된다.
 * 시가는 그룹의 첫 일봉, 종가는 마지막 일봉 값이고, 고가·저가는 그룹 안 최대·
 * 최소, 거래량은 합이다 — 실제 봉 집계와 같은 규칙이다.
 */
function aggregateCandles(
  daily: readonly MockCandle[],
  keyOf: (date: string) => string,
): MockCandle[] {
  const groups = new Map<string, MockCandle[]>();
  for (const candle of daily) {
    const key = keyOf(candle.date);
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, [candle]);
    } else {
      group.push(candle);
    }
  }

  // `Map` 은 삽입 순서를 지킨다. `daily` 를 과거→현재 순으로 순회했으니 그룹도
  // 같은 순서로 나온다 — lightweight-charts 가 요구하는 오름차순 그대로다.
  return [...groups.values()].map((group) => {
    const first = group[0];
    const last = group[group.length - 1];
    // `first`·`last` 는 그룹에 최소 한 원소가 있어야만 만들어지므로 항상 존재한다.
    if (first === undefined || last === undefined) {
      throw new Error('빈 캔들 그룹은 만들어지지 않는다');
    }
    return {
      date: first.date,
      open: first.open,
      close: last.close,
      high: Math.max(...group.map((candle) => candle.high)),
      low: Math.min(...group.map((candle) => candle.low)),
      volume: group.reduce((sum, candle) => sum + candle.volume, 0),
    };
  });
}

/**
 * `period` 는 무시하고 `interval` 별 전량을 준다 — 보이는 범위는 확대/축소가
 * 맡으므로 `period`(1M·3M·1Y·3Y)로 서버 쪽에서 잘라 줄 이유가 없다. `period` 는
 * 응답 봉투에만 그대로 실어 돌려준다(apiSpec §5.3 v0.8.4 계약 유지).
 */
function buildCandles(
  stockCode: string,
  interval: string,
  lastClose: number,
): MockCandle[] {
  const daily = buildDailyCandles(stockCode, lastClose);
  if (interval === 'WEEK') {
    return aggregateCandles(daily, weekKey);
  }
  if (interval === 'MONTH') {
    return aggregateCandles(daily, monthKey);
  }
  return daily;
}

export const stockHandlers = [
  // 고정 경로가 `/stocks/{stockCode}` 보다 먼저 와야 한다. 순서가 뒤집히면
  // `/stocks/search` 가 종목코드 `search` 로 잡힌다.
  http.get(mockPath(API_PATHS.stocks.search), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const keyword = searchParam(request, 'keyword') ?? '';
    if (keyword.length < STOCK_SEARCH_MIN_KEYWORD_LENGTH) {
      return errorResponse(
        COMMON_ERROR_CODES.INVALID_REQUEST,
        '검색어를 두 글자 이상 입력해 주세요',
        400,
        { keyword: `${STOCK_SEARCH_MIN_KEYWORD_LENGTH}글자 이상이어야 합니다` },
      );
    }

    const sizeParam = searchParam(request, 'size');
    const size = sizeParam === null ? 10 : Number(sizeParam);
    if (!Number.isInteger(size) || size < 1 || size > 100) {
      return errorResponse(
        COMMON_ERROR_CODES.INVALID_REQUEST,
        '요청 값이 올바르지 않습니다',
        400,
        { size: '1 이상 100 이하여야 합니다' },
      );
    }

    /*
     * **검색 성공이 최근 검색어에 기록을 남긴다** (apiSpec §6.2 — 등록 API 가 없다).
     * 결과가 0건이어도 기록한다 — 저장되는 것은 종목이 아니라 사용자가 입력한 문자열이다.
     * 검증 실패(`INVALID_REQUEST`)는 검색이 실행되지 않은 것이라 기록하지 않는다.
     */
    touchRecentSearchKeyword(keyword);

    // 상장폐지 종목은 검색 결과에서 빠진다 (계약 C77 · 백엔드 is_active 조건).
    const items = ACTIVE_MOCK_STOCKS.filter(
      (stock) =>
        stock.stockName.includes(keyword) || stock.stockCode.includes(keyword),
    )
      .slice(0, size)
      .map(toStockSummary);

    return HttpResponse.json({ items });
  }),

  http.get(mockPath(API_PATHS.stocks.prices), ({ request }) => {
    const unauthorized = requireAuth(request);
    if (unauthorized !== null) {
      return unauthorized;
    }

    const raw = searchParam(request, 'stockCodes');
    const stockCodes =
      raw === null ? [] : raw.split(',').filter((code) => code !== '');

    if (stockCodes.length === 0 || stockCodes.length > STOCK_PRICES_MAX_CODES) {
      return errorResponse(
        COMMON_ERROR_CODES.INVALID_REQUEST,
        '요청 값이 올바르지 않습니다',
        400,
        { stockCodes: `1건 이상 ${STOCK_PRICES_MAX_CODES}건 이하여야 합니다` },
      );
    }

    // 존재하지 않는 코드는 items 에서 빼고 전체를 실패시키지 않는다 (apiSpec §5.5).
    const items = stockCodes
      .map((stockCode) => findStock(stockCode))
      .filter((stock) => stock !== undefined)
      .map(toStockQuote);

    return HttpResponse.json({ items });
  }),

  http.get(
    mockPath(API_PATHS.stocks.candles(':stockCode')),
    ({ request, params }) => {
      const unauthorized = requireAuth(request);
      if (unauthorized !== null) {
        return unauthorized;
      }

      const stockCode = String(params.stockCode);
      // 상장폐지 종목은 상세에서도 없는 종목이다 (계약 C94).
      const stock = findActiveStock(stockCode);
      if (stock === undefined) {
        return errorResponse(
          STOCK_ERROR_CODES.STOCK_NOT_FOUND,
          '종목을 찾을 수 없습니다',
          404,
        );
      }

      // `period`·`interval` 은 apiSpec §5.3(v0.8.4 확정 · 이슈 #37 회신) 그대로
      // 검증한다 — 둘 다 선택 파라미터라 값이 없으면 각 기본값(`1M`·`DAY`)으로
      // 떨어진다. `interval` 값 자체는 `@/shared/types/candleInterval.ts` 한
      // 곳에서만 정의한다. 여기서는 그 스키마로만 검증한다.
      const period = searchParam(request, 'period') ?? '1M';
      const periodValid = (
        CandlePeriodSchema.options as readonly string[]
      ).includes(period);

      const interval = searchParam(request, 'interval') ?? 'DAY';
      const intervalValid = (
        CandleIntervalSchema.options as readonly string[]
      ).includes(interval);

      // `interval` 의 `detail` 모양은 회신 그대로 고정 문구다 — 값 목록을 나열하지
      // 않는다. `period` 는 apiSpec 이 그 문구를 못박지 않아 값 목록을 그대로 둔다.
      if (!periodValid || !intervalValid) {
        return errorResponse(
          COMMON_ERROR_CODES.INVALID_REQUEST,
          '요청 값이 올바르지 않습니다',
          400,
          {
            ...(periodValid
              ? {}
              : { period: '1M · 3M · 1Y · 3Y 중 하나여야 합니다' }),
            ...(intervalValid ? {} : { interval: '형식이 올바르지 않습니다' }),
          },
        );
      }

      return HttpResponse.json({
        stockCode,
        period,
        interval,
        candles: buildCandles(stockCode, interval, stock.currentPrice),
      });
    },
  ),

  http.get(
    mockPath(API_PATHS.stocks.price(':stockCode')),
    ({ request, params }) => {
      const unauthorized = requireAuth(request);
      if (unauthorized !== null) {
        return unauthorized;
      }

      const stock = findStock(String(params.stockCode));
      if (stock === undefined) {
        return errorResponse(
          STOCK_ERROR_CODES.STOCK_NOT_FOUND,
          '종목을 찾을 수 없습니다',
          404,
        );
      }

      return HttpResponse.json(toStockQuote(stock));
    },
  ),

  http.get(
    mockPath(API_PATHS.stocks.detail(':stockCode')),
    ({ request, params }) => {
      const unauthorized = requireAuth(request);
      if (unauthorized !== null) {
        return unauthorized;
      }

      const stockCode = String(params.stockCode);
      // 상장폐지 종목은 상세에서도 없는 종목이다 (계약 C94).
      const stock = findActiveStock(stockCode);
      if (stock === undefined) {
        return errorResponse(
          STOCK_ERROR_CODES.STOCK_NOT_FOUND,
          '종목을 찾을 수 없습니다',
          404,
        );
      }

      // 이 호출 자체가 최근 본 종목 기록이다 (contracts C51).
      touchRecentStock(stockCode);

      const holding = findHolding(stockCode);
      // 현재가를 모르면 평가 두 필드가 null 이다 (apiSpec v0.8.2 · 보유 목록 §8.1 과 같은 규칙).
      // quantity·avgBuyPrice 는 그때에도 나간다.
      const holdingPrice = currentPriceOf(stockCode);
      const evaluationProfit =
        holding === undefined || holdingPrice === null
          ? null
          : (holdingPrice - holding.avgBuyPrice) * holding.quantity;

      return HttpResponse.json({
        stockCode: stock.stockCode,
        stockName: stock.stockName,
        market: stock.market,
        currentPrice: stock.currentPrice,
        previousClose: stock.previousClose,
        changeAmount: stock.currentPrice - stock.previousClose,
        changeRate:
          Math.round(
            ((stock.currentPrice - stock.previousClose) / stock.previousClose) *
              10000,
          ) / 100,
        suspended: stock.suspended,
        suspendedReason: stock.suspendedReason,
        watched: store.watchlist.some((entry) => entry.stockCode === stockCode),
        asOf: nowKstIso(),
        holding:
          holding === undefined
            ? null
            : {
                quantity: holding.quantity,
                avgBuyPrice: holding.avgBuyPrice,
                evaluationProfit,
                evaluationProfitRate:
                  evaluationProfit === null
                    ? null
                    : profitRate(
                        evaluationProfit,
                        holding.avgBuyPrice * holding.quantity,
                      ),
              },
      });
    },
  ),
];
