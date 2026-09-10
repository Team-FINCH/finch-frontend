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
 * ## 스크롤 밖에 남는다
 *
 * 프로토타입은 `.nav` 와 `.tabs` 를 둘 다 `flex:none` 으로 `.sc` 밖에 두고 본문만
 * 굴린다(proto `template.html` L1038·L1105·L2150-2152). 우리는 `PageMain` 이 `.sc`
 * 자리를 맡고 그 안에 헤더·탭 줄이 들어 있어서, 같은 결과를 `sticky` 로 만든다 —
 * `PageHeader` 가 `top-0` 에 서고 이 줄이 그 바로 아래 `--page-header-height` 에 선다.
 * 값을 직접 적지 않는 이유는 헤더 높이가 `shared/ui/PageHeader` 의 것이라 여기서
 * 알 수 없기 때문이다.
 *
 * **좌우 26px 을 음수 마진으로 도로 끌어온다.** 붙박이가 되면 본문이 이 줄 아래로
 * 지나가므로 배경이 있어야 하고, 배경이 `PageMain` 의 좌우 여백만큼 모자라면
 * 그 틈으로 지나가는 글자가 비쳐 보인다. `PageHeader` 가 같은 이유로 같은 짝
 * (`-mx-6.5 px-6.5 bg-bg`)을 쓴다. 덤으로 밑줄이 화면 끝까지 그어져 프로토타입
 * `.tabs`(`padding:0 26px`, 테두리는 화면 폭 전체)와 같아진다.
 *
 * `z` 는 헤더(`z-10`)보다 하나 낮다. 겹치면 헤더가 위에 있어야 한다.
 */
export function PortfolioTabBar({ tab, onChange }: PortfolioTabBarProps) {
  return (
    <div
      role="tablist"
      aria-label="포트폴리오"
      className="sticky top-(--page-header-height) z-9 -mx-6.5 flex gap-6 border-b border-border bg-bg px-6.5"
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
