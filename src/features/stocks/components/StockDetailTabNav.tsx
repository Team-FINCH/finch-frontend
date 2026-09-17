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
 * **탭 값은 URL 이 갖는다** (`?tab=chart|ai`, ia.md §2). 로컬 상태로 두면
 * 새로고침·공유·뒤로가기에서 사라지고, 무엇보다 브리핑의 `deeplink` 가
 * `?tab=ai` 로 들어오는 것을 받을 수 없다.
 *
 * 라벨은 프로토타입 문구 그대로다 — `차트` · `AI 분석`. **프로토타입에 있는
 * `기업` 탭은 그리지 않는다** — 기업 정보 API 를 만들지 않기로 확정했다
 * (GitLab 이슈 #40). 어긋남이 아니라 결정된 범위 축소다.
 *
 * ## 스크롤 안에서 위에 붙는다 (FINCH-317, 2026-09-17)
 *
 * **프로토타입은 이 줄을 `.sc` 밖에 `flex:none` 으로 고정한다. 우리는 스크롤 안에
 * 두고 `sticky top-0` 으로 같은 자리를 지킨다.** 모바일에서 헤더·현재가·보유 카드·
 * 탭 목록이 전부 고정이면 그 묶음이 화면 높이의 절반 가까이를 먹어 AI 분석 탭에
 * 남는 높이가 모자랐다. 사용자가 실제 화면을 보고 정한 것이므로 프로토타입에
 * 맞추려고 되돌리지 않는다. 포트폴리오 4탭 줄(`features/portfolio/components/
 * PortfolioTabBar`)이 같은 이유로 이미 이 모양이다.
 *
 * 붙박이가 되면서 셋이 함께 필요해졌다.
 *
 * **1. 좌우 26px 을 음수 마진으로 도로 끌어온다** (`-mx-6.5` + `px-6.5`).
 * 이 줄은 `PageMain` 안에 있고 `PageMain` 은 좌우 `px-6.5`(26px)를 갖는다. 배경이
 * 그 여백만큼 모자라면 **좌우 26px 틈으로 지나가는 탭 내용이 비쳐 보인다.** 음수
 * 마진으로 스크롤 영역 전체 폭을 덮고, 그만큼 잃은 자기 좌우 여백을 `px-6.5` 로
 * 다시 준다. 덤으로 밑줄이 화면 끝까지 그어져 프로토타입 `.tabs`(`padding:0 26px`,
 * 테두리는 화면 폭 전체)와 같아진다.
 *
 * **2. 배경은 불투명해야 한다** (`bg-bg` + `z-9`). 배경이 없으면 아래로 지나가는
 * 글자가 탭 라벨 뒤로 비친다. 화면 배경 토큰(`--color-bg`)을 그대로 쓴다 —
 * 붙박이 막대 전용 색을 새로 만들지 않는다. `z` 는 같은 스크롤 컨테이너 안에서
 * 굴러가는 탭 내용보다 위에 서기 위한 것이고, 값은 `PortfolioTabBar` 와 맞췄다.
 *
 * **3. 위 여백은 `margin` 이 아니라 `padding` 이다** (`pt-*`, `mt-*` 아니다).
 * `sticky` 의 `top` 은 **마진 박스** 기준이라 `mt-4.5`(18px) 를 준 요소에
 * `top-0` 을 걸면 테두리 박스가 18px 아래에 서고 그 18px 틈으로 탭 내용이 지나간다
 * — 헤더가 `sticky top-0 -mt-6` 이던 시절과 같은 사고다(FINCH-231, 경위는
 * `shared/ui/PageHeader` 주석). `padding` 으로 주면 그 여백까지 배경이 덮고
 * `top-0` 이 그대로 맞는다. **위 여백 값을 고칠 사람은 `pt-` 를 고치고 `mt-` 로
 * 바꾸지 마라.**
 *
 * 붙는 것만 더했고 실측 치수(탭 사이 24px · 아래 1px 경계선 · 버튼 위 14px
 * 아래 12px)는 그대로다.
 *
 * 위 여백 18px(`pt-4.5`)은 사용자가 화면을 보고 정한 값이다(2026-09-17). 전에는
 * 30px 이었다. 보유 카드가 있든 없든 같은 값으로 선다 — 여백이 이 줄 자신의
 * `padding` 이라 앞 형제가 무엇인지에 기대지 않는다. 붙박이가 된 뒤에는 이 18px
 * 도 배경이 덮으므로 스크롤 영역 맨 위에 18px 짜리 불투명 띠가 남는다. 그것이
 * `margin` 을 쓰지 않은 대가이고, 그 자리로 탭 내용이 비치지 않는 것이 목적이다.
 */
const TAB_LABEL: Record<StockDetailTab, string> = {
  chart: '차트',
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
      className="sticky top-0 z-9 -mx-6.5 flex gap-6 border-b border-border bg-bg px-6.5 pt-4.5"
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
