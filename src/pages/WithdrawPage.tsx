import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAccount } from '@/features/deposit/api/useAccount';
import { useWithdrawal } from '@/features/deposit/api/useWithdrawal';
import { AmountInput } from '@/features/deposit/components/AmountInput';
import { isHttpError } from '@/shared/api';
import { ROUTES } from '@/shared/config/routes';
import { showToast } from '@/shared/hooks/useToastStore';
import { formatKrw } from '@/shared/lib/formatNumber';
import { generateIdempotencyKey } from '@/shared/lib/idempotencyKey';
import { type IdempotencyKey } from '@/shared/types/primitives';
import { ActionBar } from '@/shared/ui/ActionBar';
import { Button } from '@/shared/ui/Button';
import { PageMain } from '@/shared/ui/PageMain';
import { SubPageHeader } from '@/shared/ui/SubPageHeader';

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
 * **비율 버튼(10%·25%·50%)을 뺐다** (이슈 #54 회신 2026-09-11 「라」).
 * `design.md` §7.19 가 "금액 프리셋 버튼을 만들지 않는다" 로 이미 정한 것이고,
 * 출금 가능 금액이 예수금 전액이라 별도 한도가 없어 그 비율들이 가리키는 기준이
 * 없었다. 입금의 `+1만`·`+10만`·`+100만` 과 혼동되기도 한다.
 * **`전액` 하나만 남는다** — 프리셋이 아니라 상한을 가리키는 것이라 성질이 다르다.
 * 별도 확인 단계는 명세에 없어 만들지 않았다.
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

  /*
   * 초과 문구는 프로토타입 `wdErr` 원문이다. 전에는 `출금 가능 금액을
   * 초과했습니다. (출금 가능: …)` 로 합니다체에 괄호를 달았는데, `design.md` §13
   * Tone 이 해요체를 요구하고 프로토타입도 해요체다. 입금 화면의 한도 초과 문구를
   * 프로토타입 쪽으로 되돌린 것과 같은 판단이다(`DepositPage` 의 `amountError` 주석).
   */
  const amountError =
    amount !== null && cashBalance !== undefined && amount > cashBalance
      ? `출금할 수 있는 금액을 넘었어요. 지금은 ${formatKrw(cashBalance)}까지 출금할 수 있어요.`
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
        onSuccess: (result) => {
          void navigate(ROUTES.my);
          // 화면을 옮기면서 띄운다. 토스트 레이어가 `Outlet` 바깥에 있어
          // (`app/layouts/RootLayout.tsx`) 전환에도 살아남는다.
          // 금액은 요청값이 아니라 응답값을 쓴다 — 멱등 재시도로 같은 키가
          // 돌아오면 서버가 처음 처리한 금액이 진실이다.
          showToast(`${formatKrw(result.amount)}을 출금했어요.`);
        },
      },
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden [--page-bottom-space:8rem]">
      {/* 앱 셸 — 본문만 이 안에서 굴러간다 (FINCH-297, `shared/ui/PageMain` 주석). */}
      {/* 8rem 은 이 화면이 `pb-32` 로 들고 있던 값 그대로다 (ActionBar 높이분). */}
      <PageMain>
        {/* 프로토타입 `.nav`(L2757 `출금`). 진입점이 마이페이지라 그쪽을 fallback 으로 둔다. */}
        <SubPageHeader title="출금" fallbackTo={ROUTES.my} />

        <div className="mt-6 flex flex-col gap-6">
          {/*
           * 라벨은 프로토타입 `.cp`(L2801) 문구 그대로 `출금 금액` 이다. `출금할
           * 금액` 으로 늘여 적던 것을 되돌렸다 — 입금 화면이 `입금 금액` 이라 두
           * 화면이 같은 자리에서 다른 말을 쓰고 있었다.
           *
           * **입력 치수는 입금 쪽으로 통일한 것을 그대로 둔다** — 밑줄 2px · 입력
           * 36px/700/-.02em · `원` 20px/500. 프로토타입 출금 블록은 1.5px · 38px ·
           * 22px/600 이지만 이슈 #54 회신(2026-09-11) 「라」가 그것을 뒤집었고
           * FINCH-233 이 이미 반영했다. 이 티켓은 배치·간격·구조만 맞춘다.
           */}
          <AmountInput
            label="출금 금액"
            value={amount}
            onChange={setAmount}
            errorMessage={amountError}
            hint={
              cashBalance === undefined ? undefined : (
                /*
                 * **가능 금액과 `전액` 이 한 줄이다** (proto L2807-2810 — 입력 바로
                 * 아래 · 위 여백 14px · 사이 10px). 전에는 `전액` 칩 한 줄과
                 * `출금 가능 금액` SoftBox 한 줄로 갈라 놓아 같은 숫자를 두 번
                 * 말하면서 세로만 길어졌다. 금액만 굵게 해 문장 안에서 숫자가
                 * 먼저 읽히게 한다(proto `font-weight:600;color:var(--t1)`).
                 */
                <div className="flex items-center gap-2.5">
                  <span className="min-w-0 flex-1 text-body-2 text-text-secondary">
                    출금 가능 금액{' '}
                    <b className="font-semibold text-text-primary tabular-nums">
                      {formatKrw(cashBalance)}
                    </b>
                  </span>
                  {/* 프로토타입이 이 칩만 작게 쓴다 — 높이 30px · 좌우 12px ·
                    13px(proto L2809). 목록 필터 칩(34px)과 다른 값이다. 폭을
                    늘리지 않는다. 하나뿐인 버튼을 가로로 채우면 CTA 처럼 읽힌다. */}
                  <button
                    type="button"
                    onClick={() => setAmount(cashBalance)}
                    className="inline-flex h-7.5 flex-none items-center rounded-sm bg-surface-soft px-3 text-caption font-medium text-text-secondary transition-colors duration-(--motion-fast) ease-standard"
                  >
                    전액
                  </button>
                </div>
              )
            }
          />

          {/* 확정 문안은 `design.md` "입금 한도는 돌아오지 않는다" 절이 정했다.
            형식도 같은 절이 정한다 — `i` + 캡션 두 줄이고 카드로 감싸지 않는다.
            안내가 금액 입력보다 먼저 보이면 안 된다.
            구조는 `AmountInput` 의 `!` 초과 안내와 같다 (프로토타입 `.info` + 본문).
            프로토타입은 윗 여백이 28px 인데 이 컬럼의 `gap-6` 이 24px 라 4px 만 더한다
            (proto L2820 `margin-top:28px`). */}
          <div className="mt-1 flex items-start gap-2">
            <span
              aria-hidden="true"
              className="mt-0.5 flex size-4.5 flex-none items-center justify-center rounded-full border-[1.4px] border-text-muted text-[11px] font-bold text-text-muted"
            >
              i
            </span>
            <p className="flex-1 text-caption leading-[19px] text-text-muted">
              출금해도 입금 한도가 다시 늘어나진 않아요.
              <br />
              이전에 입금한 금액도 한도에 포함돼요.
            </p>
          </div>

          {isHttpError(withdrawal.error) && (
            <p className="text-caption text-danger">
              {withdrawal.error.message}
            </p>
          )}
        </div>

        <ActionBar>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {withdrawal.isPending ? '출금하고 있어요' : '출금하기'}
          </Button>
        </ActionBar>
      </PageMain>
    </div>
  );
}
