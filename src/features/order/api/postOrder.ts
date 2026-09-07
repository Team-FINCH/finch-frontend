import { type z } from 'zod';

import { request } from '@/shared/api';
import { API_PATHS, IDEMPOTENCY_KEY_HEADER } from '@/shared/config/apiContract';
import {
  OrderRequestSchema,
  OrderResponseSchema,
  type OrderResponse,
} from '@/shared/types/order';

/**
 * 주문 요청의 입력 타입.
 *
 * **출력 타입(`OrderRequest`)이 아니라 입력 타입을 받는다.** 브랜드는 출력 타입에만
 * 붙어서(`shared/types/primitives.ts`) `OrderRequest.stockCode` 는
 * `string & $brand<'StockCode'>` 다. 라우트 파라미터는 평범한 `string` 이라
 * 그대로 넣을 수 없고, 캐스팅으로 브랜드를 위조하면 검증을 건너뛴 값이 그대로 나간다.
 * 입력 타입으로 받고 아래에서 스키마로 통과시키는 쪽이 맞다.
 */
export type OrderRequestInput = z.input<typeof OrderRequestSchema>;

/**
 * 시장가 주문 (apiSpec §7.1).
 *
 * **`Idempotency-Key` 헤더가 필수다** (contracts C29). 없으면 서버가
 * `IDEMPOTENCY_KEY_REQUIRED`(400) 로 거절한다. 같은 클릭의 재시도는 같은 키를 쓰고
 * 새 클릭은 새 키를 쓴다 (contracts C30) — 키를 만드는 자리는 호출부다.
 *
 * **보내기 전에 요청을 검증한다.** 6자리가 아닌 종목코드나 0 이하 수량은 여기서
 * 걸린다 — 서버에 물어볼 것도 없이 틀린 값이고, 주문은 되돌릴 수 없어서 나가기 전에
 * 막는 편이 낫다.
 *
 * **접수와 체결이 분리되지 않는다.** 시장가 즉시 체결이라 `201` 응답에 체결가와
 * 체결 후 예수금이 함께 온다. 주문번호만 받고 나중에 조회하는 흐름이 아니다.
 *
 * **가격을 보내지 않는다.** 시장가 전용이라 요청 스키마에 `price` 자리가 없다
 * (`shared/types/order.ts`). 지정가 입력 필드를 만들지 않는다.
 */
export function postOrder(
  input: OrderRequestInput,
  idempotencyKey: string,
): Promise<OrderResponse> {
  const body = OrderRequestSchema.parse(input);

  return request(API_PATHS.orders.create, {
    method: 'POST',
    body,
    headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
    schema: OrderResponseSchema,
  });
}
