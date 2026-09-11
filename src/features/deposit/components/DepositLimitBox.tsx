import { formatKrw } from '@/shared/lib/formatNumber';
import { type DepositLimitResponse } from '@/shared/types/deposit';
import { Skeleton } from '@/shared/ui/Skeleton';
import { SoftBox, SoftBoxRow } from '@/shared/ui/SoftBox';

/**
 * 입금 한도 박스 (`GET /deposits/limit`). 세 줄이다 — `1회 한도` · `누적 한도` ·
 * `잔여 한도`. 라벨과 순서는 프로토타입(`isDeposit` L2643-2645)과 `design.md:946` ·
 * `ia.md:87` 이 같은 것을 말한다. 어느 필드가 어느 줄인지는 계약이 정한다 —
 * `perRequestLimit`(1회) · `cumulativeLimit`(계정 전체 누적 한도) ·
 * `remainingAmount`(남은 몫). **`depositedAmount`(누적 입금액)는 이 박스에 없다** —
 * `누적 한도` 는 한도이고 누적 입금액이 아니다 (contracts C49 · apiSpec §4.1).
 *
 * 값은 서버가 준 것을 그대로 그린다. 화면이 계산하지 않는다(`ia.md:87`).
 *
 * 구분선은 마지막 `잔여 한도` 줄 위에 온다 — 앞 두 줄이 고정 한도이고 마지막 줄만
 * 쓴 만큼에 따라 움직이는 값이라 묶음이 갈린다(프로토타입 L2645).
 *
 * **회색 Soft Box 다.** 아래 `확인` 은 흰 카드라 둘이 면색으로 갈린다
 * (프로토타입 L2641 `.soft` vs L2663 `.card`).
 *
 * 조회 중도 이 컴포넌트가 받는다. `DepositPage` 가 상태별로 다른 자리를 만들지
 * 않고 한 곳에 모은 이유는 **같은 박스의 안쪽만 갈리기** 때문이다.
 */
type DepositLimitBoxProps = {
  limit?: DepositLimitResponse;
  isPending: boolean;
};

/**
 * 조회 중 한 줄. **박스 구조를 그대로 두고 글자 자리만 `.sk` 로 바꾼다** —
 * `design.md` §10 이 "Loading 때문에 전체 화면 구조가 크게 흔들리지 않게" 라고
 * 정한 자리다. 행 수(3) · 행 간격(10px) · 마지막 줄 위 구분선이 실제 박스와 같아야
 * 응답이 와도 아래 섹션이 밀리지 않는다.
 *
 * 자리표시자 크기는 이슈 #54 회신(2026-09-11)의 실측이다 — 라벨 14×56,
 * 값 14×92. `SoftBoxRow` 를 재사용하지 않은 것은 그 컴포넌트가 값을 `span` 으로
 * 감싸는데 `Skeleton` 이 `div` 라 `span > div` 가 되기 때문이다.
 */
function LimitSkeletonRow({ divided = false }: { divided?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between gap-3 first:mt-0 ${
        divided ? 'mt-2.5 border-t border-border pt-2.5' : 'mt-2.5'
      }`}
    >
      <Skeleton className="h-3.5 w-14" />
      <Skeleton className="h-3.5 w-23" />
    </div>
  );
}

export function DepositLimitBox({ limit, isPending }: DepositLimitBoxProps) {
  if (isPending) {
    return (
      <SoftBox aria-busy="true" aria-label="입금 한도를 불러오고 있어요">
        <LimitSkeletonRow />
        <LimitSkeletonRow />
        <LimitSkeletonRow divided />
      </SoftBox>
    );
  }

  if (limit === undefined) {
    return null;
  }

  return (
    <SoftBox>
      <SoftBoxRow label="1회 한도" value={formatKrw(limit.perRequestLimit)} />
      <SoftBoxRow label="누적 한도" value={formatKrw(limit.cumulativeLimit)} />
      <SoftBoxRow
        label="잔여 한도"
        value={formatKrw(limit.remainingAmount)}
        divided
      />
    </SoftBox>
  );
}
