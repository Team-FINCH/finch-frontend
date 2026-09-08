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
      return '충전 요청을 찾을 수 없어요.';
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
 * `confirm` 을 만료 뒤에 부르면 오는 두 코드. **같은 만료 화면으로 묶는다** — 만료
 * 정리 배치가 하루 1회(새벽 4:30)만 돌아 DB 상태가 갈리기 때문에, 낮에 만료된
 * 건은 다음날 새벽까지 `READY` 로 남아 `DEPOSIT_NOT_APPROVED` 가 훨씬 자주 온다.
 * 사용자에게는 둘 다 "제시간에 확인되지 않았다"는 같은 뜻이다.
 */
export function isDepositExpiredErrorCode(
  code: string | null | undefined,
): boolean {
  return (
    code === DEPOSIT_ERROR_CODES.NOT_APPROVED ||
    code === DEPOSIT_ERROR_CODES.PAYMENT_FAILED
  );
}
