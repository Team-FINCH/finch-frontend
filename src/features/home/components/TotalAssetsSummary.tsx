import {
  formatKrw,
  formatSignedAmount,
  formatSignedRate,
  getPriceDirection,
} from '@/shared/lib/formatNumber';
import { Skeleton } from '@/shared/ui/Skeleton';

import type { useAccountSummary } from '../api/useAccountSummary';
import type { useHomeData } from '../model/useHomeData';

const DIRECTION_TEXT_CLASS = {
  rise: 'text-stock-up',
  fall: 'text-stock-down',
  flat: 'text-stock-neutral',
} as const;

/** `Date.toLocaleTimeString` 대신 `HH:mm` 만 자른다. 초 단위는 화면에 필요 없다. */
function formatAsOfTime(iso: string): string {
  const match = /T(\d{2}:\d{2})/.exec(iso);
  return match?.[1] ?? iso;
}

type TotalAssetsSummaryProps = {
  account: ReturnType<typeof useAccountSummary>;
  evaluationTotals: ReturnType<typeof useHomeData>['evaluationTotals'];
};

/**
 * 총자산 블록 (ia.md §1 "홈·자산", 프로토타입 `.d36`·`.sr`·`.odo`).
 *
 * 숫자 롤링 애니메이션(`.odo`)은 만들지 않는다 — 프로토타입 실측 이해에는
 * 있지만 이 티켓이 요구하는 것은 값 표시이지 인터랙션 디테일이 아니고,
 * 자릿수 애니메이션을 새로 설계하면 범위가 크게 늘어난다.
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

  return (
    <div className="pt-1.5">
      <p className="text-caption font-medium text-text-secondary">총자산</p>
      <p className="mt-3 text-[33px] leading-[41px] font-semibold text-text-primary tabular-nums">
        {formatKrw(account.data.totalAsset)}
      </p>
      <p
        className={`mt-2.5 text-body-2 font-medium tabular-nums ${DIRECTION_TEXT_CLASS[direction]}`}
      >
        평가손익 {formatSignedAmount(evaluationTotals.profit)}원 ·{' '}
        {formatSignedRate(evaluationTotals.rate)}
      </p>
      <p className="mt-2 text-caption text-text-muted">
        {formatAsOfTime(account.data.asOf)} 기준
      </p>
    </div>
  );
}
