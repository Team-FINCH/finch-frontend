import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAccount } from '@/features/deposit/api/useAccount';
import { useDepositLimit } from '@/features/deposit/api/useDepositLimit';
import { useDepositReady } from '@/features/deposit/api/useDepositReady';
import { AmountInput } from '@/features/deposit/components/AmountInput';
import { PaymentMethodPicker } from '@/features/deposit/components/PaymentMethodPicker';
import { depositLimitExceededMessage } from '@/features/deposit/lib/depositErrorMessages';
import { toSameOriginPath } from '@/features/deposit/lib/queryParams';
import { isHttpError, isSchemaError } from '@/shared/api';
import { formatKrw } from '@/shared/lib/formatNumber';
import { type PaymentMethod } from '@/shared/types/deposit';
import { ActionBar } from '@/shared/ui/ActionBar';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageMain } from '@/shared/ui/PageMain';
import { SoftBox, SoftBoxRow } from '@/shared/ui/SoftBox';

/**
 * 입금 — 모의 결제로 예수금 충전. 4단계(준비 → 결제창 → 승인 → 확정) 중 이 화면이
 * 담당하는 것은 첫 단계(`ready`)까지다. 금액 입력·프리셋, 한도 안내, 결제 수단
 * (카카오페이/계좌이체) 선택, 확인을 거쳐 `checkoutUrl` 로 이동한다.
 *
 * 티켓: FINCH-35 · FINCH-183.
 *
 * **한 화면 안에서 세 단계가 이어진다** (`design.md:943`). 위저드로 나누지 않는다 —
 * 금액·한도·수단·확인이 한 스크롤에 있고, 프로토타입 `isDeposit` 블록
 * (template L2624-2676)이 같은 구조다. 전에는 `step` 상태로 금액과 확인을 갈라
 * 보여주고 CTA 를 둘(`다음`·`입금하기`) 두었는데, 그 구조가 근거에 없었다.
 *
 * 근거: `design.md` §7.18 · `ia.md` §1 "홈·자산" 표 · 프로토타입 `isDeposit`.
 * API: `GET /api/v1/deposits/limit` · `POST /api/v1/deposits/ready` (멱등성 헤더 없음).
 *
 * **`ready` 는 CTA 를 눌렀을 때만 나간다.** 한 화면이 됐어도 호출 시점은 그대로다 —
 * 금액을 입력하거나 수단을 고르는 것으로는 아무 요청도 보내지 않는다(contracts C49).
 *
 * **중복 호출 방어** — 서버는 `ready`를 연달아 불러도 정리·거절하지 않고 그냥
 * 쌓는다(contracts C92). 그래서 여기서는 `useDepositReady()`의 `isPending` 으로
 * CTA 를 잠근다 — 응답이 오기 전에는 두 번째 클릭 자체가 나가지 않는다.
 */
const DEPOSIT_PRESETS = [10_000, 100_000, 1_000_000] as const;

/** 아직 고르지 않은 값의 자리. 글리프는 `StockRow` 와 같은 것을 쓴다. */
const NO_VALUE = '—';

/** 섹션 제목. 프로토타입 `.sh`·`.sht` 실측 — 18px/700 · 자간 -.01em · 아래 여백 14px. */
const SECTION_TITLE_CLASS =
  'mb-3.5 text-title-3 font-bold tracking-[-.01em] text-text-primary';

/**
 * `ready` 실패 문구.
 *
 * **`HttpError` 만 그리면 안 된다.** 응답 스키마가 어긋나면 `SchemaError` 가 나오는데,
 * 그것만 걸러 내면 화면에 아무것도 뜨지 않고 버튼만 되돌아와 "눌러도 아무 일이 없다"가
 * 된다. 실제로 그 상태로 배포됐다(FINCH-160). 원인을 사용자에게 설명할 수는 없어도
 * **실패했다는 사실은 반드시 보여야 한다.**
 */
