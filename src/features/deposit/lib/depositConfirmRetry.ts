import { isHttpError } from '@/shared/api';
import { DEPOSIT_ERROR_CODES } from '@/shared/types/errorCodes';

/**
 * 같은 건을 **다시 확정해도 소용없는** 코드. 이 둘만 재시도를 막는다.
 *
 * 근거는 백엔드 `DepositService.confirm` 이다 —
 * `DepositService.java:240`(`AMOUNT_MISMATCH`) 과 `:247`(`LIMIT_EXCEEDED`) 이
 * 던지기 전에 `payment.fail(...)` 로 건을 닫는다. 닫힌 건은 다음 호출에서
 * `FAILED` 분기에 걸려 `DEPOSIT_PAYMENT_FAILED` 로 떨어질 뿐 절대 성공하지 않는다.
 * 그래서 이 둘에는 재시도 버튼을 만들지 않고 입금 화면으로만 보낸다.
 */
const NON_RETRYABLE_DEPOSIT_CONFIRM_CODES: readonly string[] = [
  DEPOSIT_ERROR_CODES.AMOUNT_MISMATCH,
  DEPOSIT_ERROR_CODES.LIMIT_EXCEEDED,
];

/**
 * 확정(`confirm`) 실패에 `다시 시도` 를 낼지 판정한다. 이슈 #54 회신(2026-09-11)
 * 「다」가 정한 갈래다 — **한도 초과·금액 불일치는 `입금 화면으로` 단독, 그 밖은
 * `다시 시도` + `홈으로`.**
 *
 * 재시도가 안전한 이유는 `confirm` 이 멱등이기 때문이다 —
 * `DepositService.java:230` 이 상태가 `DONE` 이면 `replay(payment)` 로 같은 결과를
 * 돌려준다. 재호출이 입금을 두 번 만들지 않는다. 그리고 `READY` 에서 나는
 * `DEPOSIT_NOT_APPROVED`(`:233`)는 승인 반영이 늦어 생기는 것이라 다시 부르면
 * 성공한다 — 이 갈래가 재시도 버튼을 두는 실제 이유다.
 *
 * **`aiErrorRetry` 와 반대로 블랙리스트다.** AI 쪽은 모르는 코드를 재시도 불가로
 * 보는데(엔드포인트별 코드 목록이 없어 처음 보는 코드가 정상적으로 온다), 여기는
 * 회신이 "그 밖은 전부 재시도" 라고 명시적으로 갈랐다. 빠져나갈 `홈으로` 가 항상
 * 함께 있어 재시도가 헛돌아도 갇히지 않는다.
 *
 * **`DEPOSIT_PAYMENT_FAILED` 는 재시도 가능 쪽에 남는다.** 이미 닫힌 건이라
 * 눌러도 같은 코드가 오지만, 이 코드는 만료(`ia.md` 만료 처리)로도 오고 문구가
 * `다시 시도해 주세요` 라 버튼을 빼면 문구와 화면이 어긋난다. 갈래를 더 쪼개려면
 * 회신이 먼저다.
 */
export function isRetryableDepositConfirmError(error: unknown): boolean {
  if (!isHttpError(error)) {
    // 네트워크 끊김·스키마 불일치. 끊김은 다시 부르면 되고, 스키마 불일치는
    // 사용자가 할 수 있는 것이 없지만 재시도가 해를 끼치지도 않는다.
    return true;
  }
  // `code` 는 본문이 `{code, message, detail}` 형식이 아닐 때 `null` 이다.
  // 무엇이 막았는지 모르는 것이라 재시도 쪽에 둔다.
  if (error.code === null) {
    return true;
  }
  return !NON_RETRYABLE_DEPOSIT_CONFIRM_CODES.includes(error.code);
}
