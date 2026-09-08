/**
 * 온보딩을 마쳤는지 기억하는 자리.
 *
 * **서버 계약이 없어 프론트가 로컬에 둔다.** 로그인 응답의 `isNewUser`(apiSpec §2.1)는
 * "이번 로그인이 최초 가입인가" 라서, 온보딩을 건너뛴 사람이 다시 로그인하면 `false` 가
 * 되고 다시 온보딩으로 보낼 수도 없다. 반대로 가입 직후 새로고침하면 `isNewUser` 가
 * 메모리에서 사라져 온보딩이 열리지 않는다. 둘 다 이 값으로 메운다.
 *
 * `localStorage` 를 쓰는 이유는 기기를 바꾸면 다시 보여도 무해하기 때문이다.
 * 접근 토큰과 달리 새는 것이 없는 값이라 스토리지에 둔다 (컨벤션 §4).
 *
 * **서버가 온보딩 완료를 기억해 주기로 하면 이 파일을 지우고 그 값을 읽는다.**
 * 계약 원장 미확정 항목으로 올려 두었다.
 */
const STORAGE_KEY = 'finch.onboarding.done';

export function isOnboardingDone(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    // 사파리 프라이빗 모드처럼 스토리지가 막힌 환경이다. 온보딩을 한 번 더
    // 보여주는 편이 화면이 열리지 않는 것보다 낫다.
    return false;
  }
}

export function markOnboardingDone(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // 기억하지 못해도 화면은 진행한다.
  }
}
