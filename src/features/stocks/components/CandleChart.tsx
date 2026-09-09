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
import { formatAmount } from '@/shared/lib/formatNumber';
import { type CandleInterval } from '@/shared/types/candleInterval';
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
 *
 * **값은 짚은 동안만 검정 툴팁으로 읽는다** (프로토타입 `xtip`·`xhOn`, 새 디코드
 * L1770–L1781). 전에는 차트 위에 고정 표시줄을 두고 손을 뗀 뒤에도 마지막 봉 값을
 * 남겼는데, 프로토타입과 design.md L436("Press/Hover 시에만 세부 포인트 라벨 표시")
 * 둘이 함께 "짚었을 때만" 을 말한다. 그래서 표시줄을 걷어내고 툴팁으로 바꿨다.
 * 툴팁은 차트 위에 겹치고 **커서가 오른쪽 절반이면 왼쪽으로 붙는다**(위치 반전) —
 * 손가락이 툴팁을 가리지 않게 하는 프로토타입 규칙이다(`xh.tipSide`).
 *
 * 툴팁이 담는 것은 날짜 · 시/고/저/종 2×2 격자 · 거래량 세 줄이다.
 * **등락을 넣지 않는다** — 프로토타입 격자가 두 줄이고 거기에 등락 칸이 없다.
 */

type CandleChartProps = {
  candles: readonly Candle[];
  /** 봉 종류. 초기 표시 범위를 몇 개로 잡을지가 여기서 갈린다. */
  interval: CandleInterval;
  /** 보유 중이면 평균 매수가에 점선을 긋는다. 없으면 긋지 않는다. */
  avgBuyPrice?: number | null;
  className?: string;
};

/**
 * 토큰을 읽지 못했을 때만 쓰는 중립 회색. 디자인 값이 아니라 "읽기 실패" 표시다.
 * 토큰 파일의 어떤 색과도 짝지어 두지 않는다 — 위 `readCssToken` 호출부 주석 참고.
 */
const FALLBACK_NEUTRAL = 'gray';

/** 차트 높이. 프로토타입 SVG 가 150px 이다 (새 디코드 L1782). */
const CHART_HEIGHT_CLASS = 'h-[150px]';

/**
 * 첫 진입에 보일 봉 개수 (봉 종류별).
 *
 * **`fitContent()` 를 쓰지 않는다.** 받은 봉을 전량 화면 폭에 맞추는 함수라,
 * 확대·축소 여유분으로 넉넉히 받아 두는 설계와 정면으로 부딪힌다 — 여유분이
 * 그대로 초기 화면이 돼 버린다. 390px 폭에 일봉 1,000개를 맞추면 봉 하나가
 * 0.5px 이라 캔들이 실선으로 뭉갠다. 되돌리고 싶어지는 자리지만 되돌리지 마라.
 *
 * 숫자는 계약이 실제로 주는 개수다 (apiSpec §5.3 · `CANDLE_INTERVAL_REQUEST_PERIOD`).
 * 일봉은 `3M`(90일 중 거래일 약 60개), 주봉은 `1Y`(52주), 월봉은 `3Y`(36개월).
 * 목 서버가 이보다 많이 주더라도 초기 화면은 이 개수만 보이고, 축소하면 과거가 나온다.
 */
const INITIAL_VISIBLE_BAR_COUNT: Record<CandleInterval, number> = {
  DAY: 60,
  WEEK: 52,
  MONTH: 36,
};

/** `YYYY-MM-DD` 를 차트가 쓰는 UTC 초로 바꾼다. 일봉이라 자정 기준이면 충분하다. */
function toTimestamp(date: string): UTCTimestamp {
  return (Date.parse(`${date}T00:00:00Z`) / 1000) as UTCTimestamp;
}

/** 툴팁에 그릴 한 캔들의 값 (프로토타입 `xh` payload). */
type ChartPoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

/**
 * 툴팁이 붙는 쪽. 커서가 차트 오른쪽 절반이면 왼쪽에 붙인다 — 프로토타입
 * `tipSide: cx > 175 ? "left:0" : "right:0"` (viewBox 폭 350 의 절반).
 */
type TooltipState = { point: ChartPoint; side: 'left' | 'right' };

