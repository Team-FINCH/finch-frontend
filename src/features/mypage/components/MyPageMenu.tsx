import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';
import { formatKrw } from '@/shared/lib/formatNumber';
import { Skeleton } from '@/shared/ui/Skeleton';

/**
 * 이 컴포넌트도 쿼리를 직접 부르지 않는다 — 이유는 `MyPageProfile.tsx` 머리 주석과
 * 같다. `depositedAmount` 는 `MyPage.tsx` 가 `useDepositLimit()`(`features/deposit`)
 * 로 이미 조회한 값을 내려받는다.
 */
type MyPageMenuProps = {
  depositedAmount: number | undefined;
  isDepositedAmountPending: boolean;
  isDepositedAmountError: boolean;
};

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[50px] items-center gap-3">
      <span className="flex-1 text-body-1 font-medium text-text-primary">
        {label}
      </span>
      {children}
    </div>
  );
}

function NavRow({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="flex min-h-[50px] items-center gap-3 text-left">
      <span className="flex-1 text-body-1 font-medium text-text-primary">
        {label}
      </span>
      <span aria-hidden="true" className="text-title-3 text-text-muted">
        ›
      </span>
    </Link>
  );
}

function Divider() {
  return <div className="h-px bg-border" aria-hidden="true" />;
}

/**
 * 내 정보 화면의 행 목록 (프로토타입 `isMy` 블록 — 투자 계좌 · 누적 입금 · 거래 내역 ·
 * 입금·결제 뒤 이 티켓에서 더한 출금). 로그아웃은 여기 없다 — `features/auth` 의
 * `LogoutButton` 을 그대로 쓴다(스타일이 다른 별개 액션이라 이 목록 리듬에 넣지 않는다).
 *
 * **"투자 계좌"는 항상 "연결됨" 고정 텍스트다.** 프로토타입에도 데이터 바인딩이
 * 없다 — 계좌는 가입과 함께 만들어지는 사용자당 1개라 "연결 안 됨" 상태 자체가
 * 없다(`shared/types/account.ts`). 그래서 이 행은 API 를 부르지 않는다.
 *
 * **"누적 입금"은 `GET /account` 가 아니라 `GET /deposits/limit` 의
 * `depositedAmount`(계정 전체 누적 충전액)다.** `AccountSummaryResponseSchema`
 * 에는 누적 입금 필드가 없다 — `cashBalance`·`evaluationAmount`·`totalAsset`·
 * `asOf` 뿐이다. 값의 출처가 다른 API 라 쿼리도 그쪽을 그대로 재사용한다
 * (`features/deposit/api/useDepositLimit.ts`, 이미 충전 화면이 쓰던 것).
 *
 * **"출금" 행은 프로토타입에 없다.** `finch-prototype.html` 의 `isMy` 블록은
 * 출금 기능이 명세에 들어오기 전(구판)이라 이 행 자체가 없다. 하지만 `ia.md` §1
 * "기타"·"출금 화면" 절이 "진입점은 마이페이지다"라고 계약(C86)까지 달아 명시했고,
 * `/withdraw`(`WithdrawPage`)는 라우터에 이미 붙어 있는데 이 행이 없으면 앱 어디서도
 * 들어갈 방법이 없다(코드베이스 전체에서 `ROUTES.withdraw` 를 참조하는 UI가 라우터
 * 정의 하나뿐임을 확인했다). 그래서 프로토타입의 침묵을 "만들지 마라"가 아니라
 * "이 화면이 그 결정 이전 판이다"로 읽고 "입금·결제" 다음 자리에 추가했다.
 * 이 판단은 보고에도 남긴다.
 */
export function MyPageMenu({
  depositedAmount,
  isDepositedAmountPending,
  isDepositedAmountError,
}: MyPageMenuProps) {
  return (
    <div className="flex flex-col">
      <InfoRow label="투자 계좌">
        <span className="text-body-1 font-medium text-text-secondary">
          연결됨
        </span>
      </InfoRow>
      <Divider />
      <InfoRow label="누적 입금">
        {isDepositedAmountPending ? (
          <Skeleton className="h-4.5 w-24" />
        ) : isDepositedAmountError || depositedAmount === undefined ? (
          <span className="text-body-1 text-text-muted">—</span>
        ) : (
          <span className="text-body-1 font-medium text-text-secondary">
            {formatKrw(depositedAmount)}
          </span>
        )}
      </InfoRow>
      <Divider />
      <NavRow to={ROUTES.transactions} label="거래 내역" />
      <Divider />
      <NavRow to={ROUTES.deposit} label="입금 · 결제" />
      <Divider />
      <NavRow to={ROUTES.withdraw} label="출금" />
    </div>
  );
}
