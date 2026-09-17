import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { BOTTOM_TAB_ROUTES, ROUTES } from '@/shared/config/routes';
import { useRegisterBottomFixedSpace } from '@/shared/hooks/useBottomFixedSpace';
import { useIsAnySheetOpen } from '@/shared/hooks/useSheetOverlayStore';
import type { AiChatScreen } from '@/shared/types/ai/chat';
import type { StockCode } from '@/shared/types/primitives';
import { AiEntryButton } from '@/shared/ui/AiEntryButton';

/**
 * 하단 탭 바 (ia.md §3 · FINCH-28).
 *
 * 근거는 프로토타입 `prototype/screen/finch-prototype.html`(c78163c 시점)의
 * `.tabbar` · `.tabpill` · `.tabpill.trade` 클래스다. 실측값 —
 * `.tabbar` 높이 98px · `.tabpill` 높이 58px 캡슐(안쪽 버튼 48px) ·
 * 선택된 탭 `flex:2.2`, 나머지 `flex:1`.
 *
 * **`.tabai`(AI 버튼, 58x58 · 배경 `--t1`)는 탭 바가 있는 모든 화면에 둔다.
 * 탐색도 포함이다.** 이 서술은 세 번 뒤집혔다.
 *
 * 1. 처음에는 "의도적으로 만들지 않는다"였다. 근거는 `ia.md` §3("PRD 는 AI 를
 *    탭에서 빼고 플로팅 버튼으로 옮겼다")이고, `ia.md:295`가 이 항목을 GitLab
 *    이슈 #26 4번 회신 대기로 미확정 표시해 둔 상태였다.
 * 2. 2026-09-07(FINCH-28-ai-entry)에 프로토타입 실측 쪽으로 확정하며
 *    "모든 화면에 AI 버튼을 둔다"로 뒤집었다.
 * 3. 2026-09-09(FINCH-186)에 당시 프로토타입의 `showTabAi: s.screen!=="search"`
 *    를 근거로 탐색만 빼는 것으로 바꿨다.
 * 4. 2026-09-09 재내보내기에서 프로토타입이 `showTabAi: true` 로 바뀌었다
 *    (디코드본 L3457). 숨김 규칙은 AI 진입점이 플로팅이던 시절의 것이고, 탭 바
 *    안으로 들어간 뒤에는 셸이 화면마다 달라지는 문제가 된다 —
 *    `design.md` v2.5 Appendix 7번이 그렇게 정리했다. 2번으로 돌아왔다.
 *
 * **`showTabs` 와 `showTabAi` 는 그래도 별개 플래그다.** 셸을 그릴지와 그 줄 끝에
 * AI 버튼을 놓을지가 따로 계산된다. 지금 두 값이 같은 결과를 내는 것은 우연이 아니라
 * 결정이고, 다시 갈릴 수 있으니 판정 자리는 셸 한 곳에 남겨 둔다.
 *
 * 문서와 프로토타입이 갈릴 때 프로토타입 실측을 최종 근거로 삼는다는 정리 자체는
 * 그대로 살아 있다. `design.md` §6 "Tab Bar > 적용 범위" 표의 "(탐색은 숨김)" 은
 * 이제 낡은 서술이라 문서 쪽에 고칠 자리가 남는다 — 조용히 고치지 말고 보고한다.
 *
 * 컴포넌트는 `.tabai`·`.fab`를 하나로 합친 `AiEntryButton`
 * (`shared/ui/AiEntryButton.tsx`)이고, 이 파일은 `TabBarShell`의 탭 목록 줄
 * 마지막에 그 컴포넌트를 놓는 자리와 놓을지 말지의 판정만 맡는다.
 *
 * 탭 목록은 새로 정의하지 않는다. `BOTTOM_TAB_ROUTES`(홈·탐색·포트폴리오·내 정보)
 * 를 그대로 쓴다. 아이콘은 그 배열에 없는 값이라 이 파일이 프로토타입 `.n1`~`.n4`
 * 실측 SVG 로 로컬 정의한다 — 잘못 짚으면 팀에 확인이 필요하다고 보고에 적었다.
 */

