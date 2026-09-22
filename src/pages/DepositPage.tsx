import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAccount } from '@/features/deposit/api/useAccount';
import { useDepositLimit } from '@/features/deposit/api/useDepositLimit';
import { useDepositReady } from '@/features/deposit/api/useDepositReady';
import { AmountInput } from '@/features/deposit/components/AmountInput';
import { DepositLimitBox } from '@/features/deposit/components/DepositLimitBox';
import { DepositSummaryRow } from '@/features/deposit/components/DepositSummaryRow';
import { PaymentMethodPicker } from '@/features/deposit/components/PaymentMethodPicker';
import { depositLimitExceededMessage } from '@/features/deposit/lib/depositErrorMessages';
import {
  toSameOriginPath,
  withAmountParam,
} from '@/features/deposit/lib/queryParams';
import { isHttpError, isSchemaError } from '@/shared/api';
import { ROUTES } from '@/shared/config/routes';
import { formatKrw } from '@/shared/lib/formatNumber';
import { type PaymentMethod } from '@/shared/types/deposit';
import { ActionBar } from '@/shared/ui/ActionBar';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageMain } from '@/shared/ui/PageMain';
import { SubPageHeader } from '@/shared/ui/SubPageHeader';

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

/**
 * CTA 라벨. 프로토타입 `depCtaLabel`(`app-logic.js:1074`)의 세 갈래를 그대로 따르고
 * 용어만 입금으로 바꿨다 — 금액 없음 · 한도 초과 · 정상.
 *
 * **결제 수단을 안 고른 상태는 라벨을 바꾸지 않는다.** 프로토타입은 수단이 항상
 * 하나 골라져 있어(`depMethod:"kakao"` 초기값) 그 갈래가 아예 없다. 우리는 수단을
 * 미리 골라 주지 않으므로 비활성으로만 표현한다 — `design.md:977` 이 출금 CTA 에
 * 같은 규칙("유효하지 않으면 비활성으로만 표현하고 버튼 문구를 바꾸지 않는다")을 적었다.
 */
