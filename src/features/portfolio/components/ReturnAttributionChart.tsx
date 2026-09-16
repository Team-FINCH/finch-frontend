import { useState } from 'react';

import { formatSignedPercent } from '@/shared/lib/formatNumber';
import { type AiAttributionContent } from '@/shared/types/ai/attribution';

import {
  ATTRIBUTION_FACTOR_LABEL,
  ATTRIBUTION_FACTOR_ORDER,
  divergingScale,
  divergingWidth,
  resolveMainFactor,
} from '../lib/attributionInsight';

/**
 * "무엇이 영향을 줬나요?" — 시장·업종·종목 선택 세 축의 발산 막대
 * (FINCH-308, 프로토타입 `attribution` proto L2314-2323 을 대체한다).
 *
 * ## 왜 막대로 바꿨는가
 *
 * 전에는 세 값을 `라벨 ······ +1.21%` 한 줄씩으로만 적었다. 숫자가 셋 다 소수점
 * 둘째 자리라 **어느 것이 큰지 눈으로 훑어지지 않고 읽어서 비교해야 했다.**
 * 이 탭의 질문 자체가 "셋 중 무엇이 컸나" 이므로 크기 비교가 화면의 본문이다.
 *
 * ## 0 을 가운데 둔다
 *
 * 세 축은 부호가 서로 엇갈리는 것이 정상이다 — 시장이 끌어내리고 선택이 받치는
 * 기간이 이 화면에서 가장 설명할 거리가 많은 기간이다. 왼쪽 정렬 막대로 그리면
 * 그 엇갈림이 길이에서 사라지고 부호는 숫자에만 남는다. 가운데 축을 두면
 * **어느 쪽이 깎고 어느 쪽이 보탰는지가 막대의 방향만으로 읽힌다.**
 *
 * ## 합계를 적지 않는다
 *
 * `market + sector + selection` 은 기간 수익률과 정확히 같다(엔진이 항등식을
 * 검증한다). 그래도 화면에 합계 줄을 두지 않는다 — 같은 값이 위
 * `PerformanceSummary` 에 이미 크게 있고, 한 수치를 두 곳에 적으면 포맷이
 * 갈라지는 날 둘이 달라 보인다.
 *
 * 대신 물음표 팝오버에 계산 기준을 남긴다. 문구는 기존 것을 그대로 옮겼다.
 *
 * ## 강조는 파생값이고 문구가 아니다
 *
 * 가장 영향이 큰 축을 `resolveMainFactor` 로 골라 라벨을 굵게 한다. 이것은
 * 엔진 값 비교의 결과지 해석이 아니다 — **"종목 선택이 이번 수익률을 끌어올렸어요"
 * 같은 문장을 화면이 지어내지 않는다.** 응답에 항목별 설명 필드가 없으므로 값과
 * 라벨만 표시한다는 규칙은 개편 뒤에도 그대로다. 해석하는 문장은 AI 카드에만 있다.
 */

/** 프로토타입이 이 탭의 소제목을 `.sht` 위에 20px 로 덮어 쓴다 (proto L2305). */
const SUBTITLE_CLASS =
  'text-[20px] font-bold tracking-[-0.02em] text-text-primary';

/** 프로토타입 `.info` — 18px 원 · 1.4px 테두리 · 11px/700 · 왼쪽 5px (proto L1146). */
const INFO_BUTTON_CLASS =
  'ml-1.25 flex size-4.5 flex-none items-center justify-center rounded-full ' +
  'border-[1.4px] border-text-muted text-[11px] font-bold text-text-muted';

/** 프로토타입 `.pop` — 화면 폭에 붙고(left/right 0) 반경 12px · 패딩 13/14 (proto L1118). */
const POPOVER_CLASS =
  'absolute top-full right-0 left-0 z-10 mt-2 flex items-start gap-2.5 ' +
  'rounded-12 bg-text-primary px-3.5 py-[13px] text-surface shadow-float';

type ReturnAttributionChartProps = {
  breakdown: AiAttributionContent['breakdown'];
};

