import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useDepositConfirm } from '@/features/deposit/api/useDepositConfirm';
import { DepositResultScreen } from '@/features/deposit/components/DepositResultScreen';
import { isRetryableDepositConfirmError } from '@/features/deposit/lib/depositConfirmRetry';
import { depositConfirmErrorMessage } from '@/features/deposit/lib/depositErrorMessages';
import { parsePositiveIntParam } from '@/features/deposit/lib/queryParams';
import { ROUTES } from '@/shared/config/routes';
import { type DepositConfirmResponse } from '@/shared/types/deposit';
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
 *
 * **확정 결과를 뮤테이션 상태가 아니라 이 화면의 상태로 들고 있는다.** 전에는
 * `confirmMutation.mutate()` 를 부르고 `isPending`·`isError`·`data` 로 갈랐는데,
 * 카카오 경로가 `확인하고 있어요` 에서 영영 멈췄다. 원인은 **마운트 이펙트에서
 * 시작한 뮤테이션이 `StrictMode` 에서 관측자를 잃는 것**이다.
 *
 *   1. 마운트 이펙트가 `mutate()` 를 부른다. `MutationObserver` 가 뮤테이션에 붙는다
 *   2. `StrictMode` 가 마운트를 한 번 되감는다 → `useSyncExternalStore` 구독 해제 →
 *      `MutationObserver.onUnsubscribe()` 가 `mutation.removeObserver(this)` 를 부른다
 *   3. 다시 마운트되며 재구독하지만 **`MutationObserver` 에는 `onSubscribe` 가 없어
 *      뮤테이션에 다시 붙지 않는다**(`@tanstack/query-core@5.101.4` `mutationObserver.js`)
 *   4. 응답이 와도 `Mutation.#dispatch` 가 도는 관측자 목록에 우리가 없다. 요청은
 *      성공하는데 화면 상태만 `pending` 에 굳는다
 *
 * 이벤트 핸들러에서 부르는 뮤테이션은 이 순환이 이미 끝난 뒤라 멀쩡하다. 마운트
 * 이펙트에서 시작하는 이 화면만 걸렸다. 그래서 **결과를 `mutateAsync` 가 돌려주는
 * 프로미스에서 읽는다** — 그 프로미스는 관측자와 무관하게 `Mutation.execute()` 가
 * 그대로 돌려주는 값이라 구독이 끊겨도 정상적으로 풀린다. 모의 이체 화면
 * (`DepositTransferPage`)이 원래 이 모양이었고, 그 화면이 멀쩡했던 이유이기도 하다.
 */
type ConfirmPhase = 'pending' | 'success' | 'error';

/**
 * 결제 결과 네 갈래가 같은 껍데기와 같은 헤더를 쓴다 (FINCH-297).
 * 앱 셸(`h-dvh flex-col overflow-hidden`)이 없으면 `PageMain` 의
 * `flex-1 overflow-y-auto` 가 아무것도 자르지 않아 문서가 통째로 굴러간다 —
 * 근거는 `shared/ui/PageMain` 머리 주석이다. 갈래마다 네 번 적는 대신 여기 모은다.
 */
function PaymentResultShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <PageMain>
        <SubPageHeader title="결제 결과" showBack={false} />
        {children}
      </PageMain>
    </div>
  );
}

