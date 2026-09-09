import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useDepositConfirm } from '@/features/deposit/api/useDepositConfirm';
import { useDepositMockApprove } from '@/features/deposit/api/useDepositMockApprove';
import { DepositResultScreen } from '@/features/deposit/components/DepositResultScreen';
import { depositConfirmErrorMessage } from '@/features/deposit/lib/depositErrorMessages';
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
 * `confirm` 이 만료 코드(`DEPOSIT_NOT_APPROVED`·`DEPOSIT_PAYMENT_FAILED`)로 실패해도
 * **전용 화면으로 가지 않는다** — `design.md:967` 이 만료를 실패 상태로 처리하라고
 * 명시했으므로 `DepositCompletePage` 와 같이 실패 화면의 문구로만 갈린다.
 */
const SCENARIO_LABELS: Record<DepositMockApproveScenario, string> = {
  SUCCESS: '정상 승인',
  INSUFFICIENT_BALANCE: '잔액 부족으로 실패',
  LIMIT_EXCEEDED: '입금 한도 초과로 실패',
  TIMEOUT: '시간 초과로 실패',
};

type Phase = 'select' | 'processing' | 'success' | 'error';

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
      setErrorMessage(depositConfirmErrorMessage(error));
      setPhase('error');
    }
  }

  if (paymentId === null) {
    return (
      <PageMain>
        <DepositResultScreen
          variant="error"
          errorMessage="이체할 결제를 찾을 수 없어요."
          primaryLabel="입금으로"
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

  if (phase === 'error') {
    /*
     * 만료도 이 화면이 받는다(위 주석). 주 동작은 `DepositCompletePage` 와 같은
     * 이유로 입금 화면으로 되돌리는 것이다 — 확정에서 막힌 건은 되살릴 수 없고
     * 처음부터 다시 하는 경로만 준다(`ia.md:85` · contracts C85).
     */
    return (
      <PageMain>
        <DepositResultScreen
          variant="error"
          errorMessage={errorMessage}
          primaryLabel="다시 충전하기"
          onPrimaryAction={() => navigate(ROUTES.deposit, { replace: true })}
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
