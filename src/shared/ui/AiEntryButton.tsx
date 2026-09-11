import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';
import type { AiChatScreen } from '@/shared/types/ai/chat';
import type { StockCode } from '@/shared/types/primitives';

/**
 * AI 진입 버튼 (FINCH-28-ai-entry). 프로토타입 `.tabai`/`.fab` 근거다 —
 * 두 클래스는 크기(58x58 원형)·면색(`var(--t1)`)·글자색(흰색)·위치(우하단)가 같고
 * 사용자 눈에는 하나의 버튼이다. `.tabai`는 탭 바 줄의 마지막 항목으로,
 * `.fab`는 탭 바가 없는 화면에 `absolute`로 떠서 같은 모양을 낸다 — 그래서
 * 컴포넌트는 하나로 만들고 **붙는 자리만** 호출부가 가른다
 * (`TabBar.tsx`의 `TabBarShell` · `AiFloatingOverlay.tsx`).
 *
 * `--t1`(프로토타입 `:root{--t1:#1F2328}`)은 우리 토큰의 `--color-primary`와
 * 같은 값이다 — `Button.tsx`의 primary 변형(`bg-primary text-surface`)과 같은
 * 조합을 그대로 쓴다. 그림자는 `--shadow-float`(`0 6px 20px rgba(31,35,40,.2)`)를
 * 재사용했었지만 `.tabai`·`.fab` 둘 다 실측이 `0 8px 24px rgba(31,35,40,.16)` 이라
 * 실측값으로 되돌렸다 — 토큰 쪽이 더 짧고 진해서 버튼이 눌린 것처럼 보였다.
 *
 * 누르면 `ROUTES.chat`(`/chat`)으로 이동한다. **화면 맥락을 쿼리로 함께 넘기는
 * 것은 GitLab 이슈 #26 4번 회신으로 확정됐다**(MR !143 머지) — AI 쪽 `Screen`
 * 열거값에 `briefing`이 들어갔다. 그래서 `screen` prop을 받아 값이 있을 때만
 * `?screen=`을 붙인다.
 *
 * **종목 상세는 종목까지 함께 넘긴다** — `screen="stock_detail"` 과 `ticker`·
 * `stockName` 을 받아 `/chat?screen=stock_detail&ticker=005930&stockName=삼성전자`
 * 로 보낸다. 채팅 화면이 `parseChatContext` 로 그 셋을 읽어 빈 상태 문구와 추천
 * 질문을 그 종목으로 바꾼다 (프로토타입 `openChatCtx`, design.md "종목 상세에서
 * 진입 시 해당 종목 맥락을 이어받는다"). 맥락을 넘기지 않으면 "이거" 가 무엇인지
 * AI 가 되묻게 된다.
 *
 * **종목명까지 싣는 이유** (FINCH-248) — 빈 상태 문구가 쓰는 것은 코드가 아니라
 * 이름인데, 채팅 화면은 이름을 구하려고 `GET /stocks/{stockCode}` 를 부를 수 없다.
 * 그 호출 자체가 최근 본 종목 기록이라(contracts C51) 보지도 않은 조회가 기록에 남고
 * 최근 본 종목 목록까지 무효화된다. 여기로 들어오는 화면은 이름을 이미 갖고 있다.
 *
 * 홈·탐색·포트폴리오·마이페이지의 `.tabai` 는 여전히 prop 없이 쿼리 없는 `/chat`
 * 으로 간다 — 마이페이지에 대응하는 열거값이 없어 그 화면에서 무엇을 넘길지 따로
 * 판단해야 한다.
 *
 * 쿼리를 안 붙여도 채팅 화면은 깨지지 않는다 — `parseChatContext`가 모르는 값이나
 * 빈 값을 `chat`으로 떨어뜨린다(`features/chat/lib/parseChatContext.ts`).
 *
 * 시트가 열렸을 때 이 버튼 자체를 숨기는 처리는 하지 않는다 — 두 호출부
 * (`TabBarShell`·`AiFloatingOverlay`)가 이미 `useIsAnySheetOpen()`으로 자기
 * 렌더 전체를 끄므로 버튼이 그 판정을 또 갖고 있으면 이중 관리가 된다.
 */
