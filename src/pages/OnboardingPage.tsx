import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCompleteOnboarding } from '@/features/onboarding/api/useCompleteOnboarding';
import { useOnboardingSearch } from '@/features/onboarding/api/useOnboardingSearch';
import { StockPickRow } from '@/features/onboarding/components/StockPickRow';
import { MAJOR_STOCKS } from '@/features/onboarding/lib/majorStocks';
import { markOnboardingDone } from '@/features/onboarding/lib/onboardingDone';
import { useOnboardingPicks } from '@/features/onboarding/model/useOnboardingPicks';
import { STOCK_SEARCH_MIN_KEYWORD_LENGTH } from '@/shared/config/apiContract';
import { HOME_LIST_TAB_PARAM, ROUTES } from '@/shared/config/routes';
import { showToast } from '@/shared/hooks/useToastStore';
import { Button } from '@/shared/ui/Button';

/**
 * 온보딩 — 관심 종목 선택 (design.md §7.16, 프로토타입 `isOnboard`).
 *
 * **콜드 스타트를 푸는 자리다.** 가입 직후에는 보유·거래·기록이 비어 AI 기능이
 * 거의 열리지 않는데, 관심 종목 하나만 담으면 데일리 브리핑이 켜진다. 그래서
 * 첫 행동을 매수가 아니라 관심 종목 담기로 둔다.
 *
 * 세 층으로 고정한다 — 상단(제목·검색창)은 스크롤하지 않고, 목록만 내부
 * 스크롤하며, CTA 는 항상 같은 자리다. 종목 수가 늘어도 제목이 밀리지 않는다.
 * 하단 탭바는 없다. 브랜드 마크도 넣지 않는다 — 직전 로그인 화면에서 이미 봤다.
 */
