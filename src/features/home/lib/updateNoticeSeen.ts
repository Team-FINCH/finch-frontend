/**
 * 서비스 갱신 규칙 안내를 오늘 이미 봤는지 기억하는 자리 (FINCH-262).
 *
 * **서버 계약이 없어 프론트가 로컬에 둔다.** 온보딩 완료 표시
 * (`features/onboarding/lib/onboardingDone`)와 같은 성격이고, 같은 이유로
 * `localStorage` 다 — 기기를 바꾸면 다시 보여도 무해한 값이고 새어도 잃을 것이 없다
 * (컨벤션 §4 는 접근 토큰만 스토리지에서 막는다).
 *
 * **`true` 가 아니라 날짜를 적는다.** 불리언으로 두면 "다시 보지 않기" 가 영구
 * 해제가 되어 규칙이 바뀌어도 다시 알릴 방법이 없다. 날짜를 적으면 다음 날 저절로
 * 다시 뜬다 — 발표 당일에 처음 여는 사람도 규칙을 한 번은 본다.
 *
 * **KST 로 끊는다.** `toISOString()` 은 UTC 라 한국 시간 자정~오전 9시 사이에
 * 어제 날짜를 돌려준다. 그 구간에 앱을 열면 어제 닫은 안내가 다시 뜨거나(오늘로
 * 넘어갔는데 어제로 읽혀서) 오늘 것이 안 뜬다. 장 시간을 말하는 안내가 날짜를
 * 한국 시간으로 세지 않으면 앞뒤가 맞지 않는다.
 */

const STORAGE_KEY = 'finch.updateNotice.lastSeenOn';

/**
 * 오늘 날짜를 `YYYY-MM-DD` 로 (Asia/Seoul).
 *
 * `en-CA` 로케일을 고르는 이유는 그 로케일의 기본 날짜 표기가 정확히
 * `YYYY-MM-DD` 라서다. `sv-SE` 도 같은 모양이고, 직접 조각을 잘라 붙이는 것보다
 * `timeZone` 옵션 하나로 끝나는 쪽이 실수할 자리가 적다.
 */
function todayInKst(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
  }).format(new Date());
}

/** 오늘 이미 닫았으면 `true`. 읽을 수 없는 환경이면 `false` — 한 번 더 보여준다. */
export function isUpdateNoticeSeenToday(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === todayInKst();
  } catch {
    // 사파리 프라이빗 모드처럼 스토리지가 막힌 환경이다. 안내를 한 번 더 보여주는
    // 편이, 기억하지 못한다는 이유로 화면이 멈추는 것보다 낫다.
    return false;
  }
}

/** 오늘은 그만 보겠다고 표시한다. 기억하지 못해도 화면은 그대로 진행한다. */
export function markUpdateNoticeSeenToday(): void {
  try {
    localStorage.setItem(STORAGE_KEY, todayInKst());
  } catch {
    // 기억하지 못하면 다음 진입에 한 번 더 뜬다. 그것이 이 실패의 전부다.
  }
}