/**
 * 말풍선 글리프. **프로토타입에 같은 그림의 경로가 두 벌 있다** —
 * `.tabai::before`(디코드본 L1177)와 `.fab::before`(L1187)의 꼬리가 다르다.
 * 눈으로는 구별되지 않는 차이라 한 벌로 합치고 `.fab` 쪽을 남겼다.
 */
const AI_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 3.2c-4.9 0-8.8 3.2-8.8 7.2 0 2.3 1.3 4.4 3.4 5.7-.2 1-.7 2.1-1.5 3.2-.2.3.1.7.5.5 1.6-.7 2.9-1.6 3.7-2.2.9.2 1.8.3 2.7.3 4.9 0 8.8-3.2 8.8-7.5S16.9 3.2 12 3.2Z"/></svg>';
const AI_ICON_MASK = `url("data:image/svg+xml,${encodeURIComponent(AI_ICON_SVG)}")`;

/** 프로토타입 `tabaiLabel`/`fabLabel`의 기본값("AI에게 묻기"). */
const DEFAULT_LABEL = 'AI에게 묻기';

/**
 * 프로토타입의 `.peek` 전환 지연(40ms) — 화면이 바뀐 뒤 라벨이 펼쳐지기 전에
 * 아주 짧게 원형 상태를 보여준다(`_peek` 타이머, `finch-prototype.html`).
 */
const PEEK_DELAY_MS = 40;

type AiEntryButtonProps = {
  className?: string;
  /**
   * 라벨이 펼쳐지는 화면에서만 넘긴다 (프로토타입 `.peek`, `tabaiLabel`/`fabLabel`).
   * - 종목 상세(`TradeTabBar`) — `"이 종목 물어보기"` (`tabaiCls`가 `detail`에서만
   *   `peek`가 되는 것과 같다)
   * - 브리핑(`AiFloatingOverlay`의 `.fab`) — `"브리핑 물어보기"` (`fabLabel`)
   *
   * 넘기지 않으면(홈·포트폴리오·내 정보의 `.tabai`) 원형 아이콘 상태로 고정된다
   * — 프로토타입도 이 화면들에서는 `tabaiCls`가 절대 `peek`가 되지 않는다.
   *
   * **탐색도 이 목록에 없다** — 버튼은 그리고 라벨만 접힌다. 탐색에서 버튼 자체를
   * 숨기던 규칙은 2026-09-09 재내보내기에서 없어졌다(`TabBar.tsx` 머리 주석 4번).
   */
  expandedLabel?: string;
  /**
   * 채팅으로 넘길 화면 맥락 (`context.screen`, `AI_CHAT_SCREENS`).
   * 값이 있으면 `/chat?screen=<값>`으로 이동하고, **넘기지 않으면 쿼리 없는
   * `/chat`** 이다 — 탭 바 줄의 호출부(`TabBarShell`)가 그렇다.
   */
  screen?: AiChatScreen;
  /**
   * 종목 맥락 (`context.ticker`). **`screen="stock_detail"` 과 함께일 때만 붙는다**
   * — `parseChatContext` 가 다른 화면에서는 `ticker` 를 버리므로 따로 넘겨도
   * 쓰이지 않고, 주소에만 남아 무엇이 맥락인지 헷갈리게 한다.
   */
  ticker?: StockCode;
  /**
   * 빈 상태 문구에 쓸 종목명. **`ticker` 와 함께 넘긴다** — 하나만 넘기면 채팅
   * 화면이 `이 종목` 으로 떨어진다 (`pages/ChatPage.tsx`).
   *
   * 타입으로 둘을 묶지 않고 선택 값 둘로 두었다. 묶으려면 props 를 판별 합집합으로
   * 갈라야 하는데, 이 컴포넌트는 `screen` 없는 호출(탭 바 줄)까지 받는 자리라
   * 갈래가 셋이 되고 호출부 넷이 전부 그 형태를 알아야 한다. 빠뜨렸을 때의 결과가
   * 화면이 깨지는 것이 아니라 라벨이 `이 종목` 으로 내려앉는 것이라 그 값을 치를
   * 만큼은 아니다.
   */
  stockName?: string;
};

