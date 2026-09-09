import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  OrderAiPreview,
  OrderBlockNotice,
  OrderQuantityField,
  OrderRatioButtons,
  OrderResultSheet,
  OrderSummaryBox,
  createIdempotencyKey,
  parseOrderSideParam,
  toApiOrderSide,
  useCreateOrder,
  useOrderAvailable,
  ORDER_SIDE_LABEL,
  ORDER_SIDE_PARAM,
} from '@/features/order';
import { isHttpError } from '@/shared/api';
import { ROUTES, STOCK_CODE_PARAM } from '@/shared/config/routes';
import { formatAmount } from '@/shared/lib/formatNumber';
import { type OrderResponse } from '@/shared/types/order';
import { ActionBar } from '@/shared/ui/ActionBar';
import { Button } from '@/shared/ui/Button';
import { PageMain } from '@/shared/ui/PageMain';
import { Skeleton } from '@/shared/ui/Skeleton';

/**
 * 주문 — 시장가 매수·매도 실행. `?side=buy|sell`. 지정가·호가창은 범위 밖이다.
 *
 * 티켓: FINCH-49.
 *
 * 근거: `ia.md` §1 "탐색·거래" 표, §2 라우트 트리(쿼리 파라미터 표) ·
 * 프로토타입 `finch-prototype.html` 의 `isOrder` 블록.
 * API: `GET /api/v1/orders/available?stockCode=&side=` ·
 * `POST /api/v1/orders` (`Idempotency-Key` 필수).
 *
 * ## 시장가 전용
 *
 * **가격 입력 필드를 만들지 않는다.** `featureSpec` §1.1·§7.3·§12 와 ia.md §1:131 이
 * 세 곳에서 시장가 전용이라고 말하고, `OrderRequestSchema` 에 `price` 자리가 아예 없다.
 * 호가창·미체결 관리도 범위 밖이다.
 *
 * ## 버튼을 잠그는 주체는 서버다
 *
 * 정규장 판정을 화면의 시계로 하지 않는다 (ia.md §1:133). `GET /orders/available` 의
 * `tradable`·`reason` 만 본다 — 화면이 자체 판정하면 서버와 어긋나 "눌리는데 거부되는"
 * 상태가 생긴다. 그 응답은 폴링으로 갱신된다.
 *
 * ## 하단 바
 *
 * 종목 상세와 달리 여기는 `ActionBar` 를 쓴다 (`shared/ui/ActionBar.tsx` 주석이
 * "주문 제출" 을 쓰는 곳으로 지목했다). 매수/매도 바(`TradeTabBar`)는 종목 상세의
 * 것이고 두 개를 겹쳐 두면 바가 둘이 된다.
 *
 * ## AI 주문 전 점검 (FINCH-191)
 *
 * 요약 상자 아래·제출 버튼 위쪽 영역 안에 있다 (ia.md §4 슬롯 4번, design.md §7.7 이
 * 적은 기본 구조 `… → 주문 금액/주문 후 예수금 → AI 주문 전 점검 → 제출`).
 * **제출 버튼과 붙여 놓지 않는다** (ia.md §4:538 — 오탭하면 주문이 나간다). 그래서
 * 본문 아래 여백을 바 높이보다 넉넉히 준다. 내용은 `OrderAiPreview` 가 그린다.
 *
 * **점검은 주문을 막지 않는다.** 경고가 있어도 `canSubmit` 은 그대로다 —
 * 버튼을 잠그는 것은 `GET /orders/available` 뿐이다 (AI 명세 §7 · ia.md §4).
 */
