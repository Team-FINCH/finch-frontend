import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useDepositConfirm } from '@/features/deposit/api/useDepositConfirm';
import { DepositResultScreen } from '@/features/deposit/components/DepositResultScreen';
import { isRetryableDepositConfirmError } from '@/features/deposit/lib/depositConfirmRetry';
import { depositConfirmErrorMessage } from '@/features/deposit/lib/depositErrorMessages';
import { parsePositiveIntParam } from '@/features/deposit/lib/queryParams';
import { ROUTES } from '@/shared/config/routes';
import { PageMain } from '@/shared/ui/PageMain';
import { SubPageHeader } from '@/shared/ui/SubPageHeader';

/**
 * 결제 복귀(성공) — 카카오페이 승인 뒤 돌아오는 자리. 카카오가 서버의
 * `GET /deposits/kakao/approval` 로 리다이렉트하면, 서버가 이 화면으로
 * `?paymentId&paymentKey&amount` 쿼리를 실어 `302` 를 보낸다. 이 화면의 유일한 일은
 * 그 쿼리를 읽어 `POST /deposits/confirm` 을 부르는 것이다 (`ia.md` §1 "결제 복귀 화면").
 *
 * **`ia.md`(2026-09-05판)는 이 라우트를 "(잠정)"·"(미확정)"으로 적었다.** 오늘
 * (2026-09-07) 백엔드 `application.yaml` 의 `success-path` 와 Jira 티켓 FINCH-145
 * 로 확정됐다 — `ia.md` 갱신은 별도다.
 *
 * 티켓: FINCH-145.
 *
 * 근거: `ia.md` §1 "홈·자산" 절 "결제 복귀 화면과 모의 이체 화면(잠정)".
 * API: `POST /api/v1/deposits/confirm` (`Idempotency-Key` 안 씀 — `paymentKey` 가 멱등 기준).
 *
 * **만료 처리** — 시한이 지난 뒤 `confirm` 을 부르면 `DEPOSIT_NOT_APPROVED` 또는
 * `DEPOSIT_PAYMENT_FAILED` 둘 중 하나가 온다(만료 정리 배치가 하루 1회만 돌아서
 * DB 상태가 갈리기 때문). **만료 전용 화면은 없다** — `design.md:967` 이 "결제
 * 만료(15분)도 실패 상태로 처리하고 별도 화면을 만들지 않는다" 고 명시했으므로,
 * 두 코드는 실패 화면의 문구 하나로 묶인다(`depositConfirmErrorMessage`).
 *
 * 돌아갈 곳 — 예수금 부족으로 충전에 왔다가 원래 화면(주문 등)으로 복귀하는 경로는
 * `redirect` 쿼리를 실어 보낼 수 있는지가 복귀 URL 형태에 달렸는데 그 값을 아직
 * 받지 못했다(`ia.md` §3, 미확정 P23). 이 화면은 그 경로를 가정하지 않고 항상 홈으로
 * 돌려보낸다 — 회신이 오면 그때 복귀 경로를 설계한다(ia.md 자체가 "불확실"로 적어 둔 자리다).
 */
