import { useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useDepositConfirm } from '@/features/deposit/api/useDepositConfirm';
import { useDepositMockApprove } from '@/features/deposit/api/useDepositMockApprove';
import { DepositResultScreen } from '@/features/deposit/components/DepositResultScreen';
import { isRetryableDepositConfirmError } from '@/features/deposit/lib/depositConfirmRetry';
import { depositConfirmErrorMessage } from '@/features/deposit/lib/depositErrorMessages';
import { parsePositiveIntParam } from '@/features/deposit/lib/queryParams';
import { ROUTES } from '@/shared/config/routes';
import { formatKrw } from '@/shared/lib/formatNumber';
import {
  DEPOSIT_MOCK_APPROVE_SCENARIOS,
  type DepositConfirmRequest,
  type DepositMockApproveScenario,
} from '@/shared/types/deposit';
import { ActionBar } from '@/shared/ui/ActionBar';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
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
/**
 * 시나리오 라벨. **프로토타입의 짧은 쪽을 쓴다** (`scenarios` —
 * `성공`·`잔액 부족`·`한도 초과`·`시간 초과`). 전에는 `정상 승인`·`잔액 부족으로
 * 실패` 처럼 서술형으로 늘여 적었는데, 절 제목이 이미 `응답 시나리오` 라 뒤에
 * 붙인 `…으로 실패` 가 같은 말을 두 번 하는 것이 된다. 넷이 한 묶음으로 읽혀야
 * 고르기 쉬운 자리다.
 */
const SCENARIO_LABELS: Record<DepositMockApproveScenario, string> = {
  SUCCESS: '성공',
  INSUFFICIENT_BALANCE: '잔액 부족',
  LIMIT_EXCEEDED: '한도 초과',
  TIMEOUT: '시간 초과',
};

/** 절 제목. 프로토타입 `.sh`>`.sht` 실측 — 18px/700 · 자간 -.01em. */
const SECTION_TITLE_CLASS =
  'text-title-3 font-bold tracking-[-.01em] text-text-primary';

type Phase = 'select' | 'processing' | 'success' | 'error';

/**
 * 결제 결과 네 갈래가 같은 껍데기와 같은 헤더를 쓴다 (FINCH-297).
 * 앱 셸(`h-dvh flex-col overflow-hidden`)이 없으면 `PageMain` 의
 * `flex-1 overflow-y-auto` 가 아무것도 자르지 않아 문서가 통째로 굴러간다 —
 * 근거는 `shared/ui/PageMain` 머리 주석이다. 갈래마다 네 번 적는 대신 여기 모은다.
 */
function PaymentResultShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <SubPageHeader title="결제 결과" showBack={false} />
      <PageMain>{children}</PageMain>
    </div>
  );
}