function depositCtaLabel(amount: number | null, exceedsLimit: boolean): string {
  if (amount === null || amount <= 0) {
    return '입금 금액을 입력해 주세요';
  }
  if (exceedsLimit) {
    return '입금 금액을 확인해 주세요';
  }
  return `${formatKrw(amount)} 결제하기`;
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
  /*
   * 한도 초과 안내는 **한 문장이다.** 1회 초과와 누적 초과를 구분하지 않는다 —
   * 프로토타입 `depOver` 가 `depAmt>10000000 || depAmt>cumLeft` 로 두 조건을 OR 로
   * 묶고 문장을 하나만 만든다. 남은 한도 숫자에는 `depCumLeft`(=`cumLeft`, 누적
   * 한도에서 쓴 만큼을 뺀 값)를 끼우는데, 우리 쪽 대응 값은 `GET /deposits/limit`
   * 의 `remainingAmount` 다 (contracts C49).
   *
   * **근거 넷이 서로 다른 문장을 말한다.** 프로토타입을 골랐다 — 판정 기준이
   * "UI 요소(배치·모양·문구·위계)는 프로토타입을 따른다" 이고 문구가 거기 든다.
   *   프로토타입      한 문장. 남은 한도 하나만 넣는다 (아래 문장)
   *   직전 구현       두 문장. 1회 초과와 누적 초과를 갈랐다
   *   `ia.md:88`     합니다체 또 다른 문장. `design.md` §13 Tone 이 해요체를
   *                  요구하고 프로토타입도 해요체라 버렸다
   *   `depositErrorMessages.ts` 의 `depositLimitExceededMessage()`
   *                  결제 복귀·모의 이체가 쓰는 또 다른 문장
   *
   * **마지막 것과 문장을 맞추지 않는다.** `design.md:969` 가 "한도 초과 문구는
   * 충전 화면과 같은 문장을 쓴다" 고 요구하지만 프로토타입 자신이 두 화면에서
   * 다른 문장을 쓴다. 문맥이 갈린다 — 이 화면은 "지금 넣은 금액이 넘었다" 를
   * 알리고, 결제 실패 화면은 "무엇을 하라" 를 안내한다. 그래서 저 함수는
   * 건드리지 않았다.
   *
   * **같은 화면에 저 함수의 문장도 나올 수 있다** — 아래 `readyErrorMessage` 가
   * `ready` 의 `DEPOSIT_LIMIT_EXCEEDED`(409)를 그 함수로 그린다. 이 검사를
   * 통과한 뒤 다른 충전이 끼어들어 한도가 줄었을 때만 오는 갈래라(C49, 진실은
   * `confirm` 이다) 둘이 한 번에 뜨지는 않는다.
   */
  const amountError =
    amount !== null &&
    limit !== undefined &&
    (amount > limit.perRequestLimit || amount > limit.remainingAmount)
      ? `입금 한도를 넘었어요. 남은 한도는 ${formatKrw(limit.remainingAmount)}이에요.`
      : undefined;

  const exceedsLimit = amountError !== undefined;
  /*
   * **한도를 모르면 결제까지 가지 못한다.** 전에는 `limit` 이 없어도 CTA 가 살아
   * 있어서 조회가 실패한 채로 조용히 결제창까지 갔다 — 위 `amountError` 검사가
   * `limit !== undefined` 를 요구하므로, 한도를 모르는 동안에는 초과 여부를 아예
   * 판정하지 못한 채 통과시킨 것이다. 이슈 #54 회신(2026-09-11) 「가」가 이 자리를
   * 잠그기로 정했다.
   *
   * 조회 중과 실패를 함께 잠근다. 둘 다 "한도를 모른다"는 같은 상태다.
   *
   * **CTA 문구는 그대로 세 갈래다.** 한도 실패용 네 번째 문구를 만들지 않는다 —
   * 잠긴 이유는 버튼이 아니라 `DepositLimitBox` 안 둘째 줄이 말한다.
   */
  const canSubmit =
    amount !== null &&
    amount > 0 &&
    limit !== undefined &&
    !exceedsLimit &&
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
          /*
           * 우리 화면(계좌이체 승인)으로 갈 때만 금액을 실어 준다. 서버 `checkoutUrl`
           * 에는 `?paymentId` 뿐이라(C90) 그 화면이 금액을 알 길이 이것뿐이다.
           * **라우터 `state` 가 아니라 쿼리로 싣는다** — 새로고침하면 `state` 는
           * 날아가고 금액 카드만 다시 `—` 가 된다. 사유는 `withAmountParam` 에 적었다.
           */
          void navigate(withAmountParam(path, data.amount));
        },
      },
    );
  }

  return (
    /* ActionBar 가 fixed 라 마지막 내용이 그 밑에 깔린다. 바 높이만큼 띄운다
       (`ActionBar` 주석: "이 바를 쓰는 화면은 본문 아래에 바 높이만큼 여백을 둔다").
       값은 껍데기의 `--page-bottom-space` 로 내려 준다 — safe-area 는 `PageMain` 이
       한 번만 더한다. */
    <div className="flex h-dvh flex-col overflow-hidden [--page-bottom-space:6.5rem]">
      {/* 앱 셸 — 본문만 이 안에서 굴러간다 (FINCH-297, `shared/ui/PageMain` 주석). */}
      {/*
       * 제목·뒤로가기는 프로토타입 `.nav` 묶음(L2623 `충전` — 용어 통일 뒤 `입금`)이다.
       * 진입점이 마이페이지라(ia.md §1) 새 탭에서 바로 열었을 때는 그쪽으로 보낸다.
       */}
      <SubPageHeader title="입금" fallbackTo={ROUTES.my} />
      <PageMain>
        {/* 섹션 간격 32px 은 프로토타입 `.sec{margin-top:32px}` 실측값이다. */}
        <div className="mt-8 flex flex-col gap-8">
          <AmountInput
            label="입금 금액"
            value={amount}
            onChange={setAmount}
            presets={DEPOSIT_PRESETS}
            errorMessage={amountError}
          />

          {/* 세 줄·구분선·조회 중·실패는 전부 `DepositLimitBox` 안에 있다. */}
          <DepositLimitBox
            limit={limit}
            isPending={limitQuery.isPending}
            isError={limitQuery.isError}
            isRetrying={limitQuery.isError && limitQuery.isFetching}
            onRetry={() => void limitQuery.refetch()}
          />

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
            {/*
             * **`입금 후 예수금` 만 크다** (프로토타입 L2704 — 19px/700/-.01em ·
             * baseline 정렬 · 위 12px 구분선). 앞 두 줄은 `.b1`/500 이고 구분선이
             * 없다. 전에는 셋을 `SoftBoxRow` 로 똑같이 그려서 이 화면에서 제일
             * 중요한 숫자가 나머지에 묻혔다. 줄 컴포넌트를 가른 이유는
             * `DepositSummaryRow` 머리 주석에 적었다.
             */}
            <Card>
              <DepositSummaryRow label="결제 수단" value={methodLabel} />
              <DepositSummaryRow
                label="입금 금액"
                value={amount === null ? NO_VALUE : formatKrw(amount)}
              />
              {accountQuery.data !== undefined && (
                <DepositSummaryRow
                  label="입금 후 예수금"
                  value={formatKrw(
                    accountQuery.data.cashBalance + (amount ?? 0),
                  )}
                  total
                />
              )}
              {/*
               * 취소 불가는 카드 밖 독립 단락이 아니라 카드 안 구분선 아래 캡션이다
               * (프로토타입 L2667). 문장은 해요체다 — 프로토타입과 `design.md:948`
               * 이 해요체이고 `design.md` §13 Tone 이 그것을 요구한다. `ia.md:84` 만
               * 합니다체("충전은 취소할 수 없습니다")인데 그쪽이 낡았다.
               */}
              <p className="mt-3.5 border-t border-border pt-3.5 text-caption leading-5 text-text-muted">
                입금은 취소할 수 없어요.
              </p>
            </Card>
          </section>

          {/*
           * 모의 결제라는 사실을 알리는 안내 카드 (프로토타입 L2671-2675). 문구는
           * 프로토타입 원문이다 — 이 문장에는 바꿀 용어가 없다.
           *
           * 면과 테두리는 안내 카드 전용 토큰이다 — `note-surface`(프로토타입
           * `--note`) + `note-border`(`--note-b`). `design.md:151-152` 가 그 둘을
           * "안내 카드" 토큰으로 적었고 `styles/index.css` 가 그 이름으로 들고 있다.
           * 근사값(`surface-soft` + `divider`)으로 그렸던 것을 제 값으로 바꿨다.
           *
           * `Card` 를 쓰지 않은 이유 — 면색·테두리를 `className` 으로 덮으면 같은
           * 특이도의 클래스가 둘이 되어 어느 쪽이 이길지 스타일시트 순서에 달린다.
           * `OrderPage` 의 사유 카드도 같은 이유로 인라인 클래스를 쓴다.
           */}
          <div className="rounded-card border border-note-border bg-note-surface p-5">
            <p className="text-body-2 text-text-secondary">
              프로토타입이라 실제 결제는 일어나지 않아요. 금액만 계좌에
              반영돼요.
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
            {readyMutation.isPending
              ? '확인하고 있어요'
              : depositCtaLabel(amount, exceedsLimit)}
          </Button>
        </ActionBar>
      </PageMain>
    </div>
  );
}
