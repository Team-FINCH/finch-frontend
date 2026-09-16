import { useNavigate, useSearchParams } from 'react-router-dom';

import { depositFailMessage } from '@/features/deposit/lib/depositErrorMessages';
import { ROUTES } from '@/shared/config/routes';
import { Button } from '@/shared/ui/Button';
import { PageMain } from '@/shared/ui/PageMain';
import { SubPageHeader } from '@/shared/ui/SubPageHeader';

/**
 * 결제 복귀(실패) — 카카오페이 승인 실패 뒤 돌아오는 자리. 카카오 실패 리다이렉트가
 * `?paymentId&code` 쿼리로 이 화면에 도착한다. `code` 는 티켓 프롬프트가 준 5종이다 —
 * `DEPOSIT_NOT_FOUND` · `DEPOSIT_INVALID_STATE` · `DEPOSIT_PAYMENT_FAILED` ·
 * `DEPOSIT_PG_UNAVAILABLE` · `DEPOSIT_AMOUNT_MISMATCH`. 이 워크트리 시점에는
 * `contracts.md` C89~C92 가 안 보여서 다른 브랜치의 계약과 다를 수 있다.
 *
 * **`ia.md`(2026-09-05판)는 이 라우트를 "(잠정)"·"(미확정)"으로 적었다.** 오늘
 * (2026-09-07) 백엔드 `application.yaml` 의 `fail-path` 와 Jira 티켓 FINCH-145 로
 * 확정됐다 — `ia.md` 갱신은 별도다.
 *
 * 티켓: FINCH-145.
 *
 * 근거: `ia.md` §1 "홈·자산" 절 "결제 복귀 화면과 모의 이체 화면(잠정)".
 * API: 계약 없음 — 실패 표시만 하고 API 를 부르지 않는다. `confirm` 을 부르는 쪽은
 * 성공 복귀(`DepositCompletePage`)뿐이다. 서버 `message` 가 없어 문구는 이 화면이
 * 직접 만든다(`depositFailMessage`).
 */
export function DepositFailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const code = searchParams.get('code');
  const message = depositFailMessage(code) ?? '입금을 진행하지 못했어요.';

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      {/* 앱 셸 — 본문만 이 안에서 굴러간다 (FINCH-297, `shared/ui/PageMain` 주석). */}
      <PageMain>
        {/*
         * 프로토타입 `isPayReturn`(L2714)은 제목 `결제 결과` 만 두고 **뒤로가기를 일부러
         * 뺐다** — 결제가 끝난 자리라 되돌아가면 이중 확정이 난다. 성공 복귀와 같다.
         */}
        <SubPageHeader title="결제 결과" showBack={false} />
        <div className="flex flex-col items-center px-6 pt-14.5 pb-5 text-center">
          <span
            aria-hidden="true"
            className="mb-4 flex size-9.5 items-center justify-center rounded-full bg-ai-status-icon-surface text-ai-status-title font-medium text-text-primary"
          >
            !
          </span>
          <b className="text-ai-status-title tracking-[-.01em] text-text-primary">
            입금이 완료되지 않았어요
          </b>
          <p className="mt-2 text-label text-pretty text-text-secondary">
            {message}
          </p>
          {/*
           * 보조 동작 `나중에 하기` 를 주 버튼과 함께 둔다 — `design.md:968`
           * "어느 실패든 빠져나갈 보조 동작을 함께 둔다. 이 화면에는 탭바도
           * 뒤로가기도 없어 주 동작 하나만 두면 갇힌다". 이 화면은 주 동작이
           * 입금 화면으로만 가서 홈으로 빠져나갈 길이 아예 없었다.
           * 라벨과 세로 10px 배치는 프로토타입 `payDone` 블록을 따른다
           * (template L2747-2752 · `app-logic.js` `paySecondaryLabel`).
           */}
          <div className="mt-8 flex w-full flex-col gap-2.5">
            <Button onClick={() => navigate(ROUTES.deposit, { replace: true })}>
              다시 시도하기
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(ROUTES.home, { replace: true })}
            >
              나중에 하기
            </Button>
          </div>
        </div>
      </PageMain>
    </div>
  );
}