function readyErrorMessage(error: unknown): string {
  /*
   * 누적 한도 초과만 우리가 문장을 만든다. 남은 한도 숫자가 들어간 쪽을 써야 하고
   * (`design.md:969`) 그 숫자는 `detail.remainingAmount` 로만 온다 — 서버 `message`
   * 에는 없다. 결제 복귀·모의 이체와 같은 함수를 부른다.
   */
  const limitExceeded = depositLimitExceededMessage(error);
  if (limitExceeded !== null) {
    return limitExceeded;
  }
  if (isHttpError(error)) {
    // 서버가 완성해 준 문구를 그대로 쓴다 (컨벤션 §5).
    return error.message;
  }
  if (isSchemaError(error)) {
    // 사용자가 할 수 있는 일이 없다. 계약 불일치는 우리가 고쳐야 하는 것이라
    // 재시도를 권하지 않고 문의로 보낸다.
    return '입금을 시작하지 못했어요. 문제가 계속되면 알려 주세요.';
  }
  return '입금을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

export function DepositPage() {
  const [amount, setAmount] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );

  const navigate = useNavigate();
  const limitQuery = useDepositLimit();
  const accountQuery = useAccount();
  const readyMutation = useDepositReady();

  const limit = limitQuery.data;
  const amountError =
    amount !== null && limit !== undefined
      ? amount > limit.perRequestLimit
        ? `한 번에 ${formatKrw(limit.perRequestLimit)}까지 입금할 수 있어요`
        : amount > limit.remainingAmount
          ? `입금할 수 있는 금액을 넘었어요. (잔여 한도: ${formatKrw(limit.remainingAmount)})`
          : undefined
      : undefined;

  const canSubmit =
    amount !== null &&
    amount > 0 &&
    amountError === undefined &&
    paymentMethod !== null &&
    !readyMutation.isPending;

  const methodLabel =
    paymentMethod === null
      ? NO_VALUE
      : paymentMethod === 'KAKAOPAY'
        ? '카카오페이'
        : '계좌이체';

  function handleReady() {
    if (amount === null || paymentMethod === null || readyMutation.isPending) {
      return;
    }
    readyMutation.mutate(
      { amount, paymentMethod },
      {
        onSuccess: (data) => {
          // 카카오 결제창이든 모의 이체 화면이든 checkoutUrl 하나로 이동한다(ia.md §1).
          // 다만 우리 화면이면 라우터로 간다 — 전체 새로고침은 목 상태를 날린다.
          const path = toSameOriginPath(data.checkoutUrl);
          if (path === null) {
            window.location.assign(data.checkoutUrl);
            return;
          }
          void navigate(path);
        },
      },
    );
  }

  return (
    /* ActionBar 가 fixed 라 마지막 내용이 그 밑에 깔린다. 바 높이만큼 띄운다
       (`ActionBar` 주석: "이 바를 쓰는 화면은 본문 아래에 바 높이만큼 여백을 둔다"). */
    <PageMain className="pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <h1 className="text-title-3 text-text-primary">입금</h1>

      {/* 섹션 간격 32px 은 프로토타입 `.sec{margin-top:32px}` 실측값이다. */}
      <div className="mt-8 flex flex-col gap-8">
        <AmountInput
          label="입금할 금액"
          value={amount}
          onChange={setAmount}
          presets={DEPOSIT_PRESETS}
          errorMessage={amountError}
        />

        {/*
         * 세 줄이다 — `1회 한도` · `누적 한도` · `잔여 한도`. 라벨과 순서는
         * 프로토타입(`isDeposit` L2643-2645)과 `design.md:946` · `ia.md:87` 이
         * 같은 것을 말한다. 어느 필드가 어느 줄인지도 계약이 정한다 —
         * `perRequestLimit`(1회) · `cumulativeLimit`(계정 전체 누적 한도) ·
         * `remainingAmount`(남은 몫). **`depositedAmount`(누적 입금액)는 이
         * 박스에 없다** — `누적 한도` 는 한도이고 누적 입금액이 아니다
         * (contracts C49 · apiSpec §4.1).
         *
         * 값은 서버가 준 것을 그대로 그린다. 화면이 계산하지 않는다(`ia.md:87`).
         *
         * 구분선은 마지막 `잔여 한도` 줄 위에 온다 — 앞 두 줄이 고정 한도이고
         * 마지막 줄만 쓴 만큼에 따라 움직이는 값이라 묶음이 갈린다(프로토타입 L2645).
         *
         * **회색 Soft Box 다.** 아래 `확인` 은 흰 카드라 둘이 면색으로 갈린다
         * (프로토타입 L2641 `.soft` vs L2663 `.card`).
         */}
        {limit !== undefined && (
          <SoftBox>
            <SoftBoxRow
              label="1회 한도"
              value={formatKrw(limit.perRequestLimit)}
            />
            <SoftBoxRow
              label="누적 한도"
              value={formatKrw(limit.cumulativeLimit)}
            />
            <SoftBoxRow
              label="잔여 한도"
              value={formatKrw(limit.remainingAmount)}
              divided
            />
          </SoftBox>
        )}

        {/* 필드 라벨이 아니라 섹션 제목이다 (프로토타입 L2650 `.sh`>`.sht`). */}
        <section>
          <h2 className={SECTION_TITLE_CLASS}>결제 수단</h2>
          <PaymentMethodPicker
            value={paymentMethod}
            onChange={setPaymentMethod}
          />
        </section>

        {/*
         * `확인` 은 프로토타입에 있던 섹션이다(L2662). 위저드를 없애면서 사라질
         * 자리가 아니다 — 금액·수단을 고른 결과를 같은 화면에서 되짚는 요약이고,
         * `ia.md:84` 가 "확인 화면은 그대로 남는다. 결제 수단·충전 금액·충전 후
         * 예수금을 보여주고 최종 확인을 받는다" 고 적었다.
         *
         * 아직 고르지 않은 값은 `—` 로 둔다. 프로토타입은 금액·수단에 초기값이
         * 있어(`depAmt:500000` · `depMethod:"kakao"`) 빈 자리가 없다.
         */}
        <section>
          <h2 className={SECTION_TITLE_CLASS}>확인</h2>
          <Card>
            <SoftBoxRow label="결제 수단" value={methodLabel} />
            <SoftBoxRow
              label="입금 금액"
              value={amount === null ? NO_VALUE : formatKrw(amount)}
              divided
            />
            {accountQuery.data !== undefined && (
              <SoftBoxRow
                label="입금 후 예수금"
                value={formatKrw(accountQuery.data.cashBalance + (amount ?? 0))}
                divided
              />
            )}
            {/* 취소 불가는 카드 밖 독립 단락이 아니라 카드 안 구분선 아래
                캡션이다 (프로토타입 L2667). */}
            <p className="mt-3.5 border-t border-border pt-3.5 text-caption leading-5 text-text-muted">
              충전은 취소할 수 없습니다.
            </p>
          </Card>
        </section>

        {/*
         * 모의 결제라는 사실을 알리는 안내 카드 (프로토타입 L2671-2675).
         *
         * 프로토타입은 `--note`(#F4F6F8) 면 + `--note-b`(#E1E6EB) 테두리이고
         * `design.md:151-152` 가 그 둘을 "안내 카드" 토큰으로 적었다. 토큰 파일에는
         * 아직 그 이름이 없어(`styles/index.css:87` 이 죽은 AI 토큰으로 보고 지웠다)
         * 값이 가장 가까운 `surface-soft`(#F1F3F6) + `divider`(#DFE4EA)로 그렸다.
         * 색값을 화면에 직접 박지 않는다는 토큰 파일 방침을 지키기 위한 것이다.
         *
         * `Card` 를 쓰지 않은 이유 — 면색·테두리를 `className` 으로 덮으면 같은
         * 특이도의 클래스가 둘이 되어 어느 쪽이 이길지 스타일시트 순서에 달린다.
         * `OrderPage` 의 사유 카드도 같은 이유로 인라인 클래스를 쓴다.
         */}
        <div className="rounded-card border border-divider bg-surface-soft p-5">
          <p className="text-body-2 text-text-secondary">
            프로토타입이라 실제 결제는 일어나지 않아요. 금액만 계좌에 반영돼요.
          </p>
        </div>

        {readyMutation.error !== null && (
          <p className="text-caption text-danger">
            {readyErrorMessage(readyMutation.error)}
          </p>
        )}
      </div>

      {/*
       * CTA 는 하나다 (프로토타입 L2678). 위저드의 `다음` 과 단계 되돌리기
       * (`금액·수단 다시 선택`)는 단계가 없어져 함께 사라졌다.
       *
       * 잠금은 남긴다 — `isPending` 동안 눌리지 않아야 `ready` 가 두 번 나가지
       * 않는다(contracts C92).
       */}
      <ActionBar>
        <Button disabled={!canSubmit} onClick={handleReady}>
          {readyMutation.isPending ? '확인하고 있어요' : '입금하기'}
        </Button>
      </ActionBar>
    </PageMain>
  );
}
