import { useInboxItems } from '@/features/inbox';
import {
  CauseTab,
  DiagnosisTab,
  HoldingsTab,
  PortfolioTabBar,
  usePortfolioTabState,
  WikiTab,
} from '@/features/portfolio';
import { PageHeader } from '@/shared/ui/PageHeader';
import { PageMain } from '@/shared/ui/PageMain';

/**
 * 포트폴리오 — 보유 종목 상세·평가손익, AI 진단, 수익률 원인 분석, 투자 기준(위키)
 * 4중 탭. `?tab=holdings|diagnosis|cause|wiki` · `?sort=EVALUATION|PROFIT_RATE`.
 *
 * **`?tab=wiki` 가 위키의 유일한 라우트다** — 독립 화면(구 `/my/wiki`)은 없앴다
 * (`ia.md` §1 "AI가 이해한 나 — 위키 화면"의 "라우트를 하나로 합친 이유").
 *
 * 티켓: FINCH-49.
 *
 * 근거: `ia.md` §1 "홈·자산" 표, §2 라우트 트리(쿼리 파라미터 표).
 * API: `GET /api/v1/portfolio?sort=` · `GET /api/v1/stocks/prices`
 * (위키 탭은 `GET /api/v1/ai/wiki` · `PUT /api/v1/ai/wiki/theses/{stockCode}` ·
 * `DELETE /api/v1/ai/wiki/facts/{factId}`, `ia.md` §1 "AI가 이해한 나" 절).
 *
 * **탭마다 컴포넌트를 갈아 끼운다 — 넷을 한꺼번에 마운트하지 않는다.** 보이지
 * 않는 탭의 AI 요청(`tab=diagnosis`·`tab=cause`)이 나가지 않게 하는 것이 이 구조
 * 하나로 해결된다 — 컴포넌트가 마운트될 때만 그 탭의 쿼리가 돈다. 탭을 오갈 때
 * 스크롤·펼침 상태가 초기화되는 대신 얻는 단순함이다.
 *
 * `GET /stocks/prices`(시세 폴링)는 이 티켓의 범위가 아니다 — `GET /portfolio`가
 * 내려주는 `currentPrice` 스냅샷을 그대로 쓴다.
 *
 * **헤더는 `shared/ui/PageHeader.tsx` 를 쓴다** (FINCH-28, 내 정보 화면 작업 중
 * 헤더 중복을 셋으로 확인하고 공용화했다). 예전 `PortfolioHeader` 는 알림함 API 가
 * 없어 뱃지 카운트를 못 달았는데, 지금은 `useInboxItems` 가 있어 실제 미읽음 개수를
 * 연결한다.
 */
export function PortfolioPage() {
  const { tab, sort, setTab, setSort } = usePortfolioTabState();
  const inbox = useInboxItems();

  return (
    <>
      {/*
        헤더는 `PageMain` 밖에 있다 — 프로토타입이 `.nav` 를 `.sc` 밖에 `flex:none`
        으로 두고 본문만 굴리는 구조다(FINCH-231, `PageHeader` 주석).

        프로토타입은 `.nav`(56px) 바로 아래 `.tabs` 가 붙어 여백이 없다
        (proto L2150-2151). 전에 두었던 4px 은 근거가 없어 걷었다. 그래서
        `PageMain` 이 `pt-0` 이고 4탭 줄이 스크롤 컨테이너 맨 위(`sticky top-0`)에
        선다 — 그 자리가 곧 헤더 바로 아래다.
      */}
      <PageHeader
        title="포트폴리오"
        unreadCount={inbox.data?.unreadCount ?? 0}
      />
      <PageMain className="pt-0">
        <PortfolioTabBar tab={tab} onChange={setTab} />

        {/*
          `key` 로 탭마다 새 노드를 만들어 페이드를 다시 태운다. `min-h` 는 탭마다
          내용 높이가 달라 페이지가 짧아졌다 길어지는 것을 막는다 — 스크롤 위치가
          튀는 것이 "번쩍" 의 실제 정체다(FINCH-163).
        */}
        <div
          key={tab}
          className="min-h-[60svh] animate-[tab-panel-fade-in_var(--motion-normal)_var(--ease-standard)_both]"
        >
          {tab === 'holdings' && (
            <HoldingsTab sort={sort} onSortChange={setSort} />
          )}
          {tab === 'diagnosis' && <DiagnosisTab />}
          {tab === 'cause' && <CauseTab />}
          {tab === 'wiki' && <WikiTab />}
        </div>
      </PageMain>
    </>
  );
}
