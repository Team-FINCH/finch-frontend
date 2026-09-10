import { useQuery } from '@tanstack/react-query';

import { AI_GC_TIME_MS } from '@/shared/api';
import { queryKeys } from '@/shared/config/queryKeys';
import { type OrderSide } from '@/shared/types/order';

import { useDebouncedValue } from '../lib/useDebouncedValue';

import { postAiOrderPreview } from './postAiOrderPreview';

/**
 * 수량 입력이 멈춘 것으로 보는 시간.
 *
 * **계약이 아니라 프론트 재량이다.** 짧으면 −/＋ 를 연달아 누르는 동안 AI 호출이
 * 여러 번 나가고, 길면 점검이 늦게 뜬다.
 */
const ORDER_PREVIEW_DEBOUNCE_MS = 600;

/** 같은 수량으로 다시 점검하지 않는다. 다른 AI 슬롯과 같은 값이다. */
const ORDER_PREVIEW_STALE_TIME_MS = 5 * 60_000;

/**
 * 주문 전 점검 (AI 슬롯 4번).
 *
 * ## 왜 명시적 트리거가 아니라 디바운스인가
 *
 * "점검하기" 버튼을 두지 않았다. 근거 셋이다.
 *
 * 1. `design.md` §7.7 이 주문 화면의 기본 구조를 `… → 주문 금액/주문 후 예수금 →
 *    AI 주문 전 점검 → 제출` 로 적었다. 점검은 흐름 안의 한 칸이고 곁길이 아니다
 * 2. `ia.md` §4 가 "다른 슬롯은 정보를 주지만 **이 슬롯만 사용자를 멈춰 세우는 것**이
 *    목적" 이라고 적었다. 눌러야 보이는 것으로 두면 안 누르고 제출할 수 있어 슬롯을
 *    만든 이유가 없어진다. 프로토타입도 수량이 정해지면 점검이 그냥 보인다
 *    (`app-logic.js` `showCheck: aiOk && s.qty>0`)
 * 3. 트리거 버튼의 라벨이 `design.md` 에도 프로토타입에도 없다. 문구를 지어야 한다
 *
 * 그 대신 호출을 두 겹으로 아낀다 — **수량이 멈춘 뒤에 한 번**(디바운스) 부르고,
 * 쿼리 키에 수량을 실어 **같은 수량은 캐시**로 답한다. 수량이 0 이면 요청 자체를 걸지
 * 않는다(`enabled`) — ia.md §4 "슬롯이 비어 있는 상태(아직 요청 전)" 가 그 자리다.
 *
 * `retry: false` 는 다른 AI 슬롯과 같다. 재시도는 `AiStatus` 의 명시적 버튼이 맡는다.
 */
export function useAiOrderPreview(
  stockCode: string,
  side: OrderSide,
  quantity: number,
) {
  const settledQuantity = useDebouncedValue(
    quantity,
    ORDER_PREVIEW_DEBOUNCE_MS,
  );

  const preview = useQuery({
    queryKey: queryKeys.ai.orderPreview(stockCode, side, settledQuantity),
    queryFn: ({ signal }) =>
      postAiOrderPreview(
        {
          orders: [
            {
              // AI 명세 §7 의 종목코드 필드 이름은 `ticker` 다 (이슈 #11 1번 회신).
              ticker: stockCode,
              // side 가 소문자다. 백엔드 주문 API 의 BUY/SELL 을 그대로 넘기지 않는다.
              side: side === 'BUY' ? 'buy' : 'sell',
              quantity: settledQuantity,
              // price 를 싣지 않는다. 시장가라 단가를 화면이 정하지 않고,
              // 생략하면 AI 가 현재가로 계산해 `orderSummary` 에 채워 준다 (AI 명세 §7).
            },
          ],
        },
        signal,
      ),
    enabled: settledQuantity > 0,
    staleTime: ORDER_PREVIEW_STALE_TIME_MS,
    gcTime: AI_GC_TIME_MS,
    retry: false,
  });

  return {
    preview,
    /** 수량이 바뀐 뒤 아직 요청이 안 나간 구간. 낡은 결과를 새 수량의 것처럼 보이면 안 된다. */
    isSettling: quantity !== settledQuantity,
  };
}
