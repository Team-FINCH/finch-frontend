import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useDepositConfirm } from '@/features/deposit/api/useDepositConfirm';
import { useDepositMockApprove } from '@/features/deposit/api/useDepositMockApprove';
import { DepositResultScreen } from '@/features/deposit/components/DepositResultScreen';
import { isDepositExpiredErrorCode } from '@/features/deposit/lib/depositErrorMessages';
import { isHttpError } from '@/shared/api';
import { ROUTES } from '@/shared/config/routes';
import {
  DEPOSIT_MOCK_APPROVE_SCENARIOS,
  type DepositMockApproveScenario,
} from '@/shared/types/deposit';
import { ActionBar } from '@/shared/ui/ActionBar';
import { Button } from '@/shared/ui/Button';
import { PageMain } from '@/shared/ui/PageMain';

/**
 * 모의 이체 — `TRANSFER` 수단의 `checkoutUrl` 도착지. 승인을 흉내 낸다.
 * `POST /deposits/{paymentId}/mock-approve` 로 `{paymentId, paymentKey, amount}` 를
 * 받고 이어서 `confirm` 을 부른다. **두 번 부르는 것이 정상 흐름이다** — 실패
 * 흐름 시연을 위한 `scenario`(`SUCCESS`(기본) · `INSUFFICIENT_BALANCE` ·
 * `LIMIT_EXCEEDED` · `TIMEOUT`) 선택을 둔다 (`ia.md` §1 "결제 복귀 화면과
 * 모의 이체 화면(잠정)").
 *
 * **`ia.md`(2026-09-05판)는 이 라우트를 "(잠정)"·"(미확정)"으로 적었다.** 오늘
 * (2026-09-07) 백엔드 `application.yaml` 의 `transfer-checkout-path` 와 Jira 티켓
 * FINCH-146 으로 확정됐다 — `ia.md` 갱신은 별도다.
 *
 * 티켓: FINCH-146.
 *
 * 근거: `ia.md` §1 "홈·자산" 절 "결제 복귀 화면과 모의 이체 화면(잠정)".
 * API: `POST /api/v1/deposits/{paymentId}/mock-approve` · `POST /api/v1/deposits/confirm`.
 *
 * `confirm` 이 만료 코드(`DEPOSIT_NOT_APPROVED`·`DEPOSIT_PAYMENT_FAILED`)로 실패하면
 * `DepositCompletePage` 와 같은 만료 화면(`DepositResultScreen` 의 `expired`)으로 묶는다.
 */
const SCENARIO_LABELS: Record<DepositMockApproveScenario, string> = {
  SUCCESS: '정상 승인',
  INSUFFICIENT_BALANCE: '잔액 부족으로 실패',
  LIMIT_EXCEEDED: '충전 한도 초과로 실패',
  TIMEOUT: '시간 초과로 실패',
};

type Phase = 'select' | 'processing' | 'success' | 'expired' | 'error';

export function DepositTransferPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = searchParams.get('paymentId');

  const [scenario, setScenario] =
    useState<DepositMockApproveScenario>('SUCCESS');
  const [phase, setPhase] = useState<Phase>('select');
  const [errorMessage, setErrorMessage] = useState<string>();
  const [result, setResult] = useState<{
    amount: number;
    cashBalanceAfter: number;
  }>();

  const mockApprove = useDepositMockApprove();
  const confirm = useDepositConfirm();

  async function handleApprove() {
    if (paymentId === null || phase === 'processing') {
      return;
    }
    setPhase('processing');
    try {
      const approved = await mockApprove.mutateAsync({
        paymentId,
        body: { scenario },
      });
      const confirmed = await confirm.mutateAsync({
        paymentId: approved.paymentId,
        paymentKey: approved.paymentKey,
        amount: approved.amount,
      });
      setResult({
        amount: confirmed.amount,
        cashBalanceAfter: confirmed.cashBalanceAfter,
      });
      setPhase('success');
    } catch (error) {
      const code = isHttpError(error) ? error.code : null;
      if (isDepositExpiredErrorCode(code)) {
        setPhase('expired');
        return;
      }
      setErrorMessage(isHttpError(error) ? error.message : undefined);
      setPhase('error');
    }
  }

  if (paymentId === null) {
    return (
      <PageMain>
        <DepositResultScreen
          variant="error"
          errorMessage="이체할 결제를 찾을 수 없어요."
          primaryLabel="충전으로"
          onPrimaryAction={() => navigate(ROUTES.deposit, { replace: true })}
        />
      </PageMain>
    );
  }

  if (phase === 'processing') {
    return (
      <PageMain>
        <DepositResultScreen
          variant="pending"
          primaryLabel=""
          onPrimaryAction={() => {}}
        />
      </PageMain>
    );
  }

  if (phase === 'success' && result !== undefined) {
    return (
      <PageMain>
        <DepositResultScreen
          variant="success"
          amount={result.amount}
          cashBalanceAfter={result.cashBalanceAfter}
          primaryLabel="확인"
          onPrimaryAction={() => navigate(ROUTES.home, { replace: true })}
        />
      </PageMain>
    );
  }

  if (phase === 'expired') {
    return (
      <PageMain>
        <DepositResultScreen
          variant="expired"
          primaryLabel="다시 충전하기"
          onPrimaryAction={() => navigate(ROUTES.deposit, { replace: true })}
        />
      </PageMain>
    );
  }

  if (phase === 'error') {
    return (
      <PageMain>
        <DepositResultScreen
          variant="error"
          errorMessage={errorMessage}
          primaryLabel="홈으로"
          onPrimaryAction={() => navigate(ROUTES.home, { replace: true })}
        />
      </PageMain>
    );
  }

  return (
    <PageMain className="pb-32">
      <h1 className="text-title-3 text-text-primary">모의 이체</h1>
      <p className="mt-2 text-body-2 text-text-secondary">
        실제 계좌이체 대신 승인을 흉내 내는 화면이에요. 시연용 결과를 골라
        보세요.
      </p>

      <div
        className="mt-6 flex flex-col gap-2.5"
        role="radiogroup"
        aria-label="시연 결과"
      >
        {DEPOSIT_MOCK_APPROVE_SCENARIOS.map((option) => {
          const selected = scenario === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setScenario(option)}
              className={`rounded-sm border px-4 py-3.5 text-left text-body-1 transition-colors duration-(--motion-fast) ${
                selected
                  ? 'border-text-primary bg-primary-soft text-text-primary'
                  : 'border-border-strong bg-surface text-text-primary'
              }`}
            >
              {SCENARIO_LABELS[option]}
            </button>
          );
        })}
      </div>

      <ActionBar>
        <Button onClick={handleApprove}>승인하기</Button>
      </ActionBar>
    </PageMain>
  );
}
