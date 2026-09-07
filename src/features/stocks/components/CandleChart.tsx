import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';

import { formatKstDate } from '@/shared/lib/formatDate';
import {
  formatAmount,
  formatSignedAmount,
  formatSignedRate,
  getPriceDirection,
  type PriceDirection,
} from '@/shared/lib/formatNumber';
import { type Candle } from '@/shared/types/stock';

import { readCssToken } from '../lib/readCssToken';

/**
 * 일봉 캔들 차트 (`lightweight-charts` v5).
 *
 * **v5 API 다. v4 예제를 그대로 옮기면 안 된다.** v4 의 `chart.addCandlestickSeries()`
 * 는 v5 에서 사라졌고 `chart.addSeries(CandlestickSeries, options)` 로 바뀌었다.
 * 설치된 판은 5.2.1 이다.
 *
 * **색을 하드코딩하지 않는다.** 캔버스라 Tailwind 클래스가 닿지 않아서
 * `readCssToken` 으로 `--color-stock-up` · `--color-stock-down` 을 읽어 쓴다.
 * 상승 적색 · 하락 청색은 국내 관례다 (design.md §4). 위 고정 표시줄은 캔버스가
 * 아니라 일반 DOM 이라 다른 화면과 같은 `text-stock-up` 류 Tailwind 클래스를 쓴다
 * (`StockDetailHeader` 의 `DIRECTION_TEXT_CLASS` 와 같은 패턴).
 *
 * **거래량은 같은 차트에 겹쳐 그린다.** 별도 `priceScaleId` 를 주고 아래 30% 에
 * 밀어 넣는 방식이라(프로토타입도 캔들 아래 회색 막대를 같은 SVG 에 그린다)
 * 차트를 두 개 만들지 않는다 — 두 개면 가로축 스크롤이 따로 논다.
 *
 * 평균 매수가 점선은 보유 중일 때만 그린다 (프로토타입 `chartHasAvg`).
 *
 * `autoSize` 가 내부 `ResizeObserver` 로 폭을 따라간다. 직접 관찰자를 붙이지 않는다.
 *
 * **드래그·확대/축소와 값 읽기 (스페이스 38).** `handleScale`·`handleScroll` 을
 * 켜 핀치 줌·휠 줌·드래그 팬을 허용한다. `timeScale.fixLeftEdge`·`fixRightEdge` 는
 * 그대로 켜 둬 데이터 범위 밖으로는 못 끌려나가게 막는다 — 팬·줌 자체를 막는
 * 옵션이 아니라 "빈 공간을 보여주지 않는다" 는 제약이라 서로 충돌하지 않는다.
 * 값은 세로 십자선 + 차트 위 고정 표시줄(`activePoint`)로 읽는다. 아래 크로스헤어
 * 옵션 주석 참고.
 */

type CandleChartProps = {
  candles: readonly Candle[];
  /** 보유 중이면 평균 매수가에 점선을 긋는다. 없으면 긋지 않는다. */
  avgBuyPrice?: number | null;
  className?: string;
};

/**
 * 토큰을 읽지 못했을 때만 쓰는 중립 회색. 디자인 값이 아니라 "읽기 실패" 표시다.
 * 토큰 파일의 어떤 색과도 짝지어 두지 않는다 — 위 `readCssToken` 호출부 주석 참고.
 */
const FALLBACK_NEUTRAL = 'gray';

/** 고정 표시줄의 등락 색. `StockDetailHeader` 등 다른 화면과 같은 매핑이다. */
const DIRECTION_TEXT_CLASS: Record<PriceDirection, string> = {
  rise: 'text-stock-up',
  fall: 'text-stock-down',
  flat: 'text-stock-neutral',
};

/** `YYYY-MM-DD` 를 차트가 쓰는 UTC 초로 바꾼다. 일봉이라 자정 기준이면 충분하다. */
function toTimestamp(date: string): UTCTimestamp {
  return (Date.parse(`${date}T00:00:00Z`) / 1000) as UTCTimestamp;
}

/** 고정 표시줄에 그릴 한 캔들의 값. 전일 종가가 없는 첫 봉은 등락을 못 구해 `null`. */
type ChartPoint = {
  date: string;
  close: number;
  changeAmount: number | null;
  changeRate: number | null;
};