export function OnboardingPage() {
  const navigate = useNavigate();
  const { picks, toggle } = useOnboardingPicks();
  const [expanded, setExpanded] = useState(false);
  const [keyword, setKeyword] = useState('');

  const complete = useCompleteOnboarding();
  const trimmed = keyword.trim();
  const searching = trimmed.length >= STOCK_SEARCH_MIN_KEYWORD_LENGTH;
  const search = useOnboardingSearch(keyword);

  /**
   * 목록의 출처가 상태에 따라 갈린다.
   * 접힘은 임시 상수(`MAJOR_STOCKS` — 카탈로그 목록 API 가 없다), 펼침은 검색이다.
   * **펼쳐도 검색어가 없으면 보여줄 것이 없다** — "전체 종목" 을 내려주는 API 가
   * 없어서다. 그 상태에서는 검색을 안내한다.
   */
  const rows = searching
    ? (search.data?.items ?? []).map((item) => ({
        stockCode: item.stockCode,
        stockName: item.stockName,
        sub: `${item.stockCode} · ${item.market}`,
        suspended: item.suspended,
      }))
    : expanded
      ? []
      : MAJOR_STOCKS.map((stock) => ({
          stockCode: stock.stockCode,
          stockName: stock.stockName,
          sub: `${stock.stockCode} · ${stock.market}`,
          suspended: false,
        }));

  const listTitle = searching
    ? '검색 결과'
    : expanded
      ? '종목 검색'
      : '국내 주요 종목';

  /** 완료·건너뛰기 모두 홈의 관심 종목 탭으로 보낸다 (design.md §7.16 "완료 후 홈"). */
  const goHome = () =>
    void navigate(`${ROUTES.home}?${HOME_LIST_TAB_PARAM}=watch`, {
      replace: true,
    });

  const handleSkip = () => {
    // 건너뛴 것도 온보딩을 마친 것이다. 다시 열면 같은 화면에 갇힌다.
    // 홈 상단의 관심 종목 유도 카드가 그 자리를 대신한다.
    markOnboardingDone();
    goHome();
  };

  const handleDone = () => {
    complete.mutate([...picks], {
      onSuccess: ({ requested, failed }) => {
        goHome();
        // 고른 수가 아니라 실제로 담긴 수를 말한다. 한 종목이 실패해도 나머지는
        // 담기는 흐름이라(`useCompleteOnboarding`) 둘이 다를 수 있다.
        // 하나도 못 담았으면 띄우지 않는다 — "0개를 담았어요" 는 성공 문구가 아니다.
        // 그 경우는 화면의 `complete.isError` 줄이 맡는다.
        const added = requested - failed;
        if (added > 0) {
          showToast(`관심 종목 ${added}개를 담았어요.`);
        }
      },
    });
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col bg-bg">
      <div className="flex flex-none items-center justify-end px-6.5 pt-3.5">
        <button
          type="button"
          onClick={handleSkip}
          className="py-1.5 text-label font-medium text-text-muted"
        >
          건너뛰기
        </button>
      </div>

      <div className="flex-none px-6.5 pt-2.5">
        <h1 className="text-title-2 text-text-primary">
          관심 있는 종목을
          <br />
          골라주세요
        </h1>
        <p className="mt-2.5 text-body-2 text-text-secondary">
          고른 종목을 기준으로 매일 필요한 소식을 모아드려요.
        </p>

        <div className="mt-7.5 mb-1 flex items-baseline justify-between">
          <span className="text-body-1 font-bold text-text-primary">
            {listTitle}
          </span>
          <span
            className={`text-caption font-medium ${
              picks.length >= 1 ? 'text-text-primary' : 'text-text-muted'
            }`}
          >
            {picks.length}개 선택
          </span>
        </div>
        {/* 바로 위 안내가 이미 "고른 종목의 소식을 모아드린다" 를 말했다
            (FINCH-351). 이 줄까지 소식을 한 번 더 말하면 같은 사실이 두
            줄이 된다 — 여기서 남길 것은 **여러 개 골라도 된다**는 허락 하나다. */}
        <p className="text-caption text-text-secondary">
          여러 개 골라도 괜찮아요.
        </p>

        {/* 검색창은 펼친 상태에서만 나온다 (design.md §7.16) */}
        {expanded && (
          <label className="mt-3 flex h-10.5 items-center gap-2.25 rounded-12 bg-primary-soft px-3.25">
            <span aria-hidden="true" className="text-text-muted">
              ⌕
            </span>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="종목명 또는 종목코드 검색"
              aria-label="종목 검색"
              className="min-w-0 flex-1 bg-transparent text-body-2 text-text-primary outline-none placeholder:text-text-muted"
            />
          </label>
        )}
      </div>

      <div className="scroll-touch flex-1 overflow-y-auto overscroll-contain px-6.5 pb-8">
        <div className="flex flex-col">
          {rows.map((row) => (
            <StockPickRow
              key={row.stockCode}
              stockCode={row.stockCode}
              stockName={row.stockName}
              sub={row.sub}
              suspended={row.suspended}
              selected={picks.includes(row.stockCode)}
              onToggle={() => toggle(row.stockCode)}
            />
          ))}
        </div>

        {searching && search.isPending && (
          <p className="px-0.5 py-5.5 text-caption text-text-secondary">
            찾고 있어요.
          </p>
        )}
        {searching && search.isError && (
          <p className="px-0.5 py-5.5 text-caption text-text-secondary">
            검색에 실패했어요. 잠시 후 다시 시도해 주세요.
          </p>
        )}
        {searching && !search.isPending && rows.length === 0 && (
          <p className="px-0.5 py-5.5 text-caption text-text-secondary">
            검색 결과가 없어요. 종목명이나 종목코드를 다시 확인해 주세요.
          </p>
        )}
        {expanded && !searching && (
          <p className="px-0.5 py-5.5 text-caption text-text-secondary">
            찾는 종목의 이름이나 종목코드를 {STOCK_SEARCH_MIN_KEYWORD_LENGTH}
            글자 이상 입력해 주세요.
          </p>
        )}

        {/* 검색 중에는 숨긴다 (design.md §7.16) */}
        {!expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="mt-3.5 flex w-full items-center justify-center gap-1.25 py-3 text-label font-medium text-text-secondary"
          >
            더 많은 종목 보기
            <span aria-hidden="true">›</span>
          </button>
        )}
        {expanded && (
          <button
            type="button"
            onClick={() => {
              setExpanded(false);
              setKeyword('');
            }}
            className="mt-3.5 flex w-full items-center justify-center gap-1.25 py-3 text-label font-medium text-text-secondary"
          >
            접기
            <span aria-hidden="true">⌃</span>
          </button>
        )}
      </div>

      <div className="flex-none border-t border-border bg-bg px-6.5 pt-3.5 pb-[calc(1.875rem+env(safe-area-inset-bottom))]">
        {complete.isError && (
          <p className="mb-2.5 text-caption text-text-secondary">
            관심 종목을 담지 못했어요. 다시 시도해 주세요.
          </p>
        )}
        <Button
          disabled={picks.length === 0 || complete.isPending}
          onClick={handleDone}
        >
          {picks.length === 0
            ? '종목을 골라주세요'
            : complete.isPending
              ? '담는 중…'
              : 'FINCH 시작하기'}
        </Button>
      </div>
    </div>
  );
}
