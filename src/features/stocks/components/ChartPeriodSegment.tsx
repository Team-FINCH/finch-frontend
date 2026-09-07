import { type CandlePeriod } from '@/shared/types/stock';

import { CANDLE_PERIOD_OPTIONS } from '../lib/stockDetailParams';

/**
 * 기간 세그먼티드 (프로토타입 `.seg`).
 *
 * 실측값 — 트랙 높이 38px · 반경 12px(`--radius-12`) · 안쪽 여백 4px · 버튼 반경 9px ·
 * 선택된 버튼만 흰 면 + 옅은 그림자, 나머지는 글자색 `--t3`.
 *
 * **세 기간 모두 일봉이다** (apiSpec §5.3).
 *
 * TODO(계약): 분봉 제공 여부가 미확정이라 `1D`·`1W` 탭을 넣지 않았다. 목록을
 * `CANDLE_PERIOD_OPTIONS` 한 곳에서만 만들어, 분봉이 들어오면 그 배열과
 * `CandlePeriodSchema` 만 늘리면 이 컴포넌트는 그대로 쓴다 (ia.md §2 "탭 구성은
 * 데이터가 정해진 뒤에 늘린다").
 * — 근거: contracts P11 / 스프린트 0 결정
 */
type ChartPeriodSegmentProps = {
  period: CandlePeriod;
  onChange: (period: CandlePeriod) => void;
};

export function ChartPeriodSegment({
  period,
  onChange,
}: ChartPeriodSegmentProps) {
  return (
    <div
      role="group"
      aria-label="차트 기간"
      className="flex h-9.5 gap-1 rounded-12 bg-surface-soft p-1"
    >
      {CANDLE_PERIOD_OPTIONS.map((option) => {
        const isActive = option.value === period;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded-[9px] text-body-2 font-medium transition-all duration-(--motion-normal) ease-standard ${
              isActive
                ? 'bg-surface text-text-primary shadow-[0_1px_3px_rgba(31,35,40,0.06)]'
                : 'text-text-muted'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
