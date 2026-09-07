import { BriefingSection } from '@/features/home/components/BriefingSection';
import { HoldingsWatchlistPreview } from '@/features/home/components/HoldingsWatchlistPreview';
import { TotalAssetsSummary } from '@/features/home/components/TotalAssetsSummary';
import { useHomeData } from '@/features/home/model/useHomeData';
import { useInboxItems } from '@/features/inbox';
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
 * `GET /api/v1/watchlist?sort=` · `GET /api/v1/stocks/prices`.
 *
 * 데이터 조합은 `features/home/model/useHomeData.ts` 하나에 모았다 — 이 파일은
 * 배치만 한다.
 *
 * **시장 지수 마퀴(`.mkroll`)는 만들지 않는다.** ia.md 의 "필요한 API" 목록에
 * 시장 지수 API 가 없다 — 없는 데이터를 보여줄 수 없어 자리 자체를 비운다.
 *
 * **AI 슬롯 2번(수익률 원인 분석)은 이 화면에 없다.** ia.md §4 표는 "홈 · 포트폴리오"
 * 둘 다 이 슬롯이 들어간다고 적었지만, 프로토타입의 실제 `isHome` 마크업에는
 * 이 블록이 없다 — 실제로 눌리는 자리는 `/portfolio?tab=cause`(다른 워커 소관,
 * ia.md §2 쿼리 파라미터 표)뿐이다.
 * TODO(계약): ia.md §4 표와 프로토타입 마크업이 갈리는 지점이라 팀 확인이 필요하다.
 */
export function HomePage() {
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
  } = useHomeData();
  const inbox = useInboxItems();

  const hasNoStocks =
    !holdingsPending &&
    !watchPending &&
    holdings.length === 0 &&
    watchItems.length === 0;

  return (
    <PageMain>
      <PageHeader
        title="홈"
        unreadCount={inbox.data?.unreadCount ?? 0}
        className="pb-3.5"
      />
      <BriefingSection hasNoStocks={hasNoStocks} />
      <TotalAssetsSummary
        account={account}
        evaluationTotals={evaluationTotals}
      />
      <HoldingsWatchlistPreview
        holdings={holdings}
        holdingsPending={holdingsPending}
        holdingsError={holdingsError}
        holdingsRefetch={holdingsRefetch}
        watchItems={watchItems}
        watchPending={watchPending}
        watchError={watchError}
        watchRefetch={watchRefetch}
      />
    </PageMain>
  );
}
