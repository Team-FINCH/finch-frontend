import { formatKstDate, formatKstMonthDay } from '@/shared/lib/formatDate';

/**
 * 알림함 한 줄의 날짜 표기 (프로토타입 알림함 `m.when`).
 *
 * 프로토타입은 `오늘`·`어제` 둘만 보여 준다. **그 너머는 프로토타입에 없어 우리가
 * 정했다** — 이틀 이상 지난 것은 `09.06` 처럼 월.일로 적는다.
 *
 * ## `3일 전`·`30일 전` 이 아니라 월.일인 이유
 *
 * 알림함 `record` 항목의 `createdAt` 은 **그 매수의 체결 시각**이고(apiSpec §6.4),
 * 항목은 이유를 적기 전까지 사라지지 않는다. 보유 종목 수만큼만 쌓이지만 **오래된
 * 항목이 실제로 남는다** — 한 달 전에 사고 아직 안 적은 종목이 그대로 있다.
 *
 * 그 자리에서 `30일 전` 은 두 가지를 못 한다. 언제 샀는지로 되돌리려면 사용자가 직접
 * 세어야 하고, 같은 종목의 매매 내역(`08.27`)·위키 논지(`08.29`)와 대조가 안 된다 —
 * 이 화면들이 전부 월.일로 적는다(프로토타입 `tx`·`facts`). 날짜가 그대로 보이면
 * "그때 산 것" 을 매매 내역에서 바로 찾을 수 있다.
 *
 * `오늘`·`어제` 만 상대로 두는 것은 그 둘이 세지 않아도 읽히기 때문이다. `2일 전`
 * 부터는 이미 한 번 계산해야 해서 날짜를 그냥 보여 주는 것보다 나을 것이 없다.
 *
 * 해가 바뀐 항목은 `2025.09.06` 으로 연도까지 적는다. 월.일만 적으면 열두 달 전
 * 것이 이번 달 것과 구분되지 않는다.
 *
 * ## KST 로 가른다
 *
 * "오늘" 은 기기 시간대가 아니라 KST 기준이다(컨벤션 §6 — 서버는 ISO 8601 로 주고
 * 화면은 KST 로 표시한다). 날짜 문자열끼리 비교하는 이유가 그것이다 — `Date` 의
 * `getDate()` 는 기기 시간대를 따라가서 해외에서 열면 하루가 어긋난다.
 *
 * ## 자리가 `features/inbox/lib` 인 이유
 *
 * 지금 이 표기를 쓰는 화면이 알림함뿐이다(컨벤션 §"디렉토리 책임" — 그 기능의 순수
 * 함수). 다른 화면이 같은 상대 표기를 쓰게 되면 `shared/lib/formatDate.ts` 로 옮긴다.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

export function formatInboxWhen(
  isoString: string,
  now: Date = new Date(),
): string {
  const target = formatKstDate(isoString);
  const today = formatKstDate(now.toISOString());

  if (target === today) {
    return '오늘';
  }
  if (
    target === formatKstDate(new Date(now.getTime() - DAY_MS).toISOString())
  ) {
    return '어제';
  }
  if (target.slice(0, 4) !== today.slice(0, 4)) {
    return target;
  }
  return formatKstMonthDay(isoString);
}
