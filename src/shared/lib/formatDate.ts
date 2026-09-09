/**
 * 날짜 포매터 (컨벤션 §6).
 * 서버는 ISO 8601 로 주고 화면은 KST 로 표시한다.
 */

const KST_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/** ISO 8601 문자열을 KST 시:분:초로 표시한다. */
export function formatKstTime(isoString: string): string {
  return KST_TIME_FORMATTER.format(new Date(isoString));
}

const KST_SHORT_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * ISO 8601 문자열을 KST 시:분으로 표시한다. `09:00`
 *
 * 기준 시각 표기가 이 형식이다 (프로토타입 `clock`·`asOf`). 초까지 적으면
 * (`09:00:00`) 시세가 초 단위로 갱신되는 것처럼 읽히는데 실제 갱신 주기는 그것보다
 * 길다. 초가 필요한 자리는 `formatKstTime` 을 쓴다.
 */
export function formatKstShortTime(isoString: string): string {
  return KST_SHORT_TIME_FORMATTER.format(new Date(isoString));
}

const KST_DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** ISO 8601 문자열을 KST 연.월.일로 표시한다. `2026.08.14` */
export function formatKstDate(isoString: string): string {
  const parts = KST_DATE_FORMATTER.formatToParts(new Date(isoString));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}.${get('month')}.${get('day')}`;
}

const KST_MONTH_DAY_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: '2-digit',
  day: '2-digit',
});

/** ISO 8601 문자열을 KST 월.일로 표시한다. `08.14` — 매매 내역의 날짜 그룹 헤더가 쓴다. */
export function formatKstMonthDay(isoString: string): string {
  const parts = KST_MONTH_DAY_FORMATTER.formatToParts(new Date(isoString));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${get('month')}.${get('day')}`;
}

/**
 * ISO 8601 문자열을 KST 월.일 시:분으로 표시한다. `08.28 09:00`
 *
 * 홈 총자산과 AI 분석의 기준 시각이 이 형식이다 (프로토타입 `asOf`).
 * 날짜를 빼면 어제 값인지 오늘 값인지 알 수 없다 — 장이 닫힌 뒤에도 화면에
 * 남아 있는 값이라 시:분만으로는 언제 것인지 가려지지 않는다.
 */
export function formatKstMonthDayTime(isoString: string): string {
  return `${formatKstMonthDay(isoString)} ${formatKstShortTime(isoString)}`;
}
