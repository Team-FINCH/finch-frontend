import { useState } from 'react';

import { BriefingSection } from '@/features/home/components/BriefingSection';
import { HoldingsWatchlistPreview } from '@/features/home/components/HoldingsWatchlistPreview';
import { MarketIndexRoller } from '@/features/home/components/MarketIndexRoller';
import { TotalAssetsSummary } from '@/features/home/components/TotalAssetsSummary';
import { UpdateNoticeModal } from '@/features/home/components/UpdateNoticeModal';
import { useHomeData } from '@/features/home/model/useHomeData';
import { useInboxItems } from '@/features/inbox';
import type { PortfolioSort } from '@/shared/types/portfolio';
import type { WatchlistSort } from '@/shared/types/stock';
import { PageHeader } from '@/shared/ui/PageHeader';
import { PageMain } from '@/shared/ui/PageMain';

/**
 * 홈 — 총자산·손익 요약, 보유 종목·관심 종목 요약, 오늘의 브리핑.
 *
 * 티켓: FINCH-49. (`_inbox` 인수인계 표는 FINCH-29 로 적었으나
 * `ia.md` §1 "홈·자산" 표의 실제 값은 2-8/FINCH-49 다 — 이 파일은 ia.md 를 따른다.)
 *
 * 근거: `ia.md` §1 "홈·자산" 표 · §4 "AI 슬롯 배치" 1번 · 프로토타입
 * `prototype/screen/finch-prototype.html` 의 `isHome` 블록(마크업 최종 근거).
 * API: `GET /api/v1/account` · `GET /api/v1/portfolio` ·
 * `GET /api/v1/watchlist?sort=` · `GET /api/v1/stocks/prices` ·
 * `GET /api/v1/market/indices`.
 *
 * 데이터 조합은 `features/home/model/useHomeData.ts` 하나에 모았다 — 이 파일은
 * 배치만 한다. **지수 롤링만 예외로 자기 쿼리를 갖는다**(`MarketIndexRoller`) —
 * 폴링 주기(15초)가 다르고 다른 블록과 엮이는 값이 없어 `useHomeData` 에
 * 넣으면 홈 전체가 15초마다 다시 그려진다.
 *
 * **시장 지수 롤링(`.mkroll`)은 헤더 제목 옆에 있다** (티켓 FINCH-228 ·
 * GitLab #65). 전에는 "지수 API 가 없어 자리 자체를 비운다"고 적어 뒀는데
 * 그 전제가 풀렸다 — apiSpec v0.8.7 이 `GET /market/indices` 를 확정했고
 * 백엔드 티켓 225 가 머지됐다. **KOSPI · KOSDAQ 둘뿐이다.** 프로토타입은
 * USD-KRW · NASDAQ 까지 넷을 돌리지만 그 둘은 백엔드 범위 밖으로 구두 확정됐다.
 *
 * **AI 슬롯 2번(수익률 원인 분석)은 이 화면에 없다.** ia.md §4 표는 "홈 · 포트폴리오"
 * 둘 다 이 슬롯이 들어간다고 적었지만, 프로토타입의 실제 `isHome` 마크업에는
 * 이 블록이 없다 — 실제로 눌리는 자리는 `/portfolio?tab=cause`(다른 워커 소관,
 * ia.md §2 쿼리 파라미터 표)뿐이다.
 * TODO(계약): ia.md §4 표와 프로토타입 마크업이 갈리는 지점이라 팀 확인이 필요하다.
 */
export function HomePage() {
  /**
   * 내 종목·관심 종목 정렬. 버튼은 목록 안에 있지만 쿼리는 `useHomeData` 가 갖고
   * 있어 상태를 여기까지 올렸다 — 두 곳이 다른 정렬값을 보면 목록과 버튼이 어긋난다.
   *
   * **내 종목 기본값은 `PROFIT_RATE` 다** (사용자 결정, 2026-09-16). apiSpec §8.1의
   * 계약 기본값은 `EVALUATION` 이지만 그건 `sort` 파라미터를 아예 안 보냈을 때
   * 서버가 고르는 값이다 — 화면 기본을 지키려면 `useHomePortfolio` 가 이 값을 항상
   * 명시적으로 실어야 한다(`getHomePortfolio` 주석 참고).
   */
  const [holdingsSort, setHoldingsSort] =
    useState<PortfolioSort>('PROFIT_RATE');
  const [watchSort, setWatchSort] = useState<WatchlistSort>('REGISTERED');
  const {
    account,
    holdings,
    holdingsPending,
    holdingsError,
    holdingsRefetch,
    watchItems,
    watchPending,
    watchError,
    watchRefetch,
    evaluationTotals,
  } = useHomeData(holdingsSort, watchSort);
  const inbox = useInboxItems();

  const hasNoStocks =
    !holdingsPending &&
    !watchPending &&
    holdings.length === 0 &&
    watchItems.length === 0;

  return (
    <>
      {/*
        헤더는 `PageMain` 밖에 있다 — 프로토타입이 `.nav` 를 `.sc` 밖에 `flex:none`
        으로 두고 본문만 굴리는 구조다(FINCH-231, `PageHeader` 주석).
        헤더와 첫 요소 사이 14px 은 `PageMain` 의 `pt-3.5` 다. 프로토타입도 그
        14px 을 `.sc` 안의 첫 요소로 두어(`template.html` L1365) 본문과 함께
        굴러가게 한다 — 헤더 쪽에 `mb` 로 주면 그 띠만 늘 비어 있다.
      */}
      <PageHeader
        title="홈"
        unreadCount={inbox.data?.unreadCount ?? 0}
        titleSuffix={<MarketIndexRoller />}
      />
      <PageMain className="pt-3.5">
        <BriefingSection
          hasNoStocks={hasNoStocks}
          hasHoldings={holdings.length > 0}
        />
        <TotalAssetsSummary
          account={account}
          evaluationTotals={evaluationTotals}
        />
        <HoldingsWatchlistPreview
          holdings={holdings}
          holdingsPending={holdingsPending}
          holdingsError={holdingsError}
          holdingsRefetch={holdingsRefetch}
          holdingsSort={holdingsSort}
          onHoldingsSortChange={setHoldingsSort}
          watchItems={watchItems}
          watchPending={watchPending}
          watchError={watchError}
          watchRefetch={watchRefetch}
          watchSort={watchSort}
          onWatchSortChange={setWatchSort}
        />
      </PageMain>

      {/*
        서비스 갱신 규칙 안내 (FINCH-262). 하루 한 번 뜨고, 노출 판정은 이
        컴포넌트가 혼자 한다 — 홈은 열지 말지를 알 필요가 없다.

        **`PageMain` 밖이다.** 모달은 `Modal` 안에서 Radix 포털을 타고 `body` 바로
        아래로 나가므로 어디에 적어도 같은 자리에 그려지지만, 본문 안에 두면 홈의
        스크롤 컨테이너 안에 있는 것처럼 읽힌다.

        **온보딩과 겹치지 않는다.** 신규 사용자는 로그인 직후 `/onboarding` 으로
        가고(`KakaoCallbackPage` 의 `resolveDestination`) 이 컴포넌트는 홈에서만
        마운트되므로, 온보딩을 마치고 홈에 닿은 뒤에 뜬다.
      */}
      <UpdateNoticeModal />
    </>
  );
}