/** 프로토타입 `.n1`~`.n4::before`의 mask-image SVG 를 그대로 옮긴 값. */
const TAB_ICON_SVG: Record<string, string> = {
  [ROUTES.home]:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 11 12 4l8 7v9h-5.5v-6h-5v6H4z"/></svg>',
  [ROUTES.search]:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.4" fill="none" stroke="black" stroke-width="2"/><path d="M15.8 15.8 20 20" stroke="black" stroke-width="2.2" stroke-linecap="round"/></svg>',
  [ROUTES.portfolio]:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="4" y="12" width="4" height="8" rx="1"/><rect x="10" y="6" width="4" height="14" rx="1"/><rect x="16" y="9" width="4" height="11" rx="1"/></svg>',
  [ROUTES.my]:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.7"/><path d="M4.6 20a7.4 7.4 0 0 1 14.8 0z"/></svg>',
};

/**
 * mask-image 는 색·패딩이 얽혀 있는 arbitrary 클래스 문자열로 적으면 읽기 어렵고
 * URL 인코딩이 클래스 이름 문법과 부딪힌다. 아이콘 한정으로 style 속성을 쓴다.
 * 색 자체는 `background-color: currentColor` 라 버튼 글자색을 그대로 따라간다.
 */
function tabIconMaskStyle(path: string) {
  const svg = TAB_ICON_SVG[path];
  if (svg === undefined) {
    return undefined;
  }
  const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  return { WebkitMaskImage: url, maskImage: url };
}

/**
 * `.tabbar` 셸. 고정 높이 98px + 반투명 그라디언트 + 블러(프로토타입 `.tabbar::before`).
 * 나브 변형(`TabBar`)과 매수/매도 변형(`TradeTabBar`)이 이 셸을 공유한다 —
 * 프로토타입에서 두 화면이 같은 `.tabbar` 컨테이너에 내용만 다르게 넣는 구조다
 * (`ActionBar.tsx`의 "종목 상세는 하단 탭바가 그대로 매수/매도 바로 바뀐다" 참고).
 *
 * safe-area 처리 — 프로토타입은 고정 크기 기기 프레임이라 `env()`를 안 쓴다.
 * 실 기기에서 캡슐이 홈 인디케이터 밑에 깔리지 않도록 `bottom`에 safe-area 만큼
 * 더 띄운다. `TabBarLayout`이 본문에 두는 여백(`98px + safe-area`)과 같은 셈이라
 * 이중으로 차지하지 않는다.
 *
 * **바텀시트가 하나라도 열려 있으면 렌더 자체에서 빠진다** — 프로토타입의
 * `showTabs: !s.sheet`와 같다. `opacity:0`/`visibility:hidden`이 아니라 `null`을
 * 반환한다. 두 변형(`TabBar`·`TradeTabBar`)이 이 셸을 통해 같이 적용받는다.
 *
 * **AI 버튼을 놓는 자리도 이 셸이 정한다** — 프로토타입이 `showTabAi` 를 변형별이
 * 아니라 화면 단위로 한 번만 계산하는 것과 같다. 지금은 화면을 가리지 않으므로
 * 조건 없이 놓지만, 다시 화면별로 갈릴 때 고칠 자리를 여기 하나로 둔다.
 *
 * `aiExpandedLabel`은 `AiEntryButton`에 그대로 넘긴다 — 나브 변형(`TabBar`)은
 * 넘기지 않아 원형 아이콘으로 고정되고, 매수/매도 변형(`TradeTabBar`)만
 * `"이 종목 물어보기"`를 넘겨 라벨이 펼쳐진다(프로토타입 `tabaiCls`가
 * `screen==="detail"`에서만 `peek`가 되는 것과 같다).
 */