export function DepositCompletePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const confirmMutation = useDepositConfirm();
  const hasRequested = useRef(false);

  const [phase, setPhase] = useState<ConfirmPhase>('pending');
  const [result, setResult] = useState<DepositConfirmResponse>();
  /* 문구가 아니라 **에러 자체**를 들고 있는다. 실패 화면의 버튼 갈래가 `code` 로
     갈리기 때문이다(아래 `phase === 'error'`). 문구는 그릴 때 만든다. */
  const [error, setError] = useState<unknown>();

  // `paymentId`·`amount` 는 서버 계약이 숫자다(apiSpec §4.4). 쿼리는 언제나 문자열로
  // 오므로 여기서 한 번 바꾸고, 바꿀 수 없는 값은 아래 "결제 정보를 확인할 수 없어요" 로 떨군다.
  const paymentId = parsePositiveIntParam(searchParams.get('paymentId'));
  const paymentKey = searchParams.get('paymentKey');
  const amount = parsePositiveIntParam(searchParams.get('amount'));

  /**
   * 확정을 한 번 보내고 결과를 이 화면의 상태에 옮긴다.
   *
   * **`async`/`await` 가 아니라 프로미스 콜백으로 쓴다.** 이 함수를 마운트
   * 이펙트가 부르는데, `await` 뒤의 `setState` 는 `react-hooks/set-state-in-effect`
   * 가 이펙트 본문의 동기 `setState` 와 같이 본다. 콜백 안의 `setState` 는 그
   * 규칙이 명시적으로 허용하는 모양이다("외부 상태가 바뀔 때 콜백에서 부른다").
   */
  function runConfirm(
    request: Parameters<typeof confirmMutation.mutateAsync>[0],
  ): void {
    void confirmMutation
      .mutateAsync(request)
      .then((confirmed) => {
        setResult(confirmed);
        setPhase('success');
      })
      .catch((caught: unknown) => {
        setError(caught);
        setPhase('error');
      });
  }

  useEffect(() => {
    if (hasRequested.current) {
      return;
    }
    if (paymentId === null || paymentKey === null || amount === null) {
      return;
    }
    // `StrictMode` 의 두 번째 마운트에서 확정이 또 나가지 않게 막는다. ref 는 그
    // 되감기를 넘어 살아남는다 — 위 머리 주석이 막지 못한 쪽(관측자)과 다른 문제다.
    hasRequested.current = true;
    runConfirm({ paymentId, paymentKey, amount });
    // runConfirm 은 매 렌더 새 참조라 의존성에서 뺀다 — paymentId 등 쿼리값만 본다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, paymentKey, amount]);

  if (paymentId === null || paymentKey === null || amount === null) {
    return (
      <PaymentResultShell>
        <DepositResultScreen
          variant="error"
          errorMessage="결제 정보를 확인할 수 없어요."
          primaryLabel="홈으로"
          onPrimaryAction={() => navigate(ROUTES.home, { replace: true })}
        />
      </PaymentResultShell>
    );
  }

  if (phase === 'pending') {
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

  if (phase === 'error') {
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
    const retryable = isRetryableDepositConfirmError(error);
    return (
      <PaymentResultShell>
        {retryable ? (
          <DepositResultScreen
            variant="error"
            errorMessage={depositConfirmErrorMessage(error)}
            primaryLabel="다시 시도"
            /* 확정 중 화면으로 되돌린 뒤 같은 요청을 다시 보낸다. `confirm` 은
               `paymentKey` 기준 멱등이라 재호출이 입금을 두 번 만들지 않는다(C85). */
            onPrimaryAction={() => {
              setPhase('pending');
              runConfirm({ paymentId, paymentKey, amount });
            }}
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
            errorMessage={depositConfirmErrorMessage(error)}
            primaryLabel="입금 화면으로"
            onPrimaryAction={() => navigate(ROUTES.deposit, { replace: true })}
          />
        )}
      </PaymentResultShell>
    );
  }

  // `phase` 가 셋뿐이라 여기까지 오면 성공이다. `result` 를 좁히려고만 두는 줄이다.
  if (result === undefined) {
    return null;
  }

  /*
   * 주 동작 `매매 시작하기`, 보조 `홈으로` 둘이다(`design.md:964`). 주 동작이
   * 가는 곳은 프로토타입이 홈의 **탐색 탭**(`app-logic.js` `payPrimary` —
   * `tab:"explore"`)이라고 적었고, 우리 IA 에서 그 탭은 `/search` 다
   * (`ia.md` §3 하단 탭바 · `BOTTOM_TAB_ROUTES`).
   *
   * 프로토타입도 성공일 때 주 `매매 시작하기` · 보조 `홈으로` 둘을 둔다
   * (`payPrimaryLabel`·`paySecondaryLabel` 의 `payResult==="ok"` 갈래).
   */
  if (phase !== 'success' || result === undefined) {
    return null;
  }
  return (
    <PaymentResultShell>
      <DepositResultScreen
        variant="success"
        amount={result.amount}
        cashBalanceAfter={result.cashBalanceAfter}
        primaryLabel="매매 시작하기"
        onPrimaryAction={() => navigate(ROUTES.search, { replace: true })}
        secondaryLabel="홈으로"
        onSecondaryAction={() => navigate(ROUTES.home, { replace: true })}
      />
    </PaymentResultShell>
  );
}
