import { isHttpError } from '@/shared/api';
import { formatKrw } from '@/shared/lib/formatNumber';
import { type ErrorDetail } from '@/shared/types/error';
import { DEPOSIT_ERROR_CODES } from '@/shared/types/errorCodes';

/**
 * 결제 복귀(실패) 화면(`DepositFailPage`)의 `code` 5종 문구.
 *
 * 이 화면은 API 를 부르지 않는다 — 카카오 실패 리다이렉트의 `?code` 쿼리를 읽어
 * 바로 표시만 한다(`ia.md` §1 "결제 복귀 화면"). 그래서 서버가 완성해 주는
 * `message`(컨벤션 §5)를 쓸 수 없고, 이 화면이 직접 문구를 만든다.
 *
 * 5종 밖의 값(미래에 늘어날 수 있는 코드)은 `null` 을 돌려주고 화면이 공통 문구로
 * 대체한다 — 모르는 코드로 크래시하지 않는다.
 */
export function depositFailMessage(code: string | null): string | null {
  switch (code) {
    case DEPOSIT_ERROR_CODES.NOT_FOUND:
      return '입금 요청을 찾을 수 없어요.';
    case DEPOSIT_ERROR_CODES.INVALID_STATE:
      return '이미 처리됐거나 취소된 결제예요.';
    case DEPOSIT_ERROR_CODES.PAYMENT_FAILED:
      return '결제가 승인되지 않았어요.';
    case DEPOSIT_ERROR_CODES.PG_UNAVAILABLE:
      return '결제 서비스에 잠시 연결할 수 없어요.';
    case DEPOSIT_ERROR_CODES.AMOUNT_MISMATCH:
      return '결제 금액이 요청과 달라요.';
    default:
      return null;
  }
}

/**
 * `confirm` 을 만료 뒤에 부르면 오는 두 코드. **같은 만료 문구로 묶는다** — 만료
 * 정리 배치가 하루 1회(새벽 4:30)만 돌아 DB 상태가 갈리기 때문에, 낮에 만료된
 * 건은 다음날 새벽까지 `READY` 로 남아 `DEPOSIT_NOT_APPROVED` 가 훨씬 자주 온다.
 * 사용자에게는 둘 다 "제시간에 확인되지 않았다"는 같은 뜻이다.
 *
 * **묶는 곳은 문구까지다. 만료 전용 화면을 만들지 않는다** — `design.md:967` 이
 * "결제 만료(15분)도 실패 상태로 처리하고 별도 화면을 만들지 않는다" 고 명시했다.
 */
function isDepositExpiredErrorCode(code: string | null | undefined): boolean {
  return (
    code === DEPOSIT_ERROR_CODES.NOT_APPROVED ||
    code === DEPOSIT_ERROR_CODES.PAYMENT_FAILED
  );
}

/**
 * 결제 만료 문구. 프로토타입 FAIL 맵의 `timeout` 항목을 그대로 쓴다
 * (`app-logic.js` `FAILtimeout` — `결제창에서 응답이 오지 않았어요. 다시 시도해 주세요.`).
 */
const DEPOSIT_EXPIRED_MESSAGE =
  '결제창에서 응답이 오지 않았어요. 다시 시도해 주세요.';

/**
 * `DEPOSIT_LIMIT_EXCEEDED` 의 남은 한도. 계약은 `detail.remainingAmount` 다
 * (contracts C49·C85 · apiSpec §4.2 판정 4 · §4.4 판정 5).
 *
 * **`detail` 이 없거나 숫자가 아닐 때가 있다고 보고 짠다.** `confirm` 쪽 판정표
 * (apiSpec §4.4)는 이 코드에 `detail` 을 명기하지 않았다 — `ready` 쪽(§4.2)만
 * 명기한다. 없는 값을 그대로 문장에 끼우면 `잔여 한도: undefined원` 이 나간다.
 */
function readRemainingAmount(detail: ErrorDetail | null): number | undefined {
  const value = detail?.remainingAmount;
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

/**
 * 누적 한도 초과 문구. 해당 코드가 아니면 `null` 이다.
 *
 * **입금 화면과 같은 문장을 쓴다** — `design.md:969` 가 "한도 초과 문구는 충전
 * 화면과 **같은 문장**을 쓴다. 남은 한도 숫자가 들어간 쪽이다 — 같은 사유인데
 * 문장이 갈리면 다른 문제로 읽힌다" 고 요구한다. 그래서 이 문구를 쓰는 화면
 * (입금 · 결제 복귀 · 모의 이체)이 전부 이 함수 하나를 부른다.
 *
 * `DEPOSIT_LIMIT_EXCEEDED` 는 `ready`(contracts C49)와 `confirm`(C85) 둘 다에서
 * 난다. **`/deposit/fail` 에는 오지 않는다** — 그 화면의 `code` 는 C89 가 명기한
 * 다섯(`NOT_FOUND`·`INVALID_STATE`·`PAYMENT_FAILED`·`PG_UNAVAILABLE`·
 * `AMOUNT_MISMATCH`)이 전부이고 이 코드는 그 안에 없다. 그래서
 * `depositFailMessage` 에 case 를 더하지 않았다.
 */
export function depositLimitExceededMessage(error: unknown): string | null {
  if (
    !isHttpError(error) ||
    error.code !== DEPOSIT_ERROR_CODES.LIMIT_EXCEEDED
  ) {
    return null;
  }
  const remainingAmount = readRemainingAmount(error.detail);
  if (remainingAmount === undefined) {
    return '입금할 수 있는 금액을 넘었어요.';
  }
  return `입금할 수 있는 금액을 넘었어요. (잔여 한도: ${formatKrw(remainingAmount)})`;
}

/**
 * 결제 복귀·모의 이체의 **실패 문구**. 둘 다 마지막에 같은
 * `POST /deposits/confirm` 을 부르므로 문구도 한 곳에서 만든다.
 * 모의 이체는 그 앞의 `mock-approve` 실패도 이 함수로 보낸다 — 그쪽 코드는
 * 아래 어느 갈래에도 걸리지 않아 서버 `message` 로 떨어진다.
 *
 * 만료 두 코드만 우리가 문장을 만들고, 나머지는 서버가 완성해 준 `message` 를
 * 그대로 쓴다(컨벤션 §5).
 */
export function depositConfirmErrorMessage(error: unknown): string | undefined {
  if (!isHttpError(error)) {
    return undefined;
  }
  if (isDepositExpiredErrorCode(error.code)) {
    return DEPOSIT_EXPIRED_MESSAGE;
  }
  return depositLimitExceededMessage(error) ?? error.message;
}
