import { formatKrw } from '@/shared/lib/formatNumber';
import { type DepositLimitResponse } from '@/shared/types/deposit';
import { Skeleton } from '@/shared/ui/Skeleton';
import { SoftBox, SoftBoxRow } from '@/shared/ui/SoftBox';

/**
 * 입금 한도 박스 (`GET /deposits/limit`). 세 줄이다 — `1회 한도` · `누적 한도` ·
 * `남은 한도`. 라벨과 순서는 프로토타입(`isDeposit` L2643-2645)과 `design.md` §7.18 ·
 * `ia.md:87` 이 같은 것을 말한다. 어느 필드가 어느 줄인지는 계약이 정한다 —
 * `perRequestLimit`(1회) · `cumulativeLimit`(계정 전체 누적 한도) ·
 * `remainingAmount`(남은 몫). **`depositedAmount`(누적 입금액)는 이 박스에 없다** —
 * `누적 한도` 는 한도이고 누적 입금액이 아니다 (contracts C49 · apiSpec §4.1).
 *
 * 값은 서버가 준 것을 그대로 그린다. 화면이 계산하지 않는다(`ia.md:87`).
 *
 * 구분선은 마지막 `남은 한도` 줄 위에 온다 — 앞 두 줄이 고정 한도이고 마지막 줄만
 * 쓴 만큼에 따라 움직이는 값이라 묶음이 갈린다(프로토타입 L2645).
 *
 * **회색 Soft Box 다.** 아래 확인 카드는 흰 면이라 둘이 면색으로 갈린다
 * (프로토타입 L2641 `.soft` vs L2663 `.card`).
 *
 * 조회 중·실패도 이 컴포넌트가 받는다. `DepositPage` 가 상태별로 다른 자리를
 * 만들지 않고 한 곳에 모은 이유는 **같은 박스의 안쪽만 갈리기** 때문이다.
 */
type DepositLimitBoxProps = {
  limit?: DepositLimitResponse;
  isPending: boolean;
  isError: boolean;
  /**
   * 실패한 뒤 `다시 시도` 로 다시 부르고 있는 중. **실패 화면이 아니라 스켈레톤을
   * 그린다** — TanStack Query 는 재조회 중에도 `status` 를 `error` 로 두기 때문에,
   * 이 값을 보지 않으면 버튼을 눌러도 화면이 그대로라 "눌러도 아무 일이 없다"가
   * 된다. 성공한 값을 백그라운드에서 갱신하는 중(`isFetching`)에는 넘기지 않는다.
   * 그 경우까지 스켈레톤으로 되돌리면 멀쩡한 숫자가 깜빡인다.
   */
  isRetrying: boolean;
  /** 실패 안내의 `다시 시도` 가 부른다 */
  onRetry: () => void;
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

/**
 * 조회 실패. **화면 일부가 비는 것이라 인라인 위계다** — 왼쪽 정렬이고 화면 전체가
 * 비는 `.aist`(가운데 정렬 · 원형 배지)를 쓰지 않는다. 이슈 #54 회신(2026-09-11)
 * 0절이 두 위계를 갈랐다.
 *
 * 원형 `!` 는 `AmountInput` 의 한도 초과 안내와 같은 `.info` 다. **빨간 박스를
 * 만들지 않는다** (`design.md` §10 "Red Warning Box 금지").
 *
 * **재시도는 버튼이다.** 밑줄 텍스트로 두면 누를 수 있다는 것이 보이지 않는다
 * (같은 회신 0절). 치수는 `.aist>button` 과 같은 38px · 반경 10px · `--border2`
 * 1px 이고, 보이는 높이를 실측값에 두고 눌리는 영역만 위아래 3px 씩 넓혀 터치
 * 최소 44px(`design.md` §12)을 만든다 — `AiStatus` 가 쓰는 방법과 같다.
 */
function LimitErrorBody({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-start gap-2">
      <span
        aria-hidden="true"
        className="mt-px flex size-4.5 flex-none items-center justify-center rounded-full border-[1.4px] border-text-muted text-[11px] font-bold text-text-muted"
      >
        !
      </span>
      <div className="flex-1">
        <p className="text-body-2 font-medium text-text-primary">
          한도를 불러오지 못했어요.
        </p>
        {/*
         * 하단 CTA 가 잠기는 이유를 말하는 줄이다. 버튼 문구를 바꾸지 않고
         * 여기서 설명한다 — `design.md` §7.19 가 출금 CTA 에 정한 "유효하지
         * 않으면 비활성으로만 표현한다" 와 같은 결이다.
         */}
        <p className="mt-1 text-[14px] leading-[21px] text-text-secondary">
          한도를 확인해야 입금할 수 있어요.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="relative mt-3.5 h-9.5 min-w-26 rounded-sm border border-border-strong bg-surface px-4.5 text-label text-text-primary before:absolute before:inset-x-0 before:-inset-y-0.75 before:content-['']"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}

export function DepositLimitBox({
  limit,
  isPending,
  isError,
  isRetrying,
  onRetry,
}: DepositLimitBoxProps) {
  if (isPending || isRetrying) {
    return (
      <SoftBox aria-busy="true" aria-label="입금 한도를 불러오고 있어요">
        <LimitSkeletonRow />
        <LimitSkeletonRow />
        <LimitSkeletonRow divided />
      </SoftBox>
    );
  }

  if (isError || limit === undefined) {
    return (
      <SoftBox>
        <LimitErrorBody onRetry={onRetry} />
      </SoftBox>
    );
  }

  return (
    <SoftBox>
      <SoftBoxRow label="1회 한도" value={formatKrw(limit.perRequestLimit)} />
      <SoftBoxRow label="누적 한도" value={formatKrw(limit.cumulativeLimit)} />
      {/* `잔여 한도` 였다 (FINCH-351). 같은 값을 입금 화면의 초과 안내는
          `남은 한도는 …이에요.` 로 부르고 있어, 한 흐름 안에서 같은 숫자가 두
          이름을 가졌다. 쉬운 쪽으로 맞춘다. */}
      <SoftBoxRow
        label="남은 한도"
        value={formatKrw(limit.remainingAmount)}
        divided
      />
    </SoftBox>
  );
}
