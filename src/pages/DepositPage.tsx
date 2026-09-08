import { useState } from 'react';

import { useAccount } from '@/features/deposit/api/useAccount';
import { useDepositLimit } from '@/features/deposit/api/useDepositLimit';
import { useDepositReady } from '@/features/deposit/api/useDepositReady';
import { AmountInput } from '@/features/deposit/components/AmountInput';
import { PaymentMethodPicker } from '@/features/deposit/components/PaymentMethodPicker';
import { isHttpError, isSchemaError } from '@/shared/api';
import { formatKrw } from '@/shared/lib/formatNumber';
import { type PaymentMethod } from '@/shared/types/deposit';
import { ActionBar } from '@/shared/ui/ActionBar';
import { Button } from '@/shared/ui/Button';
import { PageMain } from '@/shared/ui/PageMain';
import { SoftBox, SoftBoxRow } from '@/shared/ui/SoftBox';

/**
 * 충전 — 모의 결제로 예수금 충전. 4단계(준비 → 결제창 → 승인 → 확정) 중 이 화면이
 * 담당하는 것은 첫 단계(`ready`)까지다. 금액 입력·프리셋, 결제 수단(카카오페이/
 * 계좌이체) 선택, 확인 단계를 거쳐 `checkoutUrl` 로 이동한다 (`ia.md` §1 "홈·자산" 절).
 *
 * 티켓: FINCH-35.
 *
 * 근거: `ia.md` §1 "홈·자산" 표.
 * API: `GET /api/v1/deposits/limit` · `POST /api/v1/deposits/ready` (멱등성 헤더 없음).
 *
 * **중복 호출 방어** — 서버는 `ready`를 연달아 불러도 정리·거절하지 않고 그냥
 * 쌓는다(contracts C92 근거, 프롬프트). 그래서 여기서는 `useDepositReady()`의
 * `isPending` 으로 확인 버튼을 잠근다 — 응답이 오기 전에는 두 번째 클릭 자체가
 * 나가지 않는다.
 */
const DEPOSIT_PRESETS = [10_000, 100_000, 1_000_000] as const;

type Step = 'amount' | 'confirm';

/**
 * `ready` 실패 문구.
 *
 * **`HttpError` 만 그리면 안 된다.** 응답 스키마가 어긋나면 `SchemaError` 가 나오는데,
 * 그것만 걸러 내면 화면에 아무것도 뜨지 않고 버튼만 되돌아와 "눌러도 아무 일이 없다"가
 * 된다. 실제로 그 상태로 배포됐다(FINCH-160). 원인을 사용자에게 설명할 수는 없어도
 * **실패했다는 사실은 반드시 보여야 한다.**
 */
function readyErrorMessage(error: unknown): string {
  if (isHttpError(error)) {
    // 서버가 완성해 준 문구를 그대로 쓴다 (컨벤션 §5).
    return error.message;
  }
  if (isSchemaError(error)) {
    // 사용자가 할 수 있는 일이 없다. 계약 불일치는 우리가 고쳐야 하는 것이라
    // 재시도를 권하지 않고 문의로 보낸다.
    return '충전을 시작하지 못했어요. 문제가 계속되면 알려 주세요.';
  }
  return '충전을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.';
}

export function DepositPage() {
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );

  const limitQuery = useDepositLimit();
  const accountQuery = useAccount();
  const readyMutation = useDepositReady();

  const limit = limitQuery.data;
  const amountError =
    amount !== null && limit !== undefined
      ? amount > limit.perRequestLimit
        ? `한 번에 ${formatKrw(limit.perRequestLimit)}까지 충전할 수 있어요`
        : amount > limit.remainingAmount
          ? `충전할 수 있는 금액을 넘었어요. (잔여 한도: ${formatKrw(limit.remainingAmount)})`
          : undefined
      : undefined;

  const canProceed = amount !== null && amount > 0 && amountError === undefined;

  function handleReady() {
    if (amount === null || paymentMethod === null || readyMutation.isPending) {
      return;
    }
    readyMutation.mutate(
      { amount, paymentMethod },
      {
        onSuccess: (data) => {
          // 카카오 결제창이든 모의 이체 화면이든 checkoutUrl 하나로 이동한다(ia.md §1).
          window.location.assign(data.checkoutUrl);
        },
      },
    );
  }

  return (
    <PageMain className="pb-32">
      <h1 className="text-title-3 text-text-primary">충전</h1>

      {step === 'amount' && (
        <div className="mt-6 flex flex-col gap-6">
          <AmountInput
            label="충전할 금액"
            value={amount}
            onChange={setAmount}
            presets={DEPOSIT_PRESETS}
            errorMessage={amountError}
          />

          {limit !== undefined && (
            <SoftBox>
              <SoftBoxRow
                label="1회 충전 한도"
                value={formatKrw(limit.perRequestLimit)}
              />
              <SoftBoxRow
                label="남은 누적 한도"
                value={formatKrw(limit.remainingAmount)}
                divided
              />
            </SoftBox>
          )}

          <div>
            <p className="mb-2.5 text-label text-text-secondary">결제 수단</p>
            <PaymentMethodPicker
              value={paymentMethod}
              onChange={setPaymentMethod}
            />
          </div>
        </div>
      )}

      {step === 'confirm' && amount !== null && paymentMethod !== null && (
        <div className="mt-6 flex flex-col gap-6">
          <SoftBox>
            <SoftBoxRow
              label="결제 수단"
              value={paymentMethod === 'KAKAOPAY' ? '카카오페이' : '계좌이체'}
            />
            <SoftBoxRow label="충전 금액" value={formatKrw(amount)} divided />
            {accountQuery.data !== undefined && (
              <SoftBoxRow
                label="충전 후 예수금"
                value={formatKrw(accountQuery.data.cashBalance + amount)}
                divided
              />
            )}
          </SoftBox>

          <p className="text-caption text-text-muted">
            충전은 취소할 수 없습니다.
          </p>

          {readyMutation.error !== null && (
            <p className="text-caption text-danger">
              {readyErrorMessage(readyMutation.error)}
            </p>
          )}

          <button
            type="button"
            onClick={() => setStep('amount')}
            className="text-label text-text-secondary underline"
          >
            금액·수단 다시 선택
          </button>
        </div>
      )}

      <ActionBar>
        {step === 'amount' ? (
          <Button disabled={!canProceed} onClick={() => setStep('confirm')}>
            다음
          </Button>
        ) : (
          <Button disabled={readyMutation.isPending} onClick={handleReady}>
            {readyMutation.isPending ? '확인하고 있어요' : '충전하기'}
          </Button>
        )}
      </ActionBar>
    </PageMain>
  );
}
