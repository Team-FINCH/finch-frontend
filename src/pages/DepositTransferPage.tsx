import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useDepositConfirm } from '@/features/deposit/api/useDepositConfirm';
import { useDepositMockApprove } from '@/features/deposit/api/useDepositMockApprove';
import { DepositResultScreen } from '@/features/deposit/components/DepositResultScreen';
import { isRetryableDepositConfirmError } from '@/features/deposit/lib/depositConfirmRetry';
import { depositConfirmErrorMessage } from '@/features/deposit/lib/depositErrorMessages';
import { ROUTES } from '@/shared/config/routes';
import {
  DEPOSIT_MOCK_APPROVE_SCENARIOS,
  type DepositConfirmRequest,
  type DepositMockApproveScenario,
} from '@/shared/types/deposit';
import { ActionBar } from '@/shared/ui/ActionBar';
import { Button } from '@/shared/ui/Button';
import { PageMain } from '@/shared/ui/PageMain';
import { SubPageHeader } from '@/shared/ui/SubPageHeader';

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
  /*
   * 문구가 아니라 **에러 자체**를 들고 있는다. 실패 화면의 버튼 갈래가 `code` 로
   * 갈리기 때문이다(아래 `phase === 'error'`). 문구는 그릴 때 만든다.
   */
  const [error, setError] = useState<unknown>();
  /**
   * 승인까지는 성공하고 확정에서 실패했을 때의 승인 결과. **재시도가 `confirm`
   * 만 다시 부르게 하려고 들고 있는다** — `mock-approve` 를 다시 부르면 이미
   * 승인된 건이라 `DEPOSIT_INVALID_STATE` 로 막히고, 재시도가 의미 있는 갈래
   * (`DEPOSIT_NOT_APPROVED`)에서도 영영 성공하지 못한다.
   */
  const [approved, setApproved] = useState<DepositConfirmRequest>();
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
      /*
       * 승인이 이미 끝난 건이면 확정만 다시 부른다. `mock-approve` 는 두 번째
       * 호출에서 `DEPOSIT_INVALID_STATE` 로 막히므로, 확정에서 실패한 건을
       * 재시도할 때 이 갈래가 없으면 영영 성공하지 못한다.
       */
      let request = approved;
      if (request === undefined) {
        const res = await mockApprove.mutateAsync({
          paymentId,
          body: { scenario },
        });
        request = {
          paymentId: res.paymentId,
          paymentKey: res.paymentKey,
          amount: res.amount,
        };
        setApproved(request);
      }
      const confirmed = await confirm.mutateAsync(request);
      setResult({
        amount: confirmed.amount,
        cashBalanceAfter: confirmed.cashBalanceAfter,
      });
      setPhase('success');
    } catch (caught) {
      setError(caught);
      setPhase('error');
    }
  }

  if (paymentId === null) {
    return (
      <PageMain>
        <SubPageHeader title="결제 결과" showBack={false} />
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
        <SubPageHeader title="결제 결과" showBack={false} />
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
        <SubPageHeader title="결제 결과" showBack={false} />
        <DepositResultScreen
          variant="success"
          amount={result.amount}
          cashBalanceAfter={result.cashBalanceAfter}
          primaryLabel="매매 시작하기"
          onPrimaryAction={() => navigate(ROUTES.search, { replace: true })}
          secondaryLabel="홈으로"
          onSecondaryAction={() => navigate(ROUTES.home, { replace: true })}
        />
      </PageMain>
    );
  }

  if (phase === 'error') {
    /*
     * 만료도 이 화면이 받는다(위 주석). 버튼 갈래는 `DepositCompletePage` 와
     * 같다 — 한도 초과·금액 불일치만 재시도를 막고 그 밖은 `다시 시도` 를 둔다
     * (이슈 #54 회신 2026-09-11 「다」 · `isRetryableDepositConfirmError`).
     */
    const retryable = isRetryableDepositConfirmError(error);
    return (
      <PageMain>
        <SubPageHeader title="결제 결과" showBack={false} />
        {retryable ? (
          <DepositResultScreen
            variant="error"
            errorMessage={depositConfirmErrorMessage(error)}
            primaryLabel="다시 시도"
            onPrimaryAction={() => void handleApprove()}
            secondaryLabel="홈으로"
            onSecondaryAction={() => navigate(ROUTES.home, { replace: true })}
          />
        ) : (
          <DepositResultScreen
            variant="error"
            errorMessage={depositConfirmErrorMessage(error)}
            primaryLabel="입금 화면으로"
            onPrimaryAction={() => navigate(ROUTES.deposit, { replace: true })}
          />
        )}
      </PageMain>
    );
  }

  return (
    <PageMain className="pb-32">
      {/*
       * 제목은 프로토타입 `isMock` 의 `.navt`(L2683)를 그대로 쓴다 — 사용자가 읽을 말은
       * `계좌이체 승인` 이고 `모의 이체` 는 내부 용어다(prototype-diff.md B절). 뒤로가기의
       * 되돌아갈 곳이 없으면 입금 화면으로 보낸다. 승인 뒤의 결과 화면들은 프로토타입
       * `isPayReturn`(L2714)처럼 제목 `결제 결과` 만 두고 뒤로가기를 빼 이중 확정을 막는다.
       */}
      <SubPageHeader title="계좌이체 승인" fallbackTo={ROUTES.deposit} />
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
