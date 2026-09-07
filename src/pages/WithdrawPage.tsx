import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAccount } from '@/features/deposit/api/useAccount';
import { useWithdrawal } from '@/features/deposit/api/useWithdrawal';
import { AmountInput } from '@/features/deposit/components/AmountInput';
import { isHttpError } from '@/shared/api';
import { ORDER_QUANTITY_RATIO_PRESETS } from '@/shared/config/apiContract';
import { ROUTES } from '@/shared/config/routes';
import { formatKrw } from '@/shared/lib/formatNumber';
import { generateIdempotencyKey } from '@/shared/lib/idempotencyKey';
import { type IdempotencyKey } from '@/shared/types/primitives';
import { ActionBar } from '@/shared/ui/ActionBar';
import { Button } from '@/shared/ui/Button';
import { PageMain } from '@/shared/ui/PageMain';
import { SoftBox, SoftBoxRow } from '@/shared/ui/SoftBox';

/**
 * 출금 — 예수금을 뺀다. 입력은 금액 하나뿐이다(은행·계좌번호 없음). 출금 가능액은
 * `GET /account` 의 `cashBalance` 전액이고 별도 한도가 없다 (`ia.md` §1 "출금 화면").
 * 진입점은 마이페이지다.
 *
 * 티켓: FINCH-138.
 *
 * 근거: `ia.md` §1 "홈·자산" 표, "출금 화면" 절.
 * API: `GET /api/v1/account` · `POST /api/v1/withdrawals` (`Idempotency-Key` 필수).
 *
 * **비율·최대 버튼의 분모는 `cashBalance` 다** — 출금 한도 조회 API 가 없어서다
 * (ia.md §1). 프리셋 금액 버튼과 별도 확인 단계는 명세에 없어 만들지 않았다.
 *
 * **멱등성 키** — 같은 금액으로 다시 누르면(예: `IDEMPOTENCY_IN_PROGRESS` 뒤 재시도)
 * 같은 키를 재사용하고, 금액을 바꾸면 다음 제출에서 새 키를 만든다
 * (`shared/lib/idempotencyKey.ts`).
 */
export function WithdrawPage() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState<number | null>(null);
  /**
   * 마지막 제출 시도의 금액·키. 금액이 그대로면(같은 클릭의 재시도) 같은 키를
   * 재사용하고, 금액이 바뀌면(새 시도) 새 키를 만든다 — `useEffect` 로 상태를
   * 동기화하지 않고 `handleSubmit` 안에서만 판정해 렌더 중 setState 를 피한다.
   */
  const lastAttempt = useRef<{ amount: number; key: IdempotencyKey } | null>(
    null,
  );

  const accountQuery = useAccount();
  const withdrawal = useWithdrawal();
  const cashBalance = accountQuery.data?.cashBalance;

  const amountError =
    amount !== null && cashBalance !== undefined && amount > cashBalance
      ? `출금 가능 금액을 초과했습니다. (출금 가능: ${formatKrw(cashBalance)})`
      : undefined;

  const canSubmit =
    amount !== null &&
    amount > 0 &&
    amountError === undefined &&
    !withdrawal.isPending;

  function handleSubmit() {
    if (!canSubmit || amount === null) {
      return;
    }
    const stored = lastAttempt.current;
    const key =
      stored !== null && stored.amount === amount
        ? stored.key
        : generateIdempotencyKey();
    lastAttempt.current = { amount, key };
    withdrawal.mutate(
      { body: { amount }, idempotencyKey: key },
      {
        onSuccess: () => navigate(ROUTES.my),
      },
    );
  }

  return (
    <PageMain className="pb-32">
      <h1 className="text-title-3 text-text-primary">출금</h1>

      <div className="mt-6 flex flex-col gap-6">
        <AmountInput
          label="출금할 금액"
          value={amount}
          onChange={setAmount}
          errorMessage={amountError}
        />

        {cashBalance !== undefined && (
          <div className="flex gap-2">
            {ORDER_QUANTITY_RATIO_PRESETS.map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => setAmount(Math.floor(cashBalance * ratio))}
                className="flex-1 rounded-sm border border-border-strong bg-surface py-2.5 text-label text-text-primary"
              >
                {Math.round(ratio * 100)}%
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAmount(cashBalance)}
              className="flex-1 rounded-sm border border-border-strong bg-surface py-2.5 text-label text-text-primary"
            >
              최대
            </button>
          </div>
        )}

        {cashBalance !== undefined && (
          <SoftBox>
            <SoftBoxRow label="출금 가능 금액" value={formatKrw(cashBalance)} />
          </SoftBox>
        )}

        {/*
         * TODO(계약): 출금해도 충전 누적 한도(depositedAmount)는 돌아오지 않는다는
         * 안내가 필요하다고 명세는 요구하지만(apiSpec §4.5) 문안을 정해 주지 않았다
         * (ia.md §1 "출금 화면"). 아래는 임시 문안이고, 확정 문안이 오면 교체한다.
         */}
        <p className="text-caption text-text-muted">
          출금해도 충전할 수 있는 한도는 늘어나지 않아요.
        </p>

        {isHttpError(withdrawal.error) && (
          <p className="text-caption text-danger">{withdrawal.error.message}</p>
        )}
      </div>

      <ActionBar>
        <Button disabled={!canSubmit} onClick={handleSubmit}>
          {withdrawal.isPending ? '출금하고 있어요' : '출금하기'}
        </Button>
      </ActionBar>
    </PageMain>
  );
}
