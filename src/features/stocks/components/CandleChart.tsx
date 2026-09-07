import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineStyle,
  createChart,
  type IChartApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useEffect, useRef } from 'react';

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
 * 상승 적색 · 하락 청색은 국내 관례다 (design.md §4).
 *
 * **거래량은 같은 차트에 겹쳐 그린다.** 별도 `priceScaleId` 를 주고 아래 30% 에
 * 밀어 넣는 방식이라(프로토타입도 캔들 아래 회색 막대를 같은 SVG 에 그린다)
 * 차트를 두 개 만들지 않는다 — 두 개면 가로축 스크롤이 따로 논다.
 *
 * 평균 매수가 점선은 보유 중일 때만 그린다 (프로토타입 `chartHasAvg`).
 *
 * `autoSize` 가 내부 `ResizeObserver` 로 폭을 따라간다. 직접 관찰자를 붙이지 않는다.
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

/** `YYYY-MM-DD` 를 차트가 쓰는 UTC 초로 바꾼다. 일봉이라 자정 기준이면 충분하다. */
function toTimestamp(date: string): UTCTimestamp {
  return (Date.parse(`${date}T00:00:00Z`) / 1000) as UTCTimestamp;
}

export function CandleChart({
  candles,
  avgBuyPrice,
  className = '',
}: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);

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
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      // 십자선은 손가락으로 정확히 짚기 어렵고 모바일에서 툴팁을 띄울 자리도 없다.
      crosshair: { horzLine: { visible: false }, vertLine: { visible: false } },
      handleScale: false,
      handleScroll: false,
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

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, avgBuyPrice]);

  return (
    <div
      ref={containerRef}
      className={`h-[220px] w-full ${className}`}
      role="img"
      aria-label="주가 캔들 차트"
    />
  );
}
