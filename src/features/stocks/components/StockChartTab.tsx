import {
  formatAmount,
  formatKrw,
  formatSignedAmount,
  formatSignedRate,
  getPriceDirection,
  type PriceDirection,
} from '@/shared/lib/formatNumber';
import {
  type CandleInterval,
  type StockHoldingSummary,
} from '@/shared/types/stock';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';
import { SoftBox, SoftBoxRow } from '@/shared/ui/SoftBox';
import { NoValue } from '@/shared/ui/StockRow';

import { useCandles } from '../api/useCandles';

import { CandleChart } from './CandleChart';
import { ChartPeriodSegment } from './ChartPeriodSegment';

/**
 * 차트 탭 (프로토타입 `isDtChart` 블록, 새 디코드 L1748–L1830).
 *
 * 세 묶음이다 — 봉 종류 세그먼트 + 캔들 차트 · (프로토타입만) `오늘` 격자 ·
 * `내 보유 상세`. 그리고 거래정지 종목은 **차트와 기간 탭을 아예 그리지 않는다**
 * (`d.tradableChart`, 새 디코드 L1749–L1761).
 *
 * **`오늘`(시가·고가·저가·거래량) 격자는 만들지 않았다** — `GET /stocks/{stockCode}`
 * 응답에 그 넷이 없다 (apiSpec §5.2 는 `currentPrice`·`previousClose`·
 * `changeAmount`·`changeRate` 만 준다). 캔들 마지막 봉에서 끌어다 쓸 수도 있지만
 * 그것은 "오늘"이 아니라 "마지막 거래일"이라 장중에 뜻이 달라진다. 없는 값을
 * 만들지 않는다.
 *
 * 봉 종류는 URL 이 갖는다 (`?interval=` — `@/shared/types/candleInterval.ts` 참고).
 * 부모가 넘기고 여기서는 바꾸기만 한다.
 */
const DIRECTION_TEXT_CLASS: Record<PriceDirection, string> = {
  rise: 'text-stock-up',
  fall: 'text-stock-down',
  flat: 'text-stock-neutral',
};

/** 차트 자리 높이. 프로토타입 SVG 가 150px 이다 (새 디코드 L1782). */
const CHART_BOX_CLASS = 'h-[150px]';

type StockChartTabProps = {
  stockCode: string;
  interval: CandleInterval;
  onIntervalChange: (interval: CandleInterval) => void;
  /** 보유 중이면 평균 매수가에 점선을 긋는다 (프로토타입 `chartHasAvg`). */
  avgBuyPrice: number | null;
  /** 거래정지면 차트·기간 탭을 그리지 않는다 (프로토타입 `d.tradableChart`). */
  suspended: boolean;
  suspendedReason: string | null;
  /** 정지 화면의 `마지막 체결가`. */
  currentPrice: number;
  /** 보유 중이면 탭 하단에 `내 보유 상세` 를 둔다 (프로토타입 `d.owned`). */
  holding: StockHoldingSummary | null;
};