function TabBarShell({
  children,
  aiExpandedLabel,
  aiScreen,
  aiTicker,
  aiStockName,
}: {
  children: ReactNode;
  aiExpandedLabel?: string;
  /** 채팅으로 넘길 화면 맥락. 넘기지 않으면 쿼리 없는 `/chat` 이다 */
  aiScreen?: AiChatScreen;
  /** `aiScreen="stock_detail"` 과 함께 넘기는 종목코드 */
  aiTicker?: StockCode;
  /** `aiTicker` 와 함께 넘기는 종목명. 빈 상태 문구가 쓴다 (`AiEntryButton`) */
  aiStockName?: string;
}) {
  const isAnySheetOpen = useIsAnySheetOpen();
  // 토스트가 이 바 위 14px 에 앉도록 자기 자리를 알린다 (FINCH-232).
  // 시트가 열려 이 바가 빠지면 ref 가 떨어지며 등록도 함께 풀린다 —
  // 그때 토스트는 바가 없는 화면의 값(24px)으로 내려온다.
  const bottomFixedRef = useRegisterBottomFixedSpace();

  if (isAnySheetOpen) {
    return null;
  }

  return (
    // 가로 폭을 PageMain·ActionBar 와 같은 max-w-md 로 맞춘다. 이유는 ActionBar 주석에 있다 —
    // 넓은 화면에서 본문은 가운데 정렬인데 바만 화면 끝까지 가면 둘이 어긋나 보인다.
    <nav
      ref={bottomFixedRef}
      className="fixed inset-x-0 bottom-[env(safe-area-inset-bottom)] z-30 mx-auto flex h-[98px] w-full max-w-md items-end gap-2.5 px-4 pb-4"
      aria-label="주요 화면 전환"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/70 to-bg/0 [mask-image:linear-gradient(to_top,#000_58%,transparent)] [backdrop-filter:blur(14px)] [-webkit-backdrop-filter:blur(14px)] [-webkit-mask-image:linear-gradient(to_top,#000_58%,transparent)]"
      />
      {children}
      <AiEntryButton
        expandedLabel={aiExpandedLabel}
        screen={aiScreen}
        ticker={aiTicker}
        stockName={aiStockName}
      />
    </nav>
  );
}

/** 캡슐 컨테이너 클래스. 나브 pill 과 trade pill 이 공유한다(`.tabpill` 공통부). */
const PILL_BASE_CLASS =
  'relative z-[1] flex h-[58px] flex-1 items-center rounded-full border border-text-primary/7 ' +
  'bg-surface/72 p-[5px] shadow-[0_8px_24px_rgba(31,35,40,0.1)] ' +
  '[-webkit-backdrop-filter:blur(18px)_saturate(1.6)] [backdrop-filter:blur(18px)_saturate(1.6)]';

/**
 * 탭바 교체 순차 등장 (design.md v2.2 "Tab Bar 변형" · 프로토타입 `tin`).
 *
 * 지연은 호출부가 `style` 로 준다 — Tailwind 클래스로는 항목 수만큼 임의 값을
 * 만들 수 없다. `both` 라 시작 전에도 첫 프레임 상태로 있어서 깜빡이지 않는다.
 *
 * `motion-reduce:animate-none` 은 필수다. 화면 하단에서 네 개가 순차로 튀어
 * 오르는 움직임이라 `prefers-reduced-motion` 을 켠 사람에게 그대로 두면 안 된다.
 */
const TAB_ITEM_IN_CLASS =
  'animate-[tab-item-in_var(--motion-tab-swap)_var(--ease-standard)_both] motion-reduce:animate-none';

/**
 * 프로토타입은 속성마다 지속 시간이 다르다 — 폭이 가장 느리고(220ms) 색이 가장
 * 빠르다(140ms). 셋을 한 값(`--motion-normal` 200ms)으로 묶으면 캡슐이 넓어지는
 * 동안 글자색이 함께 끌려 보인다. Tailwind 로는 속성별 지속 시간을 한 클래스에
 * 담을 수 없어 `style` 로 준다.
 */
const NAV_BUTTON_TRANSITION =
  'flex 220ms var(--ease-standard), background-color 160ms var(--ease-standard), color 140ms var(--ease-standard)';
const NAV_LABEL_TRANSITION =
  'max-width 220ms var(--ease-standard), opacity 160ms var(--ease-standard)';

function navButtonClass(isActive: boolean) {
  return [
    'flex h-12 items-center justify-center gap-2 overflow-hidden whitespace-nowrap rounded-full text-label',
    TAB_ITEM_IN_CLASS,
    isActive
      ? 'flex-[2.2] bg-primary-soft text-text-primary'
      : 'flex-1 text-text-muted',
  ].join(' ');
}

function navLabelClass(isActive: boolean) {
  return [
    'overflow-hidden whitespace-nowrap',
    isActive ? 'max-w-20 opacity-100' : 'max-w-0 opacity-0',
  ].join(' ');
}

/** 상시 화면(홈·탐색·포트폴리오·내 정보)의 하단 탭 바. `TabBarLayout`이 쓴다. */
export function TabBar() {
  return (
    <TabBarShell>
      <div className={`${PILL_BASE_CLASS} gap-1`}>
        {BOTTOM_TAB_ROUTES.map((tab, index) => (
          <NavLink
            key={tab.path}
            to={tab.path}
            end
            // 좌->우 50ms 간격. 첫 탭은 지연 없음 (프로토타입 nth-child(2)부터).
            style={{
              animationDelay: `${index * 50}ms`,
              transition: NAV_BUTTON_TRANSITION,
            }}
            className={({ isActive }) => navButtonClass(isActive)}
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden
                  className="h-6 w-6 flex-none bg-current [mask-size:24px] [mask-position:center] [mask-repeat:no-repeat] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:24px]"
                  style={tabIconMaskStyle(tab.path)}
                />
                <span
                  className={navLabelClass(isActive)}
                  style={{ transition: NAV_LABEL_TRANSITION }}
                >
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </TabBarShell>
  );
}

type TradeTabBarProps = {
  /**
   * 이 줄의 AI 버튼이 채팅에 넘길 종목코드. 넘기면
   * `/chat?screen=stock_detail&ticker=<종목코드>` 로 간다.
   *
   * 선택 값으로 둔 이유 — 종목 상세 화면(`pages/StockDetailPage.tsx`)이 이 값을
   * 붙이기 전에도 지금까지처럼 쿼리 없는 `/chat` 으로 동작해야 한다.
   * 붙이고 나면 이 자리에서 맥락이 유실되지 않는다.
   */
  stockCode?: StockCode;
  /**
   * 같은 버튼이 함께 넘길 종목명. `stockCode` 와 짝이다 — 채팅 빈 상태 문구와
   * 추천 질문이 코드가 아니라 이름을 쓰는데, 채팅 화면은 이름을 구하려고 상세를
   * 다시 부를 수 없다(contracts C51, `AiEntryButton` 머리 주석). 안 넘기면 그
   * 화면이 `이 종목` 으로 떨어진다.
   */
  stockName?: string;
  /** 거래정지면 매수·매도 대신 비활성 캡슐 한 줄을 그린다 (contracts C46). */
  suspended?: boolean;
  /**
   * 시세를 받지 못한 종목이면 같은 모양의 비활성 캡슐로 바꾼다 (contracts C102).
   * **`suspended` 와 다른 조건이다** — 거래정지가 아닌데 시세만 없는 종목이 있다.
   * 둘 다 참이면 `suspended` 가 이긴다 (아래 렌더 주석 참고).
   */
  priceUnavailable?: boolean;
  onBuy: () => void;
  onSell: () => void;
};

/**
 * 종목 상세용 매수/매도 변형(`.tabpill.trade`). 나브 탭 바 대신 이 자리에 들어간다
 * — 두 화면이 동시에 뜨지 않는다(`ActionBar.tsx` 참고).
 *
 * **함정 확인 결과** — 프로토타입 `.tbuy`/`.tsell`은 글자색만 신 팔레트
 * (`var(--up)`/`var(--down)`)를 쓰고 테두리색은 낡은 등락색의 알파값
 * (`rgba(226,85,85,.4)` · `rgba(59,130,246,.35)`, 구 `#E25555`/`#3B82F6`)에
 * 그대로 남아 있다. 여기서는 테두리도 신 팔레트로 맞춘다 —
 * `border-stock-up/40` · `border-stock-down/35`
 * (`--color-stock-up:#C93B3B` · `--color-stock-down:#2258C9`, design.md §4).
 * 같은 이유로 `:active` 배경 틴트(`rgba(226,85,85,.08)`/`rgba(59,130,246,.08)`)도
 * 낡은 팔레트라 `bg-stock-up/8` · `bg-stock-down/8`로 함께 옮겼다 — 프로토타입이
 * 테두리만 지적한 것과 별개로 같은 잔재라고 판단했다.
 *
 * **`.tstop`(거래정지·주문 불가) 변형은 2026-09-08에 만든다 — 뒤집힌 결정이다.**
 * 이 자리에는 "만들지 않는다. 티켓이 요청한 것은 매수/매도 둘뿐이다" 는 주석이
 * 있었다. 그 판단은 당시 티켓 범위로는 맞았지만 `design.md` v2.2 가 이 변형을
 * "Tab Bar 변형" 표에 명세로 올렸다(FINCH-166).
 *
 * 라벨은 프로토타입 실측인 `거래정지된 종목이에요` 다 (새 디코드 L2922). 세 갈래가
 * 있었다 — `design.md` §6 표의 `거래정지`, 우리가 쓰던 `거래정지 · 주문 불가`,
 * 프로토타입의 이 문장. **프로토타입으로 정해졌고 `design.md` §6 "Tab Bar 변형"
 * 표와 §7.7 "주문할 수 없는 상태" 표 두 줄도 같은 MR 에서 이 문장으로 고쳤다.**
 * 캡슐은 사유를 말해 주는 자리라 `거래정지` 한 낱말보다 문장이 맞고, `·` 로 두
 * 토막을 잇는 우리 판은 프로토타입에 없다.
 *
 * **AI 버튼도 이 변형에 들어간다.** 근거는 `showTabs`가 아니라 `showTabAi`다.
 * 이 화면에서 그리는 것은 나브 탭이 아니라 매수/매도 바(`.tabpill.trade`)지만
 * AI 버튼은 그와 무관하게 뜬다.
 * 라벨은 `tabaiLabel`이 `screen==="detail"`일 때만 `"이 종목 물어보기"`로
 * 펼쳐지므로 여기서만 `aiExpandedLabel`을 넘긴다.
 */
export function TradeTabBar({
  onBuy,
  onSell,
  suspended,
  priceUnavailable,
  stockCode,
  stockName,
}: TradeTabBarProps) {
  /*
    주문 불가 사유. **둘 다 참일 수 있고 그때는 거래정지가 이긴다** — 이미 계약이
    있는 쪽(C46)이 우선이고, 거래정지 종목은 시세가 함께 끊기는 것이 정상이라
    "시세를 못 받는다" 고만 적으면 진짜 이유를 감춘다.

    거래정지 문구는 프로토타입 실측값 그대로다 (`design.md` §6 "Tab Bar 변형" 셋째 줄).

    **시세 없음 문구는 `design.md` §7.7 의 것을 그대로 쓰지 않았다.** 그 표의
    `시세를 불러올 수 없어 주문이 제한됩니다` 는 **주문 화면 CTA** 의 문구다 —
    같은 표의 거래정지 줄이 탭바를 §6 으로 넘기고 있어 두 자리의 문구 위계가
    갈려 있고, §6 에는 시세 없음 줄이 아직 없다. 실제로 넣어 보니 캡슐이 좁아
    (390px 기기에서 152px) 세 줄로 넘쳐 48px 높이를 뚫었다. 그래서 §6 의 결
    (`{조건} + 종목이에요`)에 맞춘 짧은 한 줄을 쓴다. **`design.md` §6 표에
    이 줄을 올리는 것은 이 티켓 범위 밖이라 감독관에게 보고한다.**
  */
  const blockedLabel =
    suspended === true
      ? '거래정지된 종목이에요'
      : priceUnavailable === true
        ? '시세를 받지 못한 종목이에요'
        : null;

  return (
    <TabBarShell
      aiExpandedLabel="이 종목 물어보기"
      aiScreen={stockCode === undefined ? undefined : 'stock_detail'}
      aiTicker={stockCode}
      aiStockName={stockName}
    >
      <div className={`${PILL_BASE_CLASS} gap-1.5`}>
        {blockedLabel !== null ? (
          <button
            type="button"
            disabled
            className={`h-12 flex-1 rounded-full border border-border px-3 text-[15px] font-medium text-balance break-keep text-text-muted ${TAB_ITEM_IN_CLASS}`}
          >
            {blockedLabel}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onBuy}
              className={`h-12 flex-1 rounded-full border border-stock-up/40 text-[16px] font-bold text-stock-up transition-colors duration-(--motion-fast) ease-standard active:bg-stock-up/8 ${TAB_ITEM_IN_CLASS}`}
            >
              매수
            </button>
            <button
              type="button"
              onClick={onSell}
              // 매수/매도는 70ms 간격이다 — 4탭(50ms)과 다르다.
              style={{ animationDelay: '70ms' }}
              className={`h-12 flex-1 rounded-full border border-stock-down/35 text-[16px] font-bold text-stock-down transition-colors duration-(--motion-fast) ease-standard active:bg-stock-down/8 ${TAB_ITEM_IN_CLASS}`}
            >
              매도
            </button>
          </>
        )}
      </div>
    </TabBarShell>
  );
}
