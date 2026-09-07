import {
  STOCK_DETAIL_TABS,
  type StockDetailTab,
} from '../lib/stockDetailParams';

/**
 * 종목 상세 탭 (프로토타입 `.tabs`).
 *
 * 실측값 — 탭 사이 24px · 아래 1px 경계선 · 좌우 화면 여백 26px · 버튼 위 14px 아래 12px ·
 * 선택된 탭은 굵게 + 아래 1.5px 밑줄, 나머지는 `--t3`.
 *
 * **탭 값은 URL 이 갖는다** (`?tab=chart|info|ai`, ia.md §2). 로컬 상태로 두면
 * 새로고침·공유·뒤로가기에서 사라지고, 무엇보다 브리핑의 `deeplink` 가
 * `?tab=ai` 로 들어오는 것을 받을 수 없다.
 *
 * 라벨은 프로토타입 문구 그대로다 — `차트` · `기업` · `AI 분석`.
 */
const TAB_LABEL: Record<StockDetailTab, string> = {
  chart: '차트',
  info: '기업',
  ai: 'AI 분석',
};

type StockDetailTabNavProps = {
  activeTab: StockDetailTab;
  onChange: (tab: StockDetailTab) => void;
};

export function StockDetailTabNav({
  activeTab,
  onChange,
}: StockDetailTabNavProps) {
  return (
    <div
      role="tablist"
      aria-label="종목 상세 보기 전환"
      className="-mx-6.5 mt-7.5 flex gap-6 border-b border-border px-6.5"
    >
      {STOCK_DETAIL_TABS.map((tab) => {
        const isActive = tab === activeTab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab)}
            className={`-mb-px border-b-[1.5px] pt-3.5 pb-3 text-body-1 transition-colors duration-(--motion-normal) ease-standard ${
              isActive
                ? 'border-text-primary font-bold text-text-primary'
                : 'border-transparent font-medium text-text-muted'
            }`}
          >
            {TAB_LABEL[tab]}
          </button>
        );
      })}
    </div>
  );
}
