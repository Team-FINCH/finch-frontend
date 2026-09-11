import { type Candle, type CandleInterval } from '@/shared/types/stock';

/**
 * 차트 탭의 `오늘` 격자(시가·고가·저가·거래량)가 쓸 값을 캔들 응답에서 고른다.
 *
 * **종목 상세 응답에는 이 넷이 없다** — apiSpec §5.2 는 `currentPrice`·
 * `previousClose`·`changeAmount`·`changeRate` 만 준다. 대신 캔들 응답(§5.3)의
 * 봉 하나가 `open`·`high`·`low`·`close`·`volume` 을 갖고, §5.3 "진행 중인 당일 봉"
 * 이 장중에는 마지막에 오늘 봉이 얹혀 나가며 그 값이 **현재가 응답과 같은 출처**
 * 라고 못박았다. 그래서 차트 탭이 이미 받아 둔 응답의 마지막 봉이 곧 오늘 값이다.
 * 백엔드에 필드를 새로 요청하지 않고, `GET /stocks/{stockCode}` 를 한 번 더 부르지도
 * 않는다 — 그 호출은 최근 본 종목에 기록을 남긴다 (contracts C51).
 */

const KST_DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * 지금이 KST 로 며칠인지 `YYYY-MM-DD` 로 준다. 캔들의 `date` 와 같은 모양이라
 * 문자열끼리 그대로 비교할 수 있다.
 *
 * **기기 시간대로 계산하면 안 된다.** 거래일은 KST 기준이고 봉의 `date` 도 KST 다
 * (apiSpec §5.3 "기준 시간대는 KST"). 브라우저가 다른 시간대면 자정 언저리에서
 * 하루가 어긋나 오늘 봉을 어제 것으로 읽는다.
 */
function kstToday(now: Date): string {
  const parts = KST_DATE_FORMATTER.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export type TodayQuote = {
  open: number;
  high: number;
  low: number;
  volume: number;
  /** 값이 나온 봉의 날짜 (`YYYY-MM-DD`). */
  date: string;
  /** 그 날짜가 오늘(KST)인가. 거짓이면 마지막 거래일 값이다. */
  isToday: boolean;
};

/**
 * 캔들 배열의 마지막 봉에서 `오늘` 격자 값을 뽑는다. 쓸 수 없으면 `null` 이다.
 *
 * **일봉일 때만 값을 준다.** 주봉·월봉의 마지막 봉은 §5.3 집계 규칙대로 이번 주·
 * 이번 달을 묶은 것이라(`high`·`low` 는 구간 최대·최소, `volume` 은 구간 합)
 * 하루치가 아니다. 그 값에 `오늘` 이라고 적으면 거짓말이 되고, 라벨을 `이번 주`·
 * `이번 달` 로 바꾸는 것은 프로토타입에 없는 섹션을 새로 만드는 일이다. 일봉을
 * 따로 한 번 더 받는 선택지도 있었지만 호출이 하나 느는 값어치가 없다 — 봉 종류
 * 탭은 일봉이 기본값이라 처음 들어온 사람은 항상 이 격자를 본다.
 *
 * **마지막 봉이 오늘이 아닐 수 있다.** §5.3 이 "시세를 모르면 얹지 않는다 …
 * 프론트는 마지막 봉이 오늘이라고 가정하지 않는다" 고 적었다 — 장 전(KIS 가
 * 시가·고가·저가를 `0` 으로 주는 구간)·휴장일·캐시 미스가 그 경우다. 그때는
 * 값이 비는 것이 아니라 **어제(또는 마지막 거래일) 봉이 마지막에 있다.** 그래서
 * 값을 감추지 않고 `isToday: false` 로 넘겨 부르는 쪽이 제목을 바꾸게 한다.
 * 값을 버리면 장 열기 전에는 격자가 통째로 사라지는데, 그 시간대에도 마지막
 * 거래일 시세는 볼 값어치가 있다.
 *
 * 봉 자체가 없을 때만(빈 배열) `null` 이다. 칸을 `—` 로 채우는 분기는 두지 않았다 —
 * `CandleSchema` 의 네 값은 전부 필수라 일부만 비어서 오는 경우가 없다. 봉이 오면
 * 넷이 다 오고, 안 오면 봉 자체가 없다.
 */
export function selectTodayQuote(
  candles: readonly Candle[],
  interval: CandleInterval,
  now: Date = new Date(),
): TodayQuote | null {
  if (interval !== 'DAY') {
    return null;
  }

  // 캔들은 과거에서 현재 순이다 (lightweight-charts 의 `setData` 도 오름차순을
  // 요구해 `CandleChart` 가 그대로 넘긴다). 마지막 원소가 가장 최근 봉이다.
  const last = candles.at(-1);
  if (last === undefined) {
    return null;
  }

  return {
    open: last.open,
    high: last.high,
    low: last.low,
    volume: last.volume,
    date: last.date,
    isToday: last.date === kstToday(now),
  };
}

/** `2026-09-10` → `09.10`. 이미 `YYYY-MM-DD` 라 `Date` 를 거치지 않는다 — 거치면 시간대 변환이 끼어든다. */
export function formatCandleMonthDay(date: string): string {
  return `${date.slice(5, 7)}.${date.slice(8, 10)}`;
}