export function StockChartTab({
  stockCode,
  interval,
  onIntervalChange,
  avgBuyPrice,
  suspended,
  suspendedReason,
  currentPrice,
  holding,
}: StockChartTabProps) {
  /*
   * 거래정지면 캔들을 부르지 않는다 — 차트를 그리지 않으므로 응답을 쓸 자리가 없다.
   * 프로토타입도 정지 종목에서는 차트 블록 자체가 렌더되지 않는다.
   */
  const candles = useCandles(stockCode, interval, !suspended);

  return (
    <>
      {suspended ? (
        <section className="mt-4.5">
          {/*
            정지 화면 (새 디코드 L1749–L1759). `.est` 실측 여백은 위 52 · 좌우 20 ·
            아래 40 이라 `EmptyState` 의 기본 여백을 덮어 쓴다.
            **문구 위계 차이 두 개는 남는다** — 프로토타입 `.est>b` 는 17px/600 `--t2`,
            `.est>p` 는 15px `--t3` 인데 `EmptyState` 는 18px `--t1` / 15px `--t2` 다.
            `shared/ui/EmptyState` 는 이 티켓에서 고치지 않는 파일이라 그대로 뒀다.
          */}
          <EmptyState
            className="px-5 pt-13 pb-10"
            title="시세가 갱신되지 않아요"
            description="거래가 정지돼 있어 차트와 당일 시세를 보여드릴 수 없어요."
          />
          <SoftBox className="mt-1">
            <SoftBoxRow
              label="마지막 체결가"
              value={`${formatAmount(currentPrice)} 원`}
              valueClassName="font-semibold"
            />
            {/* 사유는 서버가 준 문장이다. 프로토타입의 목 문구(`감사의견 거절`)를
                박지 않는다 — contracts C46 이 `suspendedReason` 을 계약으로 뒀다. */}
            <SoftBoxRow
              label="정지 사유"
              value={
                suspendedReason ?? <NoValue label="정지 사유가 오지 않음" />
              }
            />
          </SoftBox>
        </section>
      ) : (
        <section className="mt-4.5">
          <ChartPeriodSegment interval={interval} onChange={onIntervalChange} />

          <div className="mt-5.5">
            {candles.isPending && (
              <Skeleton className={`${CHART_BOX_CLASS} w-full`} />
            )}

            {candles.isError && (
              <div
                className={`flex ${CHART_BOX_CLASS} flex-col items-center justify-center text-center`}
              >
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
                <div
                  className={`flex ${CHART_BOX_CLASS} items-center justify-center`}
                >
                  <p className="text-body-2 text-text-secondary">
                    표시할 시세 기록이 없어요
                  </p>
                </div>
              ) : (
                <CandleChart
                  candles={candles.data.candles}
                  interval={interval}
                  avgBuyPrice={avgBuyPrice}
                />
              ))}
          </div>
        </section>
      )}

      {/*
        내 보유 상세 (새 디코드 L1819–L1828). 껍데기의 요약 카드(`StockHoldingBox`)를
        누르면 이 자리로 온다 — 그래서 프로토타입과 같은 앵커 `hold-detail` 을 둔다.
        정지 종목에서도 그린다(프로토타입도 `d.tradableChart` 밖이다).

        **`평가금액` 줄 대신 `평균 매수가` 를 둔다.** 프로토타입 세 줄은
        `보유 수량`·`평가금액`·`평가손익` 인데 `StockHoldingSummary` 는 평가금액을
        주지 않는다 (apiSpec §5.2). `수량 x 현재가` 를 여기서 곱하면 현재가가 폴링으로
        흔들릴 때 서버의 포트폴리오 숫자와 어긋난다. 응답에 있는 값만 그린다.
      */}
      {holding !== null && (
        <section className="mt-8" id="hold-detail">
          <h2 className="mb-3.5 text-title-3 font-bold text-text-primary">
            내 보유 상세
          </h2>
          <SoftBox>
            <SoftBoxRow
              label="보유 수량"
              value={`${formatAmount(holding.quantity)}주`}
            />
            <SoftBoxRow
              label="평균 매수가"
              value={formatKrw(holding.avgBuyPrice)}
            />
            <SoftBoxRow
              label="평가손익"
              value={
                holding.evaluationProfit === null ||
                holding.evaluationProfitRate === null ? (
                  <NoValue label="시세가 없어 평가손익을 계산할 수 없음" />
                ) : (
                  `${formatSignedAmount(
                    holding.evaluationProfit,
                  )}원 (${formatSignedRate(holding.evaluationProfitRate)})`
                )
              }
              valueClassName={`font-bold ${
                holding.evaluationProfitRate === null
                  ? 'text-text-secondary'
                  : DIRECTION_TEXT_CLASS[
                      getPriceDirection(holding.evaluationProfitRate)
                    ]
              }`}
            />
          </SoftBox>
        </section>
      )}
    </>
  );
}
