import { type CandleInterval } from '@/shared/types/stock';
import { Skeleton } from '@/shared/ui/Skeleton';

import { useCandles } from '../api/useCandles';

import { CandleChart } from './CandleChart';
import { ChartPeriodSegment } from './ChartPeriodSegment';

/**
 * 차트 탭 (프로토타입 `isDtChart` 블록).
 *
 * 봉 종류 세그먼트 + 캔들 차트다. 프로토타입은 그 아래 "오늘"(시가·고가·저가·거래량)
 * 격자도 그리지만 **만들지 않았다** — `GET /stocks/{stockCode}` 응답에 시가·고가·저가·
 * 거래량이 없다 (apiSpec §5.2 는 `currentPrice`·`previousClose`·`changeAmount`·
 * `changeRate` 만 준다). 캔들 마지막 봉에서 끌어다 쓸 수도 있지만 그것은 "오늘"이
 * 아니라 "마지막 거래일"이라 장중에 뜻이 달라진다. 없는 값을 만들지 않는다.
 *
 * 봉 종류는 URL 이 갖는다 (`?interval=`, TODO(계약) — `@/shared/types/candleInterval.ts`
 * 참고). 부모가 넘기고 여기서는 바꾸기만 한다.
 */
type StockChartTabProps = {
  stockCode: string;
  interval: CandleInterval;
  onIntervalChange: (interval: CandleInterval) => void;
  /** 보유 중이면 평균 매수가에 점선을 긋는다 (프로토타입 `chartHasAvg`). */
  avgBuyPrice: number | null;
};

export function StockChartTab({
  stockCode,
  interval,
  onIntervalChange,
  avgBuyPrice,
}: StockChartTabProps) {
  const candles = useCandles(stockCode, interval);

  return (
    <section className="mt-6">
      <ChartPeriodSegment interval={interval} onChange={onIntervalChange} />

      <div className="mt-5.5">
        {candles.isPending && <Skeleton className="h-[220px] w-full" />}

        {candles.isError && (
          <div className="flex h-[220px] flex-col items-center justify-center text-center">
            <p className="text-body-2 text-text-secondary">
              차트를 불러오지 못했어요
            </p>
            <button
              type="button"
              onClick={() => void candles.refetch()}
              className="mt-2.5 text-label font-medium text-text-secondary underline underline-offset-[3px]"
            >
              다시 시도
            </button>
          </div>
        )}

        {candles.isSuccess &&
          (candles.data.candles.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center">
              <p className="text-body-2 text-text-secondary">
                표시할 시세 기록이 없어요
              </p>
            </div>
          ) : (
            <CandleChart
              candles={candles.data.candles}
              avgBuyPrice={avgBuyPrice}
            />
          ))}
      </div>
    </section>
  );
}
