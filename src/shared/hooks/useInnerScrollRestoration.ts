import { useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * 앱 셸 **안쪽** 스크롤 위치를 라우트별로 기억했다가 뒤로가기에서 되돌린다.
 *
 * ## 왜 따로 필요한가
 *
 * `RootLayout` 의 `<ScrollRestoration />` 은 **창(window) 스크롤만 본다** —
 * `node_modules/react-router` 구현이 `window.scrollY` 를 저장하고 `window.scrollTo` 로
 * 되돌린다. `getKey` 옵션은 저장에 쓰는 키 문자열만 갈아 끼울 뿐 되돌리는 대상을
 * 바꾸지 못한다. 그런데 앱 셸(`h-dvh flex-col overflow-hidden`)을 두른 화면에서는
 * 창이 아니라 `PageMain`(`flex-1 overflow-y-auto`) 안쪽이 굴러간다. 그래서 목록에서
 * 상세로 갔다 돌아오면 보던 자리가 아니라 맨 위였다.
 *
 * **`ScrollRestoration` 을 지우지 않는다.** 껍데기가 없는 화면(로그인)은 여전히
 * 문서가 굴러가므로 그쪽 복원은 그것이 맡는다. 담당 구역이 겹치지도 않는다 —
 * 껍데기가 있는 화면에서는 창이 아예 스크롤하지 않으므로 `ScrollRestoration` 은
 * 늘 0 을 저장하고 0 을 되돌린다.
 *
 * ## 어디에 붙어 있나
 *
 * 처음에는 `app/layouts/TabBarLayout` 전용(`useTabBarScrollRestoration`)이었다.
 * 껍데기가 하단 탭 넷과 종목 상세에만 있던 시절이라 그 자리로 충분했다.
 * FINCH-297 이 껍데기를 모든 화면으로 넓히면서 `pages/` 도 이 훅이 필요해졌는데,
 * `app/` 아래 있으면 부를 수 없다 — 의존 방향이 `app → pages → features → shared`
 * 단방향이고 ESLint `import-x/no-restricted-paths` 가 그것을 막는다. 그래서
 * `shared/hooks` 로 옮기고 이름에서 탭 바를 뺐다. 훅 자체는 탭 바에 기대는 것이
 * 하나도 없었다 — 컨테이너 안의 `<main>` 하나만 본다.
 *
 * **붙이는 기준은 "목록을 내려보다 다른 화면으로 들어갔다 돌아오는가" 다.**
 * 그런 경로가 없는 화면(입금·출금·주문 같은 폼, 결제 결과)은 붙여도 티가 나지 않아
 * 붙이지 않았다. 붙인 곳은 `TabBarLayout`(홈·탐색·포트폴리오·내 정보)과
 * 브리핑 전체·알림함·매매 내역·AI 채팅이다.
 *
 * ## 고른 것 넷
 *
 * **키는 `location.key` 다.** `pathname` 이 아니다. 히스토리 항목마다 다른 값이라
 * "새로 들어온 화면은 맨 위" 가 저절로 지켜진다 — 새 방문은 저장된 것이 없는 새 키다.
 * `pathname` 으로 잡으면 탭 바로 다시 들어온 새 방문이 지난번 위치를 물고 온다.
 * 검색어(`/search?q=`)나 포트폴리오 탭(`/portfolio?tab=`)처럼 쿼리로 갈리는 화면도
 * 이 키가 알아서 가른다 — 저 둘은 `replace` 로 주소를 바꾸고(컨벤션 §10) `replace` 도
 * 새 키를 만든다. react-router 의 `ScrollRestoration` 이 기본으로 쓰는 키와 같은
 * 값이라 두 복원이 서로 다른 기준으로 어긋날 일도 없다.
 *
 * **저장은 스크롤할 때마다 한다.** 떠날 때 한 번 저장하는 쪽이 싸 보이지만, 그 시점에는
 * 화면이 이미 갈리는 중이라 읽을 요소가 남아 있다는 보장이 없다. 스크롤 이벤트는
 * `Map` 에 숫자 하나를 쓸 뿐 리렌더를 부르지 않는다.
 *
 * **되돌리기는 목록이 자랄 때까지 기다린다.** 뒤로 온 순간에는 쿼리 응답이 아직 없어
 * 높이가 0 이고, 그 상태에서 `scrollTop` 을 넣으면 브라우저가 0 으로 잘라 버린다.
 * 그래서 한 번 시도해 보고 안 되면 `MutationObserver` 로 내용이 붙는 것을 지켜보다
 * 자리가 생기는 첫 순간에 넣는다. 캐시가 더운 흔한 경우에는 첫 시도에서 바로 끝나고,
 * `useLayoutEffect` 라 그리기 전에 끝나 맨 위가 스쳐 보이지 않는다.
 *
 * **되돌리는 것은 뒤로가기(POP)뿐이다.** 새로 들어온 이동(PUSH·REPLACE)은 맨 위여야
 * 한다. 포트폴리오의 탭 전환도 `replace` 라 여기 걸려 맨 위에서 시작한다 — 탭을 바꾸면
 * `PortfolioPage` 가 `key={tab}` 으로 패널을 새로 만들어 내용 자체가 갈리므로 그것이 맞다.
 */

/**
 * 히스토리 항목 하나당 위치 하나. 컴포넌트 밖에 두는 이유는 화면을 떠날 때 셸이
 * 통째로 언마운트되기 때문이다 — 상태로 들고 있으면 되돌릴 값이 바로 그 순간 함께
 * 사라진다.
 *
 * **모듈 하나를 여러 화면이 함께 쓰지만 서로 섞이지 않는다.** 키가 `location.key`
 * 라 히스토리 항목마다 고유하고, 같은 항목을 두 화면이 나눠 갖는 일이 없다.
 *
 * 세션 저장소에 쓰지 않는다. 새로고침 뒤의 뒤로가기까지 되돌리려면 그래야 하지만,
 * 스크롤마다 직렬화가 붙고 깨진 값·용량 초과를 다뤄야 한다. 되돌아오는 흔한 경로는
 * 문서를 새로 받지 않는 앱 안의 이동이라 메모리로 충분하다.
 */
const savedScrollTops = new Map<string, number>();

/** 목록이 끝내 그만큼 자라지 않을 때 되돌리기를 포기하는 시점. */
const RESTORE_TIMEOUT_MS = 1500;

/**
 * 실제로 굴러가는 요소. `PageMain` 이 `<main>` 이고 화면당 하나다.
 *
 * 노드를 붙잡아 두지 않고 매번 다시 찾는다 — lazy 청크를 받는 동안에는
 * `RouteFallback` 의 `<main>` 이 서 있다가 화면이 도착하면 다른 노드로 갈린다.
 *
 * **헤더가 `PageMain` 밖으로 나가도(FINCH-231 · -297) 이 판정은 그대로다** —
 * 헤더는 `<div>` 이고 굴러가는 요소는 여전히 `<main>` 하나다. 컨테이너 안에 두 번째
 * `<main>` 을 두지 않는 것이 이 훅의 전제다.
 */
function findScrollElement(container: HTMLElement) {
  return container.querySelector('main');
}

export function useInnerScrollRestoration() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { key } = useLocation();
  const navigationType = useNavigationType();

  // ── 되돌리기 ────────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const saved =
      navigationType === 'POP' ? savedScrollTops.get(key) : undefined;

    if (saved === undefined) {
      // 새로 들어온 화면이다. 안쪽 스크롤은 이전 화면의 위치를 그대로 물고 있을 수
      // 있으므로(같은 요소가 재사용되는 탭 간 이동) 명시적으로 맨 위로 올린다.
      const element = findScrollElement(container);
      if (element) {
        element.scrollTop = 0;
      }
      return;
    }

    let isSettled = false;
    const deadline = Date.now() + RESTORE_TIMEOUT_MS;

    // `settle` 은 아래에서 만드는 `observer` 를, `observer` 는 `tryRestore` 를 참조해
    // 셋이 앞뒤로 얽힌다. 그래서 관찰자 자리를 먼저 비워 두고 나중에 채운다.
    // 함수 선언(`function`)으로 두면 호이스팅 때문에 위에서 좁힌 `container`·`saved`
    // 의 타입이 함수 안에서 풀린다 — 화살표 함수라야 좁힌 채로 들어간다.
    let observer: MutationObserver | null = null;

    const settle = () => {
      isSettled = true;
      observer?.disconnect();
      container.removeEventListener('wheel', settle);
      container.removeEventListener('touchstart', settle);
    };

    const tryRestore = () => {
      if (isSettled) {
        return;
      }

      // 기한을 먼저 본다. 되돌리기를 먼저 시도하면 한참 뒤에야 도착한 목록에도
      // 위치를 밀어 넣게 된다 — 이미 몇 초를 들여다본 화면이 갑자기 뛴다.
      if (Date.now() >= deadline) {
        settle();
        return;
      }

      const element = findScrollElement(container);
      // 되돌릴 자리가 생겼을 때만 넣는다. 아직 짧으면 브라우저가 조용히 잘라내고
      // 우리는 성공한 줄 안다.
      if (element && element.scrollHeight - element.clientHeight >= saved) {
        element.scrollTop = saved;
        settle();
      }
    };

    // 사용자가 먼저 움직이면 되돌리지 않는다. 기다리는 사이에 손이 닿았는데 나중에
    // 위치를 밀어 넣으면 사용자가 하던 스크롤을 빼앗는다. 스크롤 이벤트가 아니라
    // 입력으로 판정하는 이유는 우리가 넣은 `scrollTop` 도 스크롤 이벤트를 내기
    // 때문이다 — 그것과 사람의 손을 구분할 수 없다.
    container.addEventListener('wheel', settle, { passive: true });
    container.addEventListener('touchstart', settle, { passive: true });

    // 내용이 붙는 것을 지켜본다. 목록 행이 생기는 것도, 폴백 `<main>` 이 진짜 화면의
    // `<main>` 으로 갈리는 것도 여기로 잡힌다.
    observer = new MutationObserver(tryRestore);
    observer.observe(container, { childList: true, subtree: true });

    // 캐시가 더워 이미 다 그려져 있으면 여기서 끝난다.
    tryRestore();

    return settle;
  }, [key, navigationType]);

  // ── 저장 ────────────────────────────────────────────────────────────────
  //
  // **이 효과는 되돌리기 뒤에 선언돼 있어야 한다.** React 는 정리(cleanup)를 전부
  // 돌린 뒤에 설치를 돌리므로, 이 순서라야 되돌리기가 `scrollTop` 을 넣는 시점에
  // 이전 키에 묶인 리스너가 이미 떨어져 있다. 뒤집으면 새 화면의 위치가 이전 화면의
  // 키에 덮어써져 정작 돌아갔을 때 맨 위가 된다.
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = (event: Event) => {
      const target = event.target;
      // 스크롤 이벤트는 버블링하지 않으므로 캡처로 받는다. 목록 안의 가로 스크롤러가
      // 낸 것까지 섞이지 않도록 굴러간 것이 `PageMain` 인지 본다.
      if (target instanceof HTMLElement && target.tagName === 'MAIN') {
        savedScrollTops.set(key, target.scrollTop);
      }
    };

    container.addEventListener('scroll', handleScroll, true);
    return () => container.removeEventListener('scroll', handleScroll, true);
  }, [key]);

  return containerRef;
}
