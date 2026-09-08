import { type CandleInterval } from '@/shared/types/stock';

import { CANDLE_INTERVAL_OPTIONS } from '../lib/stockDetailParams';

/**
 * 봉 종류 세그먼티드 (프로토타입 `.seg`). 이름은 `ChartPeriodSegment` 지만 지금은
 * 기간이 아니라 **봉 종류**를 고른다 — 아래 TODO 참고. 다른 파일들이 이미 이
 * 이름으로 이 컴포넌트를 참조하고 있어 이번 작업에서는 파일·컴포넌트 이름을
 * 바꾸지 않았다.
 *
 * 실측값 — 트랙 높이 38px · 반경 12px(`--radius-12`) · 안쪽 여백 4px · 버튼 반경 9px ·
 * 선택된 버튼만 흰 면 + 옅은 그림자, 나머지는 글자색 `--t3`.
 *
 * **TODO(계약): 캔들 interval — 이슈 #37 회신 전 임시값.** 탭은 기간(`period`,
 * 1개월·3개월·1년)이 아니라 **봉 종류**(`interval`, 일봉·주봉·월봉)를 고른다 —
 * 보이는 범위는 확대/축소가 맡고, 이 탭은 캔들 하나가 며칠치를 묶는지만 고른다.
 * `apiSpec §5.3` 응답은 `period`·`interval` 이 이미 나뉘어 있고, `interval` 은
 * 지금 `DAY` 하나뿐이라 주봉·월봉은 백엔드 구두 확인만 있는 상태다(이슈 #37).
 * 값·라벨 목록은 `@/shared/types/candleInterval.ts` 한 곳(`CANDLE_INTERVAL_OPTIONS`)
 * 에서만 만든다 — 회신이 와서 값이 바뀌어도 이 컴포넌트는 그대로 쓴다. 근거·
 * 되돌리기 절차는 그 파일 머리 주석 참고.
 * — 근거: contracts P11 / 스프린트 0 결정 (분봉 미확정이라는 전제는 여전히 유효)
 */
type ChartPeriodSegmentProps = {
  interval: CandleInterval;
  onChange: (interval: CandleInterval) => void;
};

export function ChartPeriodSegment({
  interval,
  onChange,
}: ChartPeriodSegmentProps) {
  return (
    <div
      role="group"
      aria-label="봉 종류"
      className="flex h-9.5 gap-1 rounded-12 bg-surface-soft p-1"
    >
      {CANDLE_INTERVAL_OPTIONS.map((option) => {
        const isActive = option.value === interval;
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