export function DepositTransferPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = searchParams.get('paymentId');
  /*
   * 입금 금액은 쿼리로 온다. **서버가 실어 주는 값이 아니다** — `MockTransferGateway`
   * 는 `checkoutUrl` 에 `?paymentId` 만 붙인다(C90). 이 쿼리는 `DepositPage` 가
   * `ready` 응답의 `amount` 를 받아 라우터로 넘길 때 직접 붙인 것이다
   * (`withAmountParam`). 금액 카드가 계속 `—` 로 떴던 것이 이 때문이다.
   *
   * **그래도 없을 수 있어서 `null` 을 견딘다** — 이 주소를 붙여넣기로 직접 열거나,
   * 나중에 서버가 `checkoutUrl` 모양을 바꾸는 경우다. 없으면 금액 자리만 비우고
   * 나머지는 그대로 그린다. 승인에 쓰는 값이 아니라서(확정에 넣는 금액은
   * `mock-approve` 응답이 준다) 없다고 해서 이 화면이 막히지는 않는다.
   */
  const amount = parsePositiveIntParam(searchParams.get('amount'));

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
      <PaymentResultShell>
        <DepositResultScreen
          variant="error"
          errorMessage="이체할 결제를 찾을 수 없어요."
          primaryLabel="입금으로"
          onPrimaryAction={() => navigate(ROUTES.deposit, { replace: true })}
        />
      </PaymentResultShell>
    );
  }

  if (phase === 'processing') {
    return (
      <PaymentResultShell>
        <DepositResultScreen
          variant="pending"
          primaryLabel=""
          onPrimaryAction={() => {}}
        />
      </PaymentResultShell>
    );
  }

  if (phase === 'success' && result !== undefined) {
    /*
     * 성공의 출구는 `홈으로` 하나다 (QA 피드백 2026-09-22). 사유는
     * `DepositCompletePage` 의 같은 자리에 적었다 — 두 화면이 같아야 한다.
     */
    return (
      <PaymentResultShell>
        <DepositResultScreen
          variant="success"
          amount={result.amount}
          cashBalanceAfter={result.cashBalanceAfter}
          primaryLabel="홈으로"
          onPrimaryAction={() => navigate(ROUTES.home, { replace: true })}
        />
      </PaymentResultShell>
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
      <PaymentResultShell>
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
      </PaymentResultShell>
    );
  }

  /*
   * 화면 차례는 프로토타입 `isMock`(L2723-2752) 그대로다 — **금액·결제 건 카드가
   * 맨 위**, 그 다음이 `응답 시나리오` 절, 설명 문구는 **맨 아래 회색 안내 카드**.
   * 전에는 설명 문구가 맨 위에 있고 금액이 아예 없었다. 이 화면에서 확인해야 하는
   * 것은 "얼마를, 어느 건을" 승인하는가이고, 모의 화면이라는 안내는 한 번 읽으면
   * 다시 볼 필요가 없는 글이라 아래가 맞다.
   */
  return (
    <div className="flex h-dvh flex-col overflow-hidden [--page-bottom-space:8rem]">
      {/* 앱 셸 — 본문만 이 안에서 굴러간다 (FINCH-297, `shared/ui/PageMain` 주석). */}
      {/* 8rem 은 이 화면이 `pb-32` 로 들고 있던 값 그대로다. */}
      {/*
       * 제목은 프로토타입 `isMock` 의 `.navt`(L2683)를 그대로 쓴다 — 사용자가 읽을 말은
       * `계좌이체 승인` 이고 `모의 이체` 는 내부 용어다(prototype-diff.md B절). 뒤로가기의
       * 되돌아갈 곳이 없으면 입금 화면으로 보낸다. 승인 뒤의 결과 화면들은 프로토타입
       * `isPayReturn`(L2714)처럼 제목 `결제 결과` 만 두고 뒤로가기를 빼 이중 확정을 막는다.
       */}
      <SubPageHeader title="계좌이체 승인" fallbackTo={ROUTES.deposit} />
      <PageMain>
        {/* 섹션 간격 32px 은 프로토타입 `.sec{margin-top:32px}` 실측값이다. */}
        <div className="mt-8 flex flex-col gap-8">
          {/*
           * 승인 대상 카드. 줄 둘의 모양이 서로 달라 `DepositSummaryRow` 를 쓰지
           * 않았다 — 그쪽은 "큰 값 = 구분선 아래 합계" 를 전제하는데, 여기서는 큰
           * 값(입금 금액)이 **첫 줄**이고 구분선 아래 줄(결제 건)이 오히려 작다
           * (프로토타입 L2727-2729).
           */}
          <Card>
            <div className="flex items-center justify-between gap-3">
              <span className="text-body-2 text-text-secondary">입금 금액</span>
              <span className="text-[19px] font-bold tracking-[-0.01em] text-text-primary tabular-nums">
                {amount === null ? '—' : formatKrw(amount)}
              </span>
            </div>
            {/*
             * 프로토타입은 `PAY-20260908-0417` 같은 결제 참조번호를 보여주는데 우리가
             * 가진 값은 서버 채번 `paymentId`(숫자) 하나다(apiSpec §4.2). 문자열을
             * 지어내지 않고 그 값을 그대로 적는다 — 문의할 때 대는 번호라 화면에 보이는
             * 것과 서버가 아는 것이 같아야 한다.
             */}
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
              <span className="text-body-2 text-text-secondary">결제 건</span>
              <span className="text-body-2 text-text-secondary tabular-nums">
                {paymentId}
              </span>
            </div>
          </Card>

          <section>
            {/* `.sh` 실측 — baseline 정렬 · 양끝 배치 · 아래 여백 14px.
              우측 보조 라벨은 `.cp`(13px `--t3`)다. */}
            <div className="mb-3.5 flex items-baseline justify-between gap-3">
              <h2 className={SECTION_TITLE_CLASS}>응답 시나리오</h2>
              <span className="flex-none text-caption text-text-muted">
                시연용
              </span>
            </div>

            <div
              className="flex flex-col gap-2.5"
              role="radiogroup"
              aria-label="응답 시나리오"
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
                    /* 카드 모양은 프로토타입 `.card.d`(반경 12px · 안쪽 16px)이고
                     고른 것만 테두리가 진해진다. 면색은 바꾸지 않는다 — 프로토타입이
                     테두리 하나로만 표시한다. */
                    className={`flex w-full items-center gap-3 rounded-card border bg-surface p-4 text-left transition-colors duration-(--motion-fast) ${
                      selected ? 'border-text-primary' : 'border-border'
                    }`}
                  >
                    {/*
                     * 라디오 원은 알림함 기록 시트(`features/inbox/components/RecordSheet`)
                     * 와 같은 모양이다 — 19px 원 · 테두리 1.5px · 안쪽 점 9px. 프로토타입은
                     * 20px 원에 `border:6px solid` 로 가운데를 채우는 방식인데, 같은 앱을
                     * 두 가지 라디오로 그리지 않으려고 팀이 이미 쓰는 쪽을 따랐다.
                     */}
                    <span
                      aria-hidden="true"
                      className={`flex size-[19px] flex-none items-center justify-center rounded-full border-[1.5px] ${
                        selected
                          ? 'border-text-primary'
                          : 'border-border-strong'
                      }`}
                    >
                      {selected && (
                        <span className="size-[9px] rounded-full bg-text-primary" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 text-body-1 font-medium text-text-primary">
                      {SCENARIO_LABELS[option]}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/*
           * 모의 화면이라는 안내. 문구는 프로토타입 원문(L2746)이다. 면과 테두리는
           * 안내 카드 전용 토큰을 쓰고 `Card` 를 쓰지 않는다 — 이유는 `DepositPage`
           * 의 같은 카드 주석에 적었다(같은 특이도 클래스가 둘이 되는 문제).
           */}
          <div className="rounded-card border border-note-border bg-note-surface p-5">
            <p className="text-body-2 leading-[22px] text-text-secondary">
              은행 이체 승인을 흉내 내는 화면이에요. 실제 이체는 일어나지
              않아요.
            </p>
          </div>
        </div>

        <ActionBar>
          <Button onClick={handleApprove}>승인하기</Button>
        </ActionBar>
      </PageMain>
    </div>
  );
}
