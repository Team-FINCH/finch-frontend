/**
 * 목 응답의 시각 표기. **ISO 8601 + KST 오프셋이다** (apiSpec §1.1 · contracts C16).
 *
 * `Date.prototype.toISOString()` 은 `Z` 로 끝나 백엔드가 실제로 주는 표기와 다르다.
 * 목이 `Z` 를 주면 화면이 `Z` 를 전제로 만들어지고, 실제 백엔드에 붙일 때 조용히 어긋난다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** `2026-08-20T14:30:00+09:00` */
export function toKstIsoString(date: Date): string {
  const shifted = new Date(date.getTime() + KST_OFFSET_MS);
  return `${shifted.toISOString().slice(0, 19)}+09:00`;
}

/** `2026-08-20` — 캔들·브리핑처럼 날짜만 쓰는 자리 (apiSpec §5.3 · AI 명세 §8). */
export function toKstDateString(date: Date): string {
  const shifted = new Date(date.getTime() + KST_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
}

/** 지금 시각을 KST 표기로 준다. */
export function nowKstIso(): string {
  return toKstIsoString(new Date());
}

/** `days` 일 전 자정 기준 KST 날짜. 캔들 생성에 쓴다. */
export function kstDateStringDaysAgo(days: number): string {
  return toKstDateString(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}

/**
 * 가장 최근에 마감한 거래일의 15:30 을 KST 표기로 준다. AI 가 `dataAsOf.price` 에
 * 보내는 값이다(`ai/app/api/routes/portfolio.py` `_as_datetime` — 스냅샷 기준일 + 15:30).
 *
 * 오늘 15:30 전이면 오늘은 아직 종가가 없어 하루 전에서 시작하고, 주말이면 금요일로
 * 물린다. 공휴일은 따지지 않는다 — 목이라 그 정확도는 필요 없다.
 *
 * **`nowKstIso()` 를 쓰지 않는 이유.** 서버가 종가로 확정해 보내는 자리에 지금 시각을 넣으면
 * 목이 계약보다 관대해져, `09.29 14:37 종가 기준` 처럼 어색한 모습이 dev 에서는 나오지 않고
 * 운영에 붙인 뒤에야 드러난다. 화면이 깨지는 문제가 아니라 볼 수 없는 것이 문제라 목을
 * 서버에 맞춘다(입금 목 `checkoutUrl` 과 같은 판단).
 */
export function lastCloseKstIso(): string {
  const kstNow = new Date(Date.now() + KST_OFFSET_MS);
  const minutes = kstNow.getUTCHours() * 60 + kstNow.getUTCMinutes();
  const day = new Date(kstNow);
  day.setUTCHours(0, 0, 0, 0);
  if (minutes < 15 * 60 + 30) day.setUTCDate(day.getUTCDate() - 1);
  while (day.getUTCDay() === 0 || day.getUTCDay() === 6) {
    day.setUTCDate(day.getUTCDate() - 1);
  }
  return `${day.toISOString().slice(0, 10)}T15:30:00+09:00`;
}
