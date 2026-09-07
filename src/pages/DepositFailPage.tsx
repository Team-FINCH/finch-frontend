import { useNavigate, useSearchParams } from 'react-router-dom';

import { depositFailMessage } from '@/features/deposit/lib/depositErrorMessages';
import { ROUTES } from '@/shared/config/routes';
import { Button } from '@/shared/ui/Button';
import { PageMain } from '@/shared/ui/PageMain';

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
  const message = depositFailMessage(code) ?? '충전을 진행하지 못했어요.';

  return (
    <PageMain>
      <div className="flex flex-col items-center px-6 pt-14.5 pb-5 text-center">
        <span
          aria-hidden="true"
          className="mb-4 flex size-9.5 items-center justify-center rounded-full bg-ai-status-icon-surface text-ai-status-title font-medium text-text-primary"
        >
          !
        </span>
        <b className="text-ai-status-title tracking-[-.01em] text-text-primary">
          충전이 완료되지 않았어요
        </b>
        <p className="mt-2 text-label text-pretty text-text-secondary">
          {message}
        </p>
        <Button
          className="mt-8"
          onClick={() => navigate(ROUTES.deposit, { replace: true })}
        >
          다시 시도하기
        </Button>
      </div>
    </PageMain>
  );
}
