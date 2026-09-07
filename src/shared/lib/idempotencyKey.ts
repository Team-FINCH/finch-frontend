import {
  IdempotencyKeySchema,
  type IdempotencyKey,
} from '@/shared/types/primitives';

/**
 * `Idempotency-Key` 생성 유틸 (`frontConvention.md` §5 멱등성 키 · contracts C30).
 *
 * **키의 수명은 사용자의 한 번의 클릭이다.** 같은 클릭에서 파생된 재시도(예:
 * `IDEMPOTENCY_IN_PROGRESS` 뒤 재시도)는 이 함수가 만든 키를 그대로 재사용하고,
 * 새 클릭은 이 함수를 다시 불러 새 키를 만든다. 폼 마운트 시점에 한 번만 만들어
 * 재사용하면 서로 다른 제출이 같은 키를 쓰게 된다 — 호출부가 상태(useState 등)에
 * 담아 클릭 단위로 관리한다.
 *
 * 지금 쓰는 곳은 `POST /orders`·`POST /withdrawals` 둘이다(C29). 충전 확정은
 * `paymentKey`가 멱등 기준이라 이 헤더를 쓰지 않는다(C85).
 */
export function generateIdempotencyKey(): IdempotencyKey {
  return IdempotencyKeySchema.parse(crypto.randomUUID());
}