export function DepositCompletePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const confirmMutation = useDepositConfirm();
  const hasRequested = useRef(false);

  // `paymentId`·`amount` 는 서버 계약이 숫자다(apiSpec §4.4). 쿼리는 언제나 문자열로
  // 오므로 여기서 한 번 바꾸고, 바꿀 수 없는 값은 아래 "결제 정보를 확인할 수 없어요" 로 떨군다.
  const paymentId = parsePositiveIntParam(searchParams.get('paymentId'));
  const paymentKey = searchParams.get('paymentKey');
  const amount = parsePositiveIntParam(searchParams.get('amount'));

  useEffect(() => {
    if (hasRequested.current) {
      return;
    }
    if (paymentId === null || paymentKey === null || amount === null) {
      return;
    }
    hasRequested.current = true;
    confirmMutation.mutate({ paymentId, paymentKey, amount });
    // confirmMutation 은 매 렌더 새 참조라 의존성에서 뺀다 — paymentId 등 쿼리값만 본다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, paymentKey, amount]);

  if (paymentId === null || paymentKey === null || amount === null) {
    return (
      <PageMain>
        <SubPageHeader title="결제 결과" showBack={false} />
        <DepositResultScreen
          variant="error"
          errorMessage="결제 정보를 확인할 수 없어요."
          primaryLabel="홈으로"
          onPrimaryAction={() => navigate(ROUTES.home, { replace: true })}
        />
      </PageMain>
    );
  }

  if (confirmMutation.isPending || confirmMutation.isIdle) {
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

  if (confirmMutation.isError) {
    /*
     * 확정 실패는 코드를 가리지 않고 **한 화면이다**(위 "만료 처리"). 화면은
     * 그대로 두고 **버튼만 두 갈래로 갈린다** — 이슈 #54 회신(2026-09-11) 「다」.
     *
     * 전에는 어느 코드든 입금 화면으로만 되돌렸다. "확정에서 막힌 건은 `FAILED`
     * 로 굳는다"고 보고 그렇게 정했는데(`ia.md:85` · contracts C85), 백엔드를
     * 읽어 보니 그렇지 않은 갈래가 있었다 — `READY` 에서 나는
     * `DEPOSIT_NOT_APPROVED` 는 승인 반영이 늦어 생기는 것이라 다시 부르면
     * 성공하고, `confirm` 자체가 멱등이라 재호출이 입금을 두 번 만들지도 않는다.
     * 판정은 `isRetryableDepositConfirmError` 가 하고 근거도 그쪽에 적었다.
     */
    const retryable = isRetryableDepositConfirmError(confirmMutation.error);
    return (
      <PageMain>
        <SubPageHeader title="결제 결과" showBack={false} />
        {retryable ? (
          <DepositResultScreen
            variant="error"
            errorMessage={depositConfirmErrorMessage(confirmMutation.error)}
            primaryLabel="다시 시도"
            onPrimaryAction={() =>
              confirmMutation.mutate({ paymentId, paymentKey, amount })
            }
            secondaryLabel="홈으로"
            onSecondaryAction={() => navigate(ROUTES.home, { replace: true })}
          />
        ) : (
          /*
           * 한도 초과·금액 불일치는 서버가 건을 닫아 재시도가 절대 성공하지
           * 않는다. 다시 하려면 금액부터 새로 잡아야 하므로 입금 화면 하나만 둔다.
           */
          <DepositResultScreen
            variant="error"
            errorMessage={depositConfirmErrorMessage(confirmMutation.error)}
            primaryLabel="입금 화면으로"
            onPrimaryAction={() => navigate(ROUTES.deposit, { replace: true })}
          />
        )}
      </PageMain>
    );
  }

  /*
   * 주 동작 `매매 시작하기`, 보조 `홈으로` 둘이다(`design.md:964`). 주 동작이
   * 가는 곳은 프로토타입이 홈의 **탐색 탭**(`app-logic.js` `payPrimary` —
   * `tab:"explore"`)이라고 적었고, 우리 IA 에서 그 탭은 `/search` 다
   * (`ia.md` §3 하단 탭바 · `BOTTOM_TAB_ROUTES`).
   */
  return (
    <PageMain>
      <SubPageHeader title="결제 결과" showBack={false} />
      <DepositResultScreen
        variant="success"
        amount={confirmMutation.data.amount}
        cashBalanceAfter={confirmMutation.data.cashBalanceAfter}
        primaryLabel="매매 시작하기"
        onPrimaryAction={() => navigate(ROUTES.search, { replace: true })}
        secondaryLabel="홈으로"
        onSecondaryAction={() => navigate(ROUTES.home, { replace: true })}
      />
    </PageMain>
  );
}
