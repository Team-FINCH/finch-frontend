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
 * 버튼 padding 14px 0 12px · 글자 16px/500 · 선택 시 1.5px 밑줄 + 700. 좌우 26px
 * 여백은 프로토타입이 화면 끝까지 차지할 때의 값이라, `PageMain` 안에 놓이는 이
 * 구현에서는 페이지 여백과 겹치지 않도록 좌우 패딩을 다시 넣지 않는다.
 */
export function PortfolioTabBar({ tab, onChange }: PortfolioTabBarProps) {
  return (
    <div
      role="tablist"
      aria-label="포트폴리오"
      className="flex gap-6 border-b border-border"
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