export function CandleChart({
  candles,
  interval,
  avgBuyPrice,
  className = '',
}: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  /**
   * 짚은 캔들. 짚지 않았으면 `null` 이고 툴팁을 그리지 않는다 — 프로토타입
   * `xhOn`(`s.xhIdx != null`) 과 같은 조건이다. 차트가 캔버스라 툴팁은 그 위에
   * 겹치는 일반 DOM 이고, 자리는 위 `TooltipState` 주석 참고.
   */
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

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
    /*
     * 거래량은 아래 15% 에만 깐다. 프로토타입 막대는 150px 중 6~28px 이고
     * design.md L431 도 "하단 약 15~20%" 다 — 전에 쓰던 22% 는 그 범위 밖이었다.
     */
    chart
      .priceScale('volume')
      .applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

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
      /*
       * 라벨 문구는 프로토타입 그대로 `내 평균 {금액}원` 이다 (새 디코드 L1802,
       * `chartAvgLabel`). 전에는 축 라벨에 값만 띄우고 선 위에 `평균` 만 적었는데,
       * 프로토타입은 선 왼쪽에 문장 하나로 적고 축에는 아무것도 띄우지 않는다.
       */
      candleSeries.createPriceLine({
        price: avgBuyPrice,
        color: textColor,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: false,
        title: `내 평균 ${formatAmount(avgBuyPrice)}원`,
      });
    }

    /*
     * 초기 표시 범위를 봉 개수로 고정한다 (위 `INITIAL_VISIBLE_BAR_COUNT` 주석 참고).
     * 논리 인덱스는 봉 하나가 1 이고, 봉 중심이 정수 자리라 좌우로 반 칸씩 넓혀야
     * 첫 봉과 끝 봉이 잘리지 않는다. 봉이 정해진 개수보다 적게 오면(신규 상장·
     * 시세가 며칠뿐인 종목) `from` 이 음수가 되지 않게 0 에서 끊는다 —
     * `fixLeftEdge` 가 켜져 있어 음수 범위는 어차피 되밀리지만, 되밀리는 만큼
     * 오른쪽에 빈 칸이 생긴다.
     */
    const visibleBarCount = INITIAL_VISIBLE_BAR_COUNT[interval];
    chart.timeScale().setVisibleLogicalRange({
      from: Math.max(0, candles.length - visibleBarCount) - 0.5,
      to: candles.length - 0.5,
    });

    /**
     * 툴팁에 쓸 값을 시각(초) 키로 미리 다 만들어 둔다. 십자선 이동마다 다시
     * 계산하지 않는다 — 이동은 마우스무브·터치무브만큼 잦다.
     */
    const pointByTime = new Map<UTCTimestamp, ChartPoint>();
    for (const candle of candles) {
      pointByTime.set(toTimestamp(candle.date), {
        date: candle.date,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
      });
    }

    chart.subscribeCrosshairMove((param) => {
      const point =
        param.time === undefined
          ? undefined
          : pointByTime.get(param.time as UTCTimestamp);
      if (point === undefined || param.point === undefined) {
        // 차트 밖으로 나갔거나 손을 뗐다. 툴팁을 지운다 (프로토타입 `xhOff`).
        setTooltip(null);
        return;
      }
      const width = container.clientWidth;
      setTooltip({
        point,
        side: param.point.x > width / 2 ? 'left' : 'right',
      });
    });

    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, interval, avgBuyPrice]);

  return (
    <div className={`relative w-full ${className}`}>
      {tooltip !== null && (
        /*
          검정 툴팁 (프로토타입 `.xtip`, 새 디코드 L1123·L1771–L1781).
          실측 — `top:0` · `max-width:63%` · 반경 9 · 안쪽 8/10 ·
          면 `rgba(36,39,44,.95)`(`--color-ai-surface` 가 `#24272C` 로 같은 색이다) ·
          그림자 `0 4px 14px rgba(31,35,40,.18)` · `pointer-events:none`.

          종가는 `--color-tip-up`(`#F08A8A`) · `--color-tip-down`(`#8FB6F5`) 으로
          칠한다 — 프로토타입 `tipTone` 이 종가와 시가를 견줘 가르는 값이다
          (새 디코드 L1777·L3790, `c>=o` 면 상승색). **검정 면 위에서만 쓰는 색이라
          툴팁 밖으로 넘겨 쓰지 않는다** (`shared/styles/index.css` 의 토큰 주석).
        */
        <div
          aria-live="polite"
          className={`pointer-events-none absolute top-0 z-3 max-w-[63%] rounded-[9px] bg-ai-surface/95 px-2.5 py-2 shadow-[0_4px_14px_rgba(31,35,40,0.18)] ${
            tooltip.side === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          <div className="mb-1.25 text-[11px] text-white/55 tabular-nums">
            {formatKstDate(tooltip.point.date)}
          </div>
          <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.75">
            <span className="text-[11.5px] whitespace-nowrap text-white/50">
              시{' '}
              <b className="font-semibold text-white tabular-nums">
                {formatAmount(tooltip.point.open)}
              </b>
            </span>
            <span className="text-[11.5px] whitespace-nowrap text-white/50">
              고{' '}
              <b className="font-semibold text-white tabular-nums">
                {formatAmount(tooltip.point.high)}
              </b>
            </span>
            <span className="text-[11.5px] whitespace-nowrap text-white/50">
              저{' '}
              <b className="font-semibold text-white tabular-nums">
                {formatAmount(tooltip.point.low)}
              </b>
            </span>
            <span className="text-[11.5px] whitespace-nowrap text-white/50">
              종{' '}
              <b
                className={`font-bold tabular-nums ${
                  tooltip.point.close >= tooltip.point.open
                    ? 'text-tip-up'
                    : 'text-tip-down'
                }`}
              >
                {formatAmount(tooltip.point.close)}
              </b>
            </span>
          </div>
          <div className="mt-1.25 text-[11px] whitespace-nowrap text-white/50 tabular-nums">
            거래량 {formatAmount(tooltip.point.volume)}
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className={`${CHART_HEIGHT_CLASS} w-full`}
        role="img"
        aria-label="주가 캔들 차트"
      />
    </div>
  );
}
