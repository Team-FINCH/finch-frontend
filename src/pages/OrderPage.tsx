import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import {
  OrderAiPreview,
  OrderBlockNotice,
  OrderQuantityField,
  OrderRatioButtons,
  OrderResultSheet,
  OrderStockHeader,
  OrderSummaryBox,
  createIdempotencyKey,
  parseOrderSideParam,
  toApiOrderSide,
  useCreateOrder,
  useOrderAvailable,
  ORDER_SIDE_LABEL,
  ORDER_SIDE_PARAM,
} from '@/features/order';
// 배럴(`@/features/stocks`)이 아니라 모듈을 직접 가리킨다. 배럴은 `CandleChart` 도
// 함께 내보내는데, 그것이 `lightweight-charts` 를 끌고 와 **차트를 그리지도 않는
// 주문 화면 번들에 190kB 짜리 청크가 붙는다**(빌드로 확인). 홈이 `BriefingSection`
// 을 경로로 집어 오는 것과 같은 방식이다.
import { useStockDetail } from '@/features/stocks/api/useStockDetail';
import { isHttpError } from '@/shared/api';
import { ROUTES, STOCK_CODE_PARAM } from '@/shared/config/routes';
import { showToast } from '@/shared/hooks/useToastStore';
import { formatAmount } from '@/shared/lib/formatNumber';
import { type OrderResponse } from '@/shared/types/order';
import { ActionBar } from '@/shared/ui/ActionBar';
import { Button } from '@/shared/ui/Button';
import { PageMain } from '@/shared/ui/PageMain';
import { Skeleton } from '@/shared/ui/Skeleton';
import { SubPageHeader } from '@/shared/ui/SubPageHeader';

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
 * 상태가 생긴다. 그 응답은 시세 구독(`useOrderAvailable` → `useQuoteSubscription`, contracts C34)
 * 으로 갱신된다 — 화면은 폴링인지 STOMP 인지 모른다.
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
 *
 * ## 상단 헤더 (FINCH-200)
 *
 * `shared/ui/SubPageHeader` 다 — FINCH-196 이 인라인 뒤로가기 넷을 공용화할 때
 * 이 화면만 남겼던 것(주문 점검 슬롯 MR 과 같은 파일이라 충돌을 피했다)을 마무리했다.
 * 제목은 프로토타입 `isOrder` 의 `.navt` 가 `{{ sideLabel }}`(`app-logic.js` L719,
 * `매수`/`매도`)이므로 `ORDER_SIDE_LABEL` 을 그대로 쓴다. 뒤로가기는 스택을 하나
 * 되돌리고, 새 탭에서 바로 열었으면 종목 상세로 보낸다 — 이 화면의 진입점은 종목
 * 상세의 매수·매도 바 하나뿐이고(ia.md §1 주문 행의 선행 조건 `종목 상세`),
 * 체결 뒤 `OrderResultSheet` 도 같은 곳으로 돌아간다.
 *
 * ## 종목 한 줄 (FINCH-260)
 *
 * 헤더 바로 아래에 이니셜 뱃지 · 종목명 · `시장가 · {현재가}원` · 등락률이 온다
 * (프로토타입 `isOrder` 의 첫 `.sec`). 전에는 이 자리가 `시장가 · 현재가 68,100원`
 * 한 줄이라 **어느 종목을 사는지 화면 어디에도 없었다** — 헤더 제목도 `매수`/`매도`
 * 라 종목을 말하지 않는다. 그리는 것은 `OrderStockHeader` 이고, 종목명이 어디서
 * 오는지는 아래 `useStockDetail` 주석에 있다.
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
  /**
   * 종목명·전일 종가를 받는다 (FINCH-260).
   *
   * **`GET /orders/available` 에 `stockName` 이 없어서** 두 쿼리를 여기서 합친다.
   * feature 끼리 직접 import 하지 않는 규약이라(frontConvention §2) 이 조립은
   * pages 층인 이 파일의 몫이고, `OrderStockHeader` 는 서버를 모른 채 props 만 받는다.
   *
   * 왕복이 실제로 늘지 않는다 — 이 화면의 진입점은 종목 상세 하나뿐이고
   * (`SubPageHeader` 의 `fallbackTo` 도 그곳이다) 그 화면이 같은 키로 방금 받아 둔
   * 캐시가 `staleTime` 30초 안에 살아 있다.
   *
   * **실패해도 주문을 막지 않는다.** 종목명은 확인을 돕는 값이지 주문에 필요한 값이
   * 아니다 — 주문이 쓰는 값은 전부 `available` 에서 온다. 그래서 `isError` 를 보지
   * 않고 `data` 가 없으면 없는 대로 그린다(헤더가 종목코드로 대신한다).
   */
  const detail = useStockDetail(stockCode);
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

  const data = available.snapshot;

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

  if (available.isConnecting) {
    return (
      <PageMain className="pt-6">
        <Skeleton className="h-11 w-1/2" />
        <Skeleton className="mt-8 h-11 w-full" />
        <Skeleton className="mt-8 h-24 w-full" />
      </PageMain>
    );
  }

  if (available.isDisconnected) {
    return (
      <PageMain className="pt-6">
        <div className="pt-10 text-center">
          <p className="text-title-3 text-text-primary">
            주문 정보를 불러오지 못했어요
          </p>
          <p className="mt-2 text-body-2 text-text-secondary">
            {available.failure.message}
          </p>
          <button
            type="button"
            onClick={available.reconnect}
            className="mt-5 text-label font-medium text-text-secondary underline underline-offset-[3px]"
          >
            다시 시도
          </button>
        </div>
      </PageMain>
    );
  }

  const orderAvailable = available.snapshot;
  const submitError = createOrder.error;

  return (
    <>
      {/* ActionBar 가 fixed 라 마지막 내용이 그 밑에 깔린다. 바 높이만큼 띄운다
          (`ActionBar` 주석: "이 바를 쓰는 화면은 본문 아래에 바 높이만큼 여백을 둔다").
          바 높이 6.5rem 에 1.5rem 을 더 얹은 것은 AI 점검 슬롯이 제출 버튼에 붙지 않게
          하려는 것이다 (ia.md §4:538 — 주문 확인 단계에서 오탭하면 주문이 나간다). */}
      <PageMain className="pb-[calc(8rem+env(safe-area-inset-bottom))]">
        <SubPageHeader
          title={sideLabel}
          fallbackTo={ROUTES.stockDetail(stockCode)}
        />

        {/* 어느 종목을 사는지 화면에 남긴다 (FINCH-260). 전에는 종목명 없이
            `시장가 · 현재가 68,100원` 한 줄이라, 헤더 제목(`매수`)까지 합쳐도
            화면 어디에도 종목이 없었다. */}
        <OrderStockHeader
          stockCode={stockCode}
          stockName={detail.data?.stockName ?? null}
          isDetailPending={detail.isPending}
          /* 주문 금액을 계산하는 값과 같은 출처여야 한다. 상세 응답의 현재가를
             쓰면 화면에 적힌 단가와 실제 체결 금액이 갈린다. */
          currentPrice={orderAvailable.currentPrice}
          previousClose={detail.data?.previousClose ?? null}
          suspended={detail.data?.suspended ?? false}
        />

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
          /*
            체결 토스트 (FINCH-232 의 19자리 중 하나, 프로토타입 `submit`).
            **결과 시트를 닫고 종목 상세로 돌아간 뒤에 띄운다.** 프로토타입은
            결과 시트가 없어 `this.back()` 바로 뒤에 띄우는데, 우리는 시트가
            같은 문장을 이미 제목으로 보여주고 있어서 시트가 떠 있는 동안 겹쳐
            띄우면 같은 말이 두 번 나온다. 돌아간 화면에서 한 번 확인해 주는
            것이 이 토스트의 역할이다.
          */
          if (result !== null) {
            const label = result.side === 'SELL' ? '매도' : '매수';
            showToast(
              `${result.stockName} ${result.quantity}주를 ${label}했어요.`,
            );
          }
        }}
      />
    </>
  );
}
