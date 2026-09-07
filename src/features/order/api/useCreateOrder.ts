import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/shared/config/queryKeys';

import { postOrder, type OrderRequestInput } from './postOrder';

type CreateOrderVariables = {
  body: OrderRequestInput;
  /** 이 클릭의 멱등성 키. 재시도면 같은 값이 다시 들어온다 (contracts C30). */
  idempotencyKey: string;
};

/**
 * 주문 실행.
 *
 * **자동 재시도하지 않는다.** `createQueryClient` 가 뮤테이션 기본값을
 * `retry: false` 로 두고 있고, 그 이유가 바로 이 호출이다 — 중복 주문이 된다.
 * 멱등성 키가 있어도 재시도는 사용자가 명시적으로 눌러야 한다.
 *
 * 성공하면 잔고·보유가 바뀌므로 관련 캐시를 넓게 무효화한다. 주문 가능 정보는
 * 예수금과 최대 수량이 함께 바뀌고, 종목 상세는 `holding` 이 바뀐다
 * (전량 매도면 `null` 이 된다, contracts C76).
 *
 * 포트폴리오·계좌·거래내역 키는 다른 화면(다른 워커)이 소유한 것이라 여기서
 * `queryKeys` 에 정의하지 않고 최상위 접두만 털어 둔다. 주문 뒤에 그 화면으로 가면
 * 옛 잔고가 보이는 것을 막으려는 것이고, 그 화면들이 자기 키를 정의하면
 * 이 배열을 그 팩토리로 바꾼다.
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ body, idempotencyKey }: CreateOrderVariables) =>
      postOrder(body, idempotencyKey),
    onSuccess: (_data, { body }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all() });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.stocks.detail(body.stockCode),
      });
      void queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      void queryClient.invalidateQueries({ queryKey: ['account'] });
      void queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
