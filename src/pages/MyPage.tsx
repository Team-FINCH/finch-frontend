import { LogoutButton, useMe } from '@/features/auth';
import { useDepositLimit } from '@/features/deposit/api/useDepositLimit';
import { useInboxItems } from '@/features/inbox';
import { MyPageMenu } from '@/features/mypage/components/MyPageMenu';
import { MyPageProfile } from '@/features/mypage/components/MyPageProfile';
import { PageHeader } from '@/shared/ui/PageHeader';
import { PageMain } from '@/shared/ui/PageMain';

/**
 * 내 정보(마이페이지) — 프로필 · 알림함 진입(헤더 뱃지) · 투자 계좌·누적 입금 표시 ·
 * 거래 내역·입금·결제·출금 진입 · 로그아웃.
 *
 * 티켓: FINCH-28 (ia.md §1 "기타", FINCH-60).
 *
 * 근거 순서 — `ia.md` §1 "기타" 절 → `prototype/screen/finch-prototype.html` 의
 * `isMy` 블록(최종 근거) → `design.md` §7.14.
 *
 * **"나의 투자 기준" 카드는 만들지 않는다.** `design.md` §7.14 는 여전히 5번
 * 항목으로 적어 두었지만, `ia.md` §1 "AI가 이해한 나" 절이 "이전 판이 적은
 * '내 정보 화면의 나의 투자 기준 카드'는 프로토타입에 없는 화면 요소를 지어낸
 * 서술이었다"고 정정했고 `isMy` 블록을 직접 대조해도 그런 카드가 없다. 위키
 * 진입은 `/portfolio?tab=wiki` 하나뿐이다.
 *
 * **"AI 상태(시연용)" 토글도 만들지 않는다.** 프로토타입 자체가 이 블록 위에
 * "실제 서비스에는 없는 화면입니다"라고 적어 뒀다 — 개발 중 상태를 흉내 내는
 * 도구이지 실제 화면 요소가 아니다.
 *
 * **계좌 초기화 행도 없다** — GitLab 이슈 #27 로 기능 자체가 없어졌다
 * (`ia.md` §1 "기타").
 *
 * 데이터: `GET /users/me`(`useMe`, 닉네임·프로필 사진) ·
 * `GET /deposits/limit`(`useDepositLimit`, 누적 충전액 — "누적 입금"의 실제
 * 출처. `GET /account` 에는 이 필드가 없다).
 */
export function MyPage() {
  const me = useMe();
  const depositLimit = useDepositLimit();
  const inbox = useInboxItems();

  return (
    <PageMain>
      <PageHeader
        title="마이페이지"
        unreadCount={inbox.data?.unreadCount ?? 0}
        className="pb-3.5"
      />

      <MyPageProfile
        nickname={me.data?.nickname}
        profileImageUrl={me.data?.profileImageUrl}
        isPending={me.isPending}
        isError={me.isError}
        onRetry={() => me.refetch()}
      />
      <MyPageMenu
        depositedAmount={depositLimit.data?.depositedAmount}
        isDepositedAmountPending={depositLimit.isPending}
        isDepositedAmountError={depositLimit.isError}
      />

      <div className="mt-6">
        <LogoutButton />
      </div>
    </PageMain>
  );
}