export function OrderPage() {
  const params = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 형식 검증은 `StockCodeGuard` 가 이미 했다.
  const stockCode = params[STOCK_CODE_PARAM] ?? '';
  const sideParam = parseOrderSideParam(searchParams.get(ORDER_SIDE_PARAM));
  const side = toApiOrderSide(sideParam);
  const sideLabel = ORDER_SIDE_LABEL[sideParam];

  const available = useOrderAvailable(stockCode, side);
  const createOrder = useCreateOrder();

  const [quantity, setQuantity] = useState(0);
  const [result, setResult] = useState<OrderResponse | null>(null);

  /**
   * 이 클릭의 멱등성 키 (contracts C30).
   *
   * 같은 주문을 다시 누르면 같은 키가 나가야 서버가 첫 결과를 되돌려 준다 —
   * 네트워크가 끊겨 응답을 못 받은 주문이 두 번 체결되지 않는다. 반대로 수량이나
   * 방향이 바뀌면 그것은 다른 주문이므로 키를 버린다. 그래서 아래 이펙트가 있다.
   */
  const idempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    idempotencyKeyRef.current = null;
  }, [quantity, side, stockCode]);

  const data = available.data;

  /**
   * 비율 버튼의 분모 (contracts C45). 매수는 살 수 있는 최대, 매도는 보유 수량이다.
   * **화면이 계산하지 않는다** — 서버가 준 값을 그대로 쓴다.
   */
  const baseQuantity =
    data === undefined
      ? 0
      : side === 'BUY'
        ? data.maxQuantity
        : data.holdingQuantity;

  const maxNote =
    data === undefined
      ? ''
      : side === 'BUY'
        ? `최대 ${formatAmount(data.maxQuantity)}주`
        : `보유 ${formatAmount(data.holdingQuantity)}주`;

  const estimatedAmount = data === undefined ? 0 : quantity * data.currentPrice;
  const cashAfter =
    data === undefined
      ? 0
      : side === 'BUY'
        ? data.availableCash - estimatedAmount
        : data.availableCash + estimatedAmount;

  const exceedsBase = quantity > baseQuantity;
  const canSubmit =
    data !== undefined &&
    data.tradable &&
    quantity > 0 &&
    !exceedsBase &&
    !createOrder.isPending;

  const handleSubmit = () => {
    idempotencyKeyRef.current ??= createIdempotencyKey();

    createOrder.mutate(
      {
        body: { stockCode, side, quantity },
        idempotencyKey: idempotencyKeyRef.current,
      },
      {
        onSuccess: (response) => {
          setResult(response);
          // 체결된 주문이다. 다음 주문은 새 클릭이므로 키를 버린다.
          idempotencyKeyRef.current = null;
        },
      },
    );
  };

  if (available.isPending) {
    return (
      <PageMain>
        <Skeleton className="h-11 w-1/2" />
        <Skeleton className="mt-8 h-11 w-full" />
        <Skeleton className="mt-8 h-24 w-full" />
      </PageMain>
    );
  }

  if (available.isError) {
    return (
      <PageMain>
        <div className="pt-10 text-center">
          <p className="text-title-3 text-text-primary">
            주문 정보를 불러오지 못했어요
          </p>
          <p className="mt-2 text-body-2 text-text-secondary">
            {available.error.message}
          </p>
          <button
            type="button"
            onClick={() => void available.refetch()}
            className="mt-5 text-label font-medium text-text-secondary underline underline-offset-[3px]"
          >
            다시 시도
          </button>
        </div>
      </PageMain>
    );
  }

  const orderAvailable = available.data;
  const submitError = createOrder.error;

  return (
    <>
      {/* ActionBar 가 fixed 라 마지막 내용이 그 밑에 깔린다. 바 높이만큼 띄운다
          (`ActionBar` 주석: "이 바를 쓰는 화면은 본문 아래에 바 높이만큼 여백을 둔다").
          바 높이 6.5rem 에 1.5rem 을 더 얹은 것은 AI 점검 슬롯이 제출 버튼에 붙지 않게
          하려는 것이다 (ia.md §4:538 — 주문 확인 단계에서 오탭하면 주문이 나간다). */}
      <PageMain className="pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void navigate(-1)}
            aria-label="뒤로 가기"
            className="flex size-11 flex-none items-center justify-center rounded-12 text-title-2 leading-none text-text-primary active:bg-primary-soft"
          >
            ‹
          </button>
          <h1 className="text-title-3 font-bold text-text-primary">
            {sideLabel}
          </h1>
        </div>

        <p className="mt-4 text-body-2 text-text-secondary">
          시장가 · 현재가 {formatAmount(orderAvailable.currentPrice)}원
        </p>

        <OrderQuantityField
          quantity={quantity}
          onChange={setQuantity}
          maxNote={maxNote}
        />
        <OrderRatioButtons baseQuantity={baseQuantity} onSelect={setQuantity} />

        <OrderSummaryBox
          estimatedAmount={estimatedAmount}
          cashAfter={cashAfter}
        />

        {/* 수량이 분모를 넘었다. 입력 단계에서 자르지 않는 대신 여기서 말한다
            (`OrderQuantityField` 주석). */}
        {exceedsBase && quantity > 0 && (
          <p className="mt-4 text-body-2 text-danger">
            {side === 'BUY'
              ? `최대 ${formatAmount(baseQuantity)}주까지 살 수 있어요.`
              : `보유한 ${formatAmount(baseQuantity)}주까지 팔 수 있어요.`}
          </p>
        )}

        {/* 서버가 막은 경우. 사유는 200 본문의 `reason` 코드로 온다 (apiSpec §7.3).
            빨간 박스가 아니라 원형 `!` + 문구다 (design.md §7.7 "주문할 수 없는 상태").
            **화면이 시계로 장외 시간을 판정하지 않는다** — 세 상태 모두 이 응답의
            `tradable`·`reason` 으로만 갈린다. `stale` 임계 시간은 아직 미확정이라
            (contracts P10) 숫자를 코드에 박지 않는다. */}
        {!orderAvailable.tradable && (
          <OrderBlockNotice reason={orderAvailable.reason} />
        )}

        {/* 제출 실패. 문구는 서버가 완성해 준 message 를 그대로 쓴다 (컨벤션 §5).
            `ORDER_PRICE_CHANGED` 분기는 두지 않는다 — v0.8 에서 그 코드가 폐기됐고
            체결 직전 재검증에서 예수금이 부족하면 `ORDER_INSUFFICIENT_CASH` 로 온다
            (계약 C88 · apiSpec §7.2 · §13). */}
        {submitError !== null && (
          <div className="mt-6 rounded-card border border-border bg-danger-surface p-5">
            <p className="text-body-2 font-medium text-text-primary">
              {isHttpError(submitError)
                ? submitError.message
                : '주문을 처리하지 못했어요.'}
            </p>
          </div>
        )}

        {/* 주문 흐름의 마지막 칸이다 (design.md §7.7 기본 구조).
            수량이 0 이면 이 컴포넌트가 스스로 아무것도 그리지 않는다. */}
        <OrderAiPreview stockCode={stockCode} side={side} quantity={quantity} />
      </PageMain>

      <ActionBar>
        <Button disabled={!canSubmit} onClick={handleSubmit}>
          {createOrder.isPending ? '주문하는 중…' : `${sideLabel}하기`}
        </Button>
      </ActionBar>

      <OrderResultSheet
        result={result}
        onClose={() => {
          setResult(null);
          // 체결 뒤에는 종목 상세로 돌아간다. 주문 화면에 남으면 방금 체결한 수량이
          // 그대로 남아 같은 주문을 한 번 더 내기 쉽다.
          void navigate(ROUTES.stockDetail(stockCode));
        }}
      />
    </>
  );
}
