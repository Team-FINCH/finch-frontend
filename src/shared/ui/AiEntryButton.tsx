import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';
import type { AiChatScreen } from '@/shared/types/ai/chat';

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
 * 조합을 그대로 쓴다. 그림자는 실측값을 새로 하드코딩하지 않고 "floating
 * button" 용으로 이미 있는 `--shadow-float` 토큰(`shadow-float`)을 재사용한다.
 *
 * 누르면 `ROUTES.chat`(`/chat`)으로 이동한다. **화면 맥락을 쿼리로 함께 넘기는
 * 것은 GitLab 이슈 #26 4번 회신으로 확정됐다**(MR !143 머지) — AI 쪽 `Screen`
 * 열거값에 `briefing`이 들어갔다. 그래서 `screen` prop을 받아 값이 있을 때만
 * `?screen=`을 붙인다.
 *
 * **지금 실제로 넘기는 값은 `briefing` 하나다**(`AiFloatingOverlay`). 탭 바 줄의
 * `.tabai` 자리(`TabBar.tsx`의 `TabBarShell`)는 prop을 넘기지 않아 예전과 똑같이
 * 쿼리 없는 `/chat`으로 간다 — 마이 페이지에 대응하는 열거값이 없어서 그 화면에서
 * 무엇을 넘길지 따로 판단해야 하고, 이 티켓의 범위가 아니다.
 *
 * 쿼리를 안 붙여도 채팅 화면은 깨지지 않는다 — `parseChatContext`가 모르는 값이나
 * 빈 값을 `chat`으로 떨어뜨린다(`features/chat/lib/parseChatContext.ts`).
 *
 * 시트가 열렸을 때 이 버튼 자체를 숨기는 처리는 하지 않는다 — 두 호출부
 * (`TabBarShell`·`AiFloatingOverlay`)가 이미 `useIsAnySheetOpen()`으로 자기
 * 렌더 전체를 끄므로 버튼이 그 판정을 또 갖고 있으면 이중 관리가 된다.
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
   * **탐색은 이 목록에 없다** — 라벨이 접히는 것이 아니라 AI 버튼 자체를 그리지
   * 않는다(프로토타입 `showTabAi: s.screen !== "search"`, `design.md` L263
   * "(탐색은 숨김)"). 판정은 `TabBarShell` 이 하므로 여기로 내려오지 않는다.
   */
  expandedLabel?: string;
  /**
   * 채팅으로 넘길 화면 맥락 (`context.screen`, `AI_CHAT_SCREENS`).
   * 값이 있으면 `/chat?screen=<값>`으로 이동하고, **넘기지 않으면 쿼리 없는
   * `/chat`** 이다 — 탭 바 줄의 호출부(`TabBarShell`)가 그렇다.
   */
  screen?: AiChatScreen;
};

export function AiEntryButton({
  className = '',
  expandedLabel,
  screen,
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
  const chatTo =
    screen === undefined
      ? ROUTES.chat
      : `${ROUTES.chat}?${new URLSearchParams({ screen }).toString()}`;

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => void navigate(chatTo)}
      className={
        'relative z-1 flex h-[58px] min-w-[58px] flex-none items-center justify-center overflow-hidden ' +
        'pointer-events-auto rounded-full bg-primary whitespace-nowrap text-surface shadow-float ' +
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
          'overflow-hidden text-label font-medium transition-[max-width,opacity] duration-300 ease-standard ' +
          (peek ? 'max-w-[180px] opacity-100' : 'max-w-0 opacity-0')
        }
      >
        {label}
      </span>
    </button>
  );
}
