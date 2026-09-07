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