export function CandleChart({
  candles,
  avgBuyPrice,
  className = '',
}: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  /**
   * 십자선이 가리키는 캔들의 값. 마운트 직후와 손을 뗐을 때는 마지막(최신) 캔들로
   * 돌아간다 — 표시를 감추는 대신이다. 감추면 표시줄이 있다 없다 하며 레이아웃이
   * 흔들리고, 손을 뗀 상태는 "최신가를 보는 중"이라 마지막 값을 보여주는 쪽이
   * 오히려 자연스럽다 (헤더의 실시간 현재가와 같은 자리 감각).
   */
  const [activePoint, setActivePoint] = useState<ChartPoint | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }

    /**
     * 폴백은 토큰을 읽지 못했을 때만 쓰인다 (`document` 가 없는 환경).
     * **토큰 값을 복사해 두지 않는다** — 복사하면 다른 사람이 토큰을 고쳤을 때
     * 이 줄만 옛 값으로 남는다. 넷 다 같은 중립 회색이라 색이 뜻을 갖지 않고,
     * 특히 등락 두 색이 중립이라 방향을 거짓말하지 않는다.
     */
    const upColor = readCssToken('--color-stock-up', FALLBACK_NEUTRAL);
    const downColor = readCssToken('--color-stock-down', FALLBACK_NEUTRAL);
    const gridColor = readCssToken('--color-border', FALLBACK_NEUTRAL);
    const textColor = readCssToken('--color-text-muted', FALLBACK_NEUTRAL);

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: gridColor },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        // 팬·줌은 아래에서 켠다. 이 둘은 그것과 별개로 "데이터가 없는 빈 공간을
        // 보여주지 않는다" 는 제약이라 그대로 둔다 — 꺼야 팬이 되는 게 아니다.
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      /**
       * 세로 십자선만 켠다. 손가락이 짚은 자리는 손가락에 가려 못 읽고 모바일에는
       * 떠다니는 툴팁을 띄울 자리가 없다는 판단은 여전히 유효하다 — 그래서 값을
       * 십자선 옆이 아니라 차트 위 고정 표시줄(`activePoint`, 아래 JSX)에 그린다.
       * 고정 자리라 손가락에 가려지지 않고 자리 문제도 없다. 가로선은 계속 끈다:
       * 가격은 표시줄에서 이미 보여주므로 캔들 위에 겹쳐 그릴 값이 아니다.
       * 십자선 라벨(축에 뜨는 값 상자)도 끈다 — 표시줄과 같은 값을 두 번 보여줄
       * 필요가 없고, 라벨 배경은 라이브러리 기본 하드코딩 색이라 토큰 규약에도
       * 어긋난다.
       */
      crosshair: {
        vertLine: {
          visible: true,
          color: textColor,
          style: LineStyle.Dashed,
          labelVisible: false,
        },
        horzLine: { visible: false, labelVisible: false },
      },
      handleScale: true,
      handleScroll: true,
    });
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor,
      downColor,
      borderUpColor: upColor,
      borderDownColor: downColor,
      wickUpColor: upColor,
      wickDownColor: downColor,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: 'volume',
      priceFormat: { type: 'volume' },
      color: gridColor,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    // 거래량을 아래 25% 에만 깔아 캔들과 겹치지 않게 한다.
    chart
      .priceScale('volume')
      .applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });

    candleSeries.setData(
      candles.map((candle) => ({
        time: toTimestamp(candle.date),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      })),
    );

    volumeSeries.setData(
      candles.map((candle) => ({
        time: toTimestamp(candle.date),
        value: candle.volume,
      })),
    );

    if (avgBuyPrice !== null && avgBuyPrice !== undefined) {
      candleSeries.createPriceLine({
        price: avgBuyPrice,
        color: textColor,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '평균',
      });
    }

    chart.timeScale().fitContent();

    /**
     * 고정 표시줄에 쓸 값을 시각(초) 키로 미리 다 만들어 둔다. 십자선 이동마다
     * 다시 계산하지 않는다 — 이동은 마우스무브·터치무브만큼 잦다.
     * 등락은 하루 전 종가 대비다. 첫 봉은 전일이 없어 `null` (표시줄에서 갈라 그림).
     */
    const pointByTime = new Map<UTCTimestamp, ChartPoint>();
    let lastPoint: ChartPoint | null = null;
    let prevClose: number | null = null;
    for (const candle of candles) {
      const point: ChartPoint = {
        date: candle.date,
        close: candle.close,
        changeAmount: prevClose === null ? null : candle.close - prevClose,
        changeRate:
          prevClose === null
            ? null
            : ((candle.close - prevClose) / prevClose) * 100,
      };
      pointByTime.set(toTimestamp(candle.date), point);
      lastPoint = point;
      prevClose = candle.close;
    }

    // 마운트 직후 기본값 — 아직 아무 데도 짚지 않았을 때 최신 캔들을 보여준다.
    setActivePoint(lastPoint);

    chart.subscribeCrosshairMove((param) => {
      if (param.time === undefined) {
        // 차트 밖으로 나갔거나(마우스아웃) 손을 뗐다. 최신 값으로 되돌린다.
        setActivePoint(lastPoint);
        return;
      }
      setActivePoint(pointByTime.get(param.time as UTCTimestamp) ?? lastPoint);
    });

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, avgBuyPrice]);

  const direction: PriceDirection =
    activePoint === null || activePoint.changeAmount === null
      ? 'flat'
      : getPriceDirection(activePoint.changeAmount);

  return (
    <div className={`w-full ${className}`}>
      {/* 십자선이 가리키는 값. 캔버스 밖 일반 DOM 이라 손가락에 가려지지 않는다. */}
      <div
        className="flex items-baseline justify-between gap-3 px-1 pb-2"
        aria-live="polite"
      >
        <span className="text-caption text-text-muted tabular-nums">
          {activePoint === null ? '' : formatKstDate(activePoint.date)}
        </span>
        {activePoint !== null && (
          <span
            className={`text-body-2 font-medium tabular-nums ${DIRECTION_TEXT_CLASS[direction]}`}
          >
            {formatAmount(activePoint.close)}원
            {activePoint.changeAmount !== null &&
              activePoint.changeRate !== null && (
                <>
                  {' '}
                  · {formatSignedAmount(activePoint.changeAmount)} (
                  {formatSignedRate(activePoint.changeRate)})
                </>
              )}
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        className="h-[220px] w-full"
        role="img"
        aria-label="주가 캔들 차트"
      />
    </div>
  );
}