/**
 * 쿼리는 값이 있을 때만 붙인다. 빈 `?screen=` 은 `parseChatContext` 가 `chat` 으로
 * 떨어뜨리므로 동작은 같지만, 주소만 보고는 맥락이 있는지 없는지 알 수 없어진다.
 */
function buildChatTo(
  screen?: AiChatScreen,
  ticker?: StockCode,
  stockName?: string,
): string {
  if (screen === undefined) {
    return ROUTES.chat;
  }
  const query = new URLSearchParams({ screen });
  if (screen === 'stock_detail' && ticker !== undefined) {
    query.set('ticker', ticker);
    // 이름은 종목이 정해졌을 때만 의미가 있다 — `ticker` 없이 이름만 실으면
    // `parseChatContext` 가 맥락을 통째로 버리므로 주소에만 남는다.
    if (stockName !== undefined) {
      query.set('stockName', stockName);
    }
  }
  return `${ROUTES.chat}?${query.toString()}`;
}

export function AiEntryButton({
  className = '',
  expandedLabel,
  screen,
  ticker,
  stockName,
}: AiEntryButtonProps) {
  const navigate = useNavigate();
  const [peek, setPeek] = useState(false);

  // `expandedLabel`을 넘기는 호출부(`TradeTabBar`·브리핑 `.fab`)는 마운트
  // 내내 같은 문자열을 고정으로 넘긴다 — 라우트가 바뀌면 그 컴포넌트 자체가
  // 마운트/언마운트되지, 같은 인스턴스가 `expandedLabel`만 바꿔 받지 않는다.
  // 그래서 "마운트 후 펼친다"만 구현하면 프로토타입의 `_peek` 재생과 같은
  // 결과가 나온다 — 매번 되돌렸다 다시 펼치는 상태 전이를 만들 필요가 없다.
  useEffect(() => {
    if (expandedLabel === undefined) {
      return;
    }
    const timer = setTimeout(() => setPeek(true), PEEK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [expandedLabel]);

  const label = expandedLabel ?? DEFAULT_LABEL;
  const chatTo = buildChatTo(screen, ticker, stockName);

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => void navigate(chatTo)}
      className={
        'relative z-1 flex h-[58px] min-w-[58px] flex-none items-center justify-center overflow-hidden ' +
        'pointer-events-auto rounded-full bg-primary whitespace-nowrap text-surface ' +
        'shadow-[0_8px_24px_rgba(31,35,40,0.16)] ' +
        'transition-[max-width,padding,gap,transform] duration-300 ease-standard active:scale-[.94] ' +
        (peek ? 'max-w-[240px] gap-2 pr-5 pl-4' : 'max-w-[58px] gap-0 px-0') +
        ` ${className}`
      }
    >
      <span
        aria-hidden
        className="h-6 w-6 flex-none bg-current [mask-size:24px] [mask-position:center] [mask-repeat:no-repeat] [-webkit-mask-position:center] [-webkit-mask-repeat:no-repeat] [-webkit-mask-size:24px]"
        style={{ WebkitMaskImage: AI_ICON_MASK, maskImage: AI_ICON_MASK }}
      />
      <span
        aria-hidden
        className={
          'overflow-hidden text-[15px] leading-[22px] font-medium transition-[max-width,opacity] duration-300 ease-standard ' +
          (peek ? 'max-w-[160px] opacity-100' : 'max-w-0 opacity-0')
        }
      >
        {label}
      </span>
    </button>
  );
}
