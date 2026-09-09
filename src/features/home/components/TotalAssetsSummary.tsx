import { Link } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';
import { formatKstMonthDayTime } from '@/shared/lib/formatDate';
import {
  formatAmount,
  formatSignedAmount,
  formatSignedRate,
  getPriceDirection,
} from '@/shared/lib/formatNumber';
import { RollingNumber } from '@/shared/ui/RollingNumber';
import { Skeleton } from '@/shared/ui/Skeleton';

import type { useAccountSummary } from '../api/useAccountSummary';
import type { useHomeData } from '../model/useHomeData';

const DIRECTION_TEXT_CLASS = {
  rise: 'text-stock-up',
  fall: 'text-stock-down',
  flat: 'text-stock-neutral',
} as const;

/**
 * `원` 단위는 숫자와 띄어 쓰고 한 단계 낮춘다 (프로토타입 `.d36` 안의 별도 span —
 * 값 있음 20px/500 `--t2`, 0원 상태 17px/500 `--t2`). 숫자를 돋보이게 하려고
 * 단위를 내리는 것이라 `formatKrw`(`1,234,567원`)를 쓰지 않는다.
 */
function KrwUnit({ className }: { className: string }) {
  return (
    <span className={`font-medium text-text-secondary ${className}`}> 원</span>
  );
}

type TotalAssetsSummaryProps = {
  account: ReturnType<typeof useAccountSummary>;
  evaluationTotals: ReturnType<typeof useHomeData>['evaluationTotals'];
};

/**
 * 총자산 블록 (ia.md §1 "홈·자산", 프로토타입 `.d36`·`.sr`·`.odo`).
 *
 * 숫자 롤링(`.odo`)은 `shared/ui/RollingNumber` 다. 포트폴리오 평가금액이 같은
 * 자리를 쓰므로 홈 안에 두지 않았다. 칸 높이 41px 은 이 자리 글자의 행간이다 —
 * 프로토타입도 `.d36` 을 33px/41px 로 덮어 쓰고 있다.
 *
 * "손익" 라벨 — `useHomeData` 머리 주석 참고. 일간 손익 API 가 없어
 * 누적 평가손익으로 대체했다.
 */
export function TotalAssetsSummary({
  account,
  evaluationTotals,
}: TotalAssetsSummaryProps) {
  if (account.isPending) {
    return (
      <div className="pt-1.5">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="mt-3 h-10 w-48" />
        <Skeleton className="mt-2.5 h-4.5 w-40" />
      </div>
    );
  }

  if (account.isError || account.data === undefined) {
    return (
      <div className="pt-1.5">
        <p className="text-body-1 font-medium text-text-primary">
          총자산을 불러오지 못했어요
        </p>
        <button
          type="button"
          onClick={() => account.refetch()}
          className="mt-2.5 text-label font-medium text-text-primary underline underline-offset-3"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const direction = getPriceDirection(evaluationTotals.rate);

  /**
   * 총자산이 0원이면 평가손익과 기준 시각을 그리지 않는다 (프로토타입 `acctEmpty`).
   * `평가손익 0원 · 0.00%` 는 계산 결과가 아니라 아직 아무것도 없다는 뜻인데,
   * 숫자로 적으면 손익이 0으로 확정된 것처럼 읽힌다. 기준 시각도 같다 —
   * 갱신할 값이 없는데 시각만 있으면 무엇의 시각인지 알 수 없다.
   *
   * **입금 CTA 는 검정 버튼이 아니라 회색 액션 로우다** (design.md §7.16
   * "완료 후 홈"). 입금이 첫 행동처럼 보이지 않게 낮춘다 — 온보딩이 유도하는
   * 첫 행동은 관심 종목 담기다.
   */
  const isEmpty = account.data.totalAsset === 0;

  return (
    <div className="pt-1.5">
      <p className="text-section-title text-text-primary">총자산</p>
      <p className="mt-3 text-[33px] leading-[41px] font-bold tracking-[-0.03em] text-text-primary tabular-nums">
        <RollingNumber
          value={account.data.totalAsset}
          text={formatAmount(account.data.totalAsset)}
          label={`${formatAmount(account.data.totalAsset)}원`}
          digitHeight={41}
        />
        <KrwUnit className={isEmpty ? 'text-[17px]' : 'text-[20px]'} />
      </p>

      {isEmpty ? (
        <div className="mt-2.5 flex items-center gap-3">
          <p className="min-w-0 flex-1 text-caption text-text-secondary">
            입금하면 매매를 시작할 수 있어요.
          </p>
          <Link
            to={ROUTES.deposit}
            className="inline-flex h-8.5 flex-none items-center gap-1.5 rounded-12 bg-primary-soft pr-3 pl-3.5 text-label font-medium text-text-secondary"
          >
            입금하기
            <span aria-hidden="true" className="text-text-muted">
              ›
            </span>
          </Link>
        </div>
      ) : (
        <>
          <p
            className={`mt-2.5 text-body-2 font-medium whitespace-nowrap tabular-nums ${DIRECTION_TEXT_CLASS[direction]}`}
          >
            평가손익 {formatSignedAmount(evaluationTotals.profit)}원 ·{' '}
            {formatSignedRate(evaluationTotals.rate)}
          </p>
          <p className="mt-2 text-caption text-text-muted">
            {formatKstMonthDayTime(account.data.asOf)} 기준
          </p>
        </>
      )}
    </div>
  );
}
