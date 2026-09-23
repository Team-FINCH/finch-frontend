import {
  CAUSE_VIEWS,
  CAUSE_VIEW_PANEL_ID,
  causeViewTabId,
  type CauseView,
} from '../lib/attributionInsight';

/**
 * 수익률 분석 탭 안의 2차 탭 — `요약` · `기여 분석` · `종목별` (FINCH-333).
 *
 * ## 한 화면에 탭 줄이 셋인데 왜 괜찮은가
 *
 * 위에서부터 `보유/AI 진단/수익률 분석/투자 기준`(4탭) · `1일~올해`(기간) ·
 * 이 줄이다. 셋이 같은 모양이면 어느 것이 무엇을 가르는지 알 수 없어서 **모양을
 * 셋 다 다르게 뒀다.**
 *
 * ```
 * 보유   AI 진단   수익률 분석   투자 기준   ← 밑줄 1.5px, 아래 경계선까지 (화면이 갈린다)
 * 1일  1주  1개월  3개월  올해              ← 글자만, 면 없음 (같은 화면의 다른 구간)
 * ┌────┬─────────┬────────┐
 * │ 요약 │ 기여 분석 │ 종목별 │              ← 채워진 트랙 (같은 구간을 읽는 깊이)
 * └────┴─────────┴────────┘
 * ```
 *
 * 면을 가진 것은 이 줄 하나다. 기간 줄이 글자만인 것은 그쪽 주석의 판단이고
 * (`AttributionPeriodTabs` — "채워진 버튼 다섯 개를 얹으면 바로 아래 hero 보다
 * 먼저 눈에 띈다"), 이 줄은 hero **아래**에 서므로 같은 문제가 없다.
 *
 * ## 붙박이로 만들지 않았다
 *
 * `PortfolioTabBar` 가 이미 `sticky top-0` 이라 여기에 또 붙박이를 쌓으면 기준점이
 * 그 줄의 높이가 되는데, 그 값이 토큰이 아니라 padding 과 행간의 합이다. 손으로
 * 적은 숫자가 4탭 줄의 글자 크기를 따라 조용히 어긋난다. 탭을 가른 뒤 한 패널의
 * 높이가 짧아져서 붙박이가 벌어 주는 것도 적다.
 *
 * ## `.seg` 를 따르되 두 값을 올렸다 (FINCH-333)
 *
 * 바탕은 프로토타입 `.seg` 실측이다 — 반경 12px(`--radius-12`) · 안쪽 여백 4px ·
 * 버튼 반경 9px · 선택된 버튼만 흰 면 + 그림자. 종목 상세의
 * `ChartPeriodSegment` 와 같은 값이고, feature 끼리는 import 하지 않아서
 * (ESLint `import-x/no-restricted-paths`) 옮겨 적었다.
 * **셋째 자리가 생기면 `shared/ui` 로 올리는 것이 맞다.**
 *
 * 두 가지가 다르다.
 *
 * **1. 높이 36px.** 한때 44px 까지 올렸다가 되돌렸다 — 요약 탭이 카드를 전부
 * 걷고 배경 위 글이 되자, 44px 회색 트랙이 **화면에서 가장 큰 덩어리**가 되어
 * 히어로 숫자 바로 아래에서 시선을 가져갔다. 글자도 15px 에서 13px 로 내렸다.
 *
 * **터치 영역은 줄지 않았다.** 버튼이 트랙 높이를 꽉 채우고 좌우로 1/3 씩
 * 가져가므로 한 칸이 약 107×36px 이다. design.md §15 의 44px 은 아이콘 버튼처럼
 * 사방이 좁은 표적에 걸리는 기준이고, 이 칸은 가로가 그 두 배가 넘는다.
 *
 * **2. 선택/비선택 대비를 넷으로 벌렸다.** 전에는 면색과 굵기 둘이었다.
 *
 * | | 면 | 굵기 | 글자색 | 그림자 |
 * | --- | --- | --- | --- | --- |
 * | 선택 | 흰색 | 700 | `--color-text-primary` (15.80) | 0 1px 3px .10 |
 * | 비선택 | (트랙) | 500 | `--color-text-secondary` (6.3) | 없음 |
 *
 * 비선택 글자색을 `--color-text-muted`(#78828E)에서 올렸다. 트랙(#F1F3F6) 위
 * 대비가 3.7 로 **AA 미달이었고**, 그래서 고르지 않은 두 칸이 비활성 버튼처럼
 * 보였다. `--color-text-secondary` 는 같은 면에서 6.3 이다. 대비가 올라가도
 * 선택된 칸과 헷갈리지 않는다 — 흰 면·굵기·15.80 이 셋으로 이미 갈린다.
 *
 * 그림자를 .06 에서 .10 으로 올렸다. .06 은 375px 실기기에서 거의 보이지 않아
 * 흰 칸이 트랙 위에 떠 있다는 느낌을 주지 못했다.
 *
 * ## 접근성
 *
 * `role="tab"` · `aria-selected` · `aria-controls` 로 패널과 이어 둔다. 패널 쪽이
 * `aria-labelledby` 로 되받으므로 **패널 안에 탭 이름을 `h2` 로 또 적지 않는다** —
 * `기여 분석` 탭 안에 `수익률 기여` 제목이 다시 서면 같은 말이 두 번이다.
 *
 * 화살표 키 이동은 넣지 않았다. 같은 레포의 `PortfolioTabBar`·
 * `AttributionPeriodTabs` 가 둘 다 `role="tab"` 만 쓰고 있어서 여기만 다른 규칙을
 * 가지면 한 화면에서 탭마다 키 동작이 갈린다. 셋을 같이 올리는 것이 맞다.
 */

type CauseViewTabsProps = {
  value: CauseView;
  onChange: (view: CauseView) => void;
  className?: string;
};

export function CauseViewTabs({
  value,
  onChange,
  className = '',
}: CauseViewTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="수익률 분석 보기"
      className={`flex h-9 gap-1 rounded-sm bg-surface-soft p-[3px] ${className}`}
    >
      {CAUSE_VIEWS.map((item) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            id={causeViewTabId(item.value)}
            aria-selected={selected}
            aria-controls={CAUSE_VIEW_PANEL_ID}
            onClick={() => onChange(item.value)}
            className={`flex-1 rounded-[7px] text-caption transition-all duration-(--motion-normal) ease-standard ${
              selected
                ? 'bg-surface font-bold text-text-primary shadow-[0_1px_2px_rgba(31,35,40,0.08)]'
                : 'font-medium text-text-secondary'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
