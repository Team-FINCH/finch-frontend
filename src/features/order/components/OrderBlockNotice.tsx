import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';
import { ORDER_ERROR_CODES } from '@/shared/types/errorCodes';
import { Button } from '@/shared/ui/Button';

import { describeOrderBlockReason } from '../lib/orderBlockReason';

/**
 * 주문할 수 없는 상태의 사유 한 줄 (design.md §7.7 "주문할 수 없는 상태",
 * 프로토타입 `orderBlocked`).
 *
 * **빨간 경고 박스를 쓰지 않는다. 원형 `!` + 문구다** (design.md §7.7 · §10 · §16).
 * 이 자리는 주문을 넣기 전 상태이고, 넣은 뒤 서버가 거절하는 자리(§10 "주문 — 서버가
 * 거절")와 다르다. 같은 붉은 박스로 그리면 거절당한 것으로 읽힌다.
 *
 * **CTA 는 여기서 잠그지 않는다.** 비활성 판정은 `OrderPage` 가 `tradable` 로 하고
 * 이 컴포넌트는 사유만 말한다 — "셋 다 CTA 를 비활성으로 두고 사유를 한 줄로 말한다.
 * 버튼만 죽여 두면 왜 안 되는지 모른다"(design.md §7.7). 사유가 사라지면 폴링이
 * 다음 응답에서 `tradable` 을 되돌려 CTA 가 되살아난다.
 *
 * 원형 `!` 의 실측값(18px 원 · 테두리 1.4px · 글자 11px/700)은 프로토타입 `.info` 이고
 * 충전 화면(`features/deposit/components/AmountInput.tsx`)이 이미 같은 값을 쓴다.
 */
type OrderBlockNoticeProps = {
  /** `GET /orders/available` 의 `reason`. 200 본문의 코드 문자열이다. */
  reason: string | null;
};

export function OrderBlockNotice({ reason }: OrderBlockNoticeProps) {
  const navigate = useNavigate();

  return (
    <section className="mt-6">
      <div className="flex items-start gap-2.25">
        <span
          aria-hidden="true"
          className="mt-1 flex size-4.5 flex-none items-center justify-center rounded-full border-[1.4px] border-text-muted text-[11px] font-bold text-text-muted"
        >
          !
        </span>
        <p className="min-w-0 flex-1 text-body-2 leading-[21px] text-text-secondary">
          {describeOrderBlockReason(reason)}
        </p>
      </div>

      {/* 예수금이 모자라 막힌 것은 사용자가 지금 풀 수 있는 유일한 사유다.
          장외 시간·시세 수신 실패·거래정지에는 보조 동작을 주지 않는다 —
          기다리는 것 말고 할 수 있는 일이 없다. */}
      {reason === ORDER_ERROR_CODES.INSUFFICIENT_CASH && (
        <Button
          variant="secondary"
          className="mt-3.5"
          onClick={() => void navigate(ROUTES.deposit)}
        >
          입금하기
        </Button>
      )}
    </section>
  );
}