export function ReturnAttributionChart({
  breakdown,
}: ReturnAttributionChartProps) {
  const [infoOpen, setInfoOpen] = useState(false);

  const scale = divergingScale(
    ATTRIBUTION_FACTOR_ORDER.map((factor) => breakdown[factor]),
  );
  const mainFactor = resolveMainFactor(breakdown);

  return (
    <section className="mb-10">
      <div className="relative mb-5 flex items-center gap-1.75">
        <h2 className={SUBTITLE_CLASS}>무엇이 영향을 줬나요?</h2>
        <button
          type="button"
          aria-label="계산 기준 보기"
          onClick={() => setInfoOpen((prev) => !prev)}
          className={INFO_BUTTON_CLASS}
        >
          ?
        </button>
        {infoOpen && (
          <div className={POPOVER_CLASS}>
            <span className="flex-1 text-caption text-pretty text-surface/86">
              내 자산의 변화를 시장 · 업종 · 종목으로 나눠봤어요. 각 값은 계산
              기준이 달라서 그대로 더해지지 않아요.
            </span>
            <button
              type="button"
              aria-label="닫기"
              onClick={() => setInfoOpen(false)}
              className="flex-none text-caption text-surface/50"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {ATTRIBUTION_FACTOR_ORDER.map((factor) => (
          <FactorBar
            key={factor}
            label={ATTRIBUTION_FACTOR_LABEL[factor]}
            value={breakdown[factor]}
            scale={scale}
            emphasized={factor === mainFactor}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * 한 축. `라벨 · 막대 · 값` 가로 배치다.
 *
 * 막대는 `div` 로 그린다. 세 칸짜리 정적 도형이라 캔버스도 SVG 도 필요 없고,
 * `lightweight-charts` 는 시계열 전용이라 애초에 맞지 않는다. 새 차트 라이브러리는
 * `package.json` 변경이라 이 화면 하나를 위해 넣지 않는다.
 *
 * **막대에 `aria-hidden` 을 둔다.** 같은 값이 바로 오른쪽에 글자로 서 있어서
 * 낭독기가 읽을 것이 없다 (`StockConcentrationSection` 의 스택 바와 같은 처리다).
 *
 * 라벨 칸(`w-18` = 72px)과 값 칸(`w-16` = 64px)은 폭을 고정한다. 셋 다 유동으로
 * 두면 값의 자릿수(`+0.2%` 와 `+12.34%`)에 따라 막대 시작점이 줄마다 어긋나
 * 가운데 0 축이 세로로 안 맞는다 — 축이 어긋나면 발산 막대를 쓴 이유가 없어진다.
 * 72px 은 라벨 셋(`시장 영향`·`업종 영향`·`종목 선택`)이 15px 굵은 글씨로 들어가는
 * 폭이다. 라벨을 더 긴 말로 바꾸면 이 값도 같이 봐야 한다.
 */
function FactorBar({
  label,
  value,
  scale,
  emphasized,
}: {
  label: string;
  value: number;
  scale: number;
  emphasized: boolean;
}) {
  const width = divergingWidth(value, scale);
  const positive = value > 0;
  const tone = positive ? 'bg-stock-up' : 'bg-stock-down';

  return (
    <div className="flex items-center gap-3">
      <span
        className={`w-18 flex-none truncate text-body-2 ${
          emphasized
            ? 'font-bold text-text-primary'
            : 'font-medium text-text-secondary'
        }`}
      >
        {label}
      </span>

      <span aria-hidden="true" className="relative h-4.5 min-w-0 flex-1">
        {/* 0 축. 막대보다 먼저 깔아 막대가 축 위를 덮게 둔다. */}
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border-strong" />
        {value !== 0 && (
          <span
            className={`absolute inset-y-1 rounded-[3px] ${tone}`}
            style={
              positive
                ? { left: '50%', width: `${width}%` }
                : { right: '50%', width: `${width}%` }
            }
          />
        )}
      </span>

      <span
        className={`w-16 flex-none text-right text-body-2 font-bold tabular-nums ${
          value === 0
            ? 'text-stock-neutral'
            : positive
              ? 'text-stock-up'
              : 'text-stock-down'
        }`}
      >
        {formatSignedPercent(value)}
      </span>
    </div>
  );
}
