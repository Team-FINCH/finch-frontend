import { PORTFOLIO_TABS, type PortfolioTab } from '../lib/usePortfolioTabState';

type PortfolioTabBarProps = {
  tab: PortfolioTab;
  onChange: (tab: PortfolioTab) => void;
};

/**
 * 포트폴리오 4중 탭 버튼 (프로토타입 `.tabs` — `pftab` 상태값 넷).
 * 하단 탭 바(`shared/ui/TabBar.tsx`)와는 다른 것이다 — 이건 화면 안의 상태 전환이라
 * 눌러도 `replace`고 히스토리를 쌓지 않는다(`frontConvention.md` §10).
 *
 * 실측값(`.tabs`/`.tabs button`/`.tabs button.on`) — gap 24px · border-bottom 1px ·
 * 버튼 padding 14px 0 12px · 글자 16px/500 · 선택 시 1.5px 밑줄 + 700.
 *
 * ## 스크롤 컨테이너 맨 위에 붙는다
 *
 * 프로토타입은 `.nav` 와 `.tabs` 를 둘 다 `flex:none` 으로 `.sc` 밖에 두고 본문만
 * 굴린다(proto `template.html` L1038·L1105·L2150-2152). `PageHeader` 는 그대로
 * `PageMain` 밖에 있고(FINCH-231), 이 줄만 `PageMain` 안에 남아 `sticky top-0`
 * 으로 같은 자리를 지킨다 — 스크롤 컨테이너가 헤더 바로 아래에서 시작하므로
 * `top-0` 이 곧 헤더 바로 아래다. `PortfolioPage` 가 `PageMain` 에 `pt-0` 을 주어
 * 그 사이에 여백이 끼지 않게 한다.
 *
 * **전에는 `top-(--page-header-height)` 였다.** 헤더가 같은 스크롤 컨테이너 안에서
 * `sticky top-0` 로 버티던 시절의 값이다. 헤더가 스크롤 밖으로 나가면서 기준점이
 * 컨테이너 위 경계로 바뀌어 0 이 됐다.
 *
 * **좌우 26px 을 음수 마진으로 도로 끌어온다.** 붙박이가 되면 본문이 이 줄 아래로
 * 지나가므로 배경이 있어야 하고, 배경이 `PageMain` 의 좌우 여백만큼 모자라면
 * 그 틈으로 지나가는 글자가 비쳐 보인다. 덤으로 밑줄이 화면 끝까지 그어져
 * 프로토타입 `.tabs`(`padding:0 26px`, 테두리는 화면 폭 전체)와 같아진다.
 *
 * `z` 는 같은 컨테이너 안에서 굴러가는 본문보다 위에 있기 위한 것이다.
 */
export function PortfolioTabBar({ tab, onChange }: PortfolioTabBarProps) {
  return (
    <div
      role="tablist"
      aria-label="포트폴리오"
      className="sticky top-0 z-9 -mx-6.5 flex gap-6 border-b border-border bg-bg px-6.5"
    >
      {PORTFOLIO_TABS.map((item) => {
        const isActive = item.value === tab;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.value)}
            className={[
              '-mb-px border-b-[1.5px] pt-3.5 pb-3 text-body-1 transition-colors duration-(--motion-normal) ease-standard',
              isActive
                ? 'border-text-primary font-bold text-text-primary'
                : 'border-transparent font-medium text-text-muted',
            ].join(' ')}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
