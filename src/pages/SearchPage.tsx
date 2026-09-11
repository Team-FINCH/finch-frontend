import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import {
  RecentKeywordChips,
  RecentStockList,
  SearchSectionHeader,
  StockSearchField,
  StockSearchResultList,
  useDebouncedValue,
  useDeleteRecentSearchKeyword,
  useRecentSearchKeywords,
  useRecentStocks,
  useStockSearch,
} from '@/features/stocks';
import { useDeleteRecentStock } from '@/features/stocks/api/useRecentStocks';
import { STOCK_SEARCH_MIN_KEYWORD_LENGTH } from '@/shared/config/apiContract';
import { ROUTES } from '@/shared/config/routes';
import { showToast } from '@/shared/hooks/useToastStore';
import { type StockSummary } from '@/shared/types/stock';
import { PageMain } from '@/shared/ui/PageMain';
import { Skeleton } from '@/shared/ui/Skeleton';

/**
 * 종목 검색 — 종목명·코드로 찾기. 입력이 비어 있으면 최근 검색어 초기 상태다
 * (`ia.md` §1: 최근 검색어는 자기 라우트를 갖지 않고 `/search` 의 초기 상태다).
 *
 * 티켓: FINCH-38.
 *
 * 근거: `ia.md` §1 "탐색·거래" 표 · §2 라우트 트리(`?q=`) ·
 * 프로토타입 `finch-prototype.html` 의 `isSearch` 블록.
 * API: `GET /api/v1/stocks/search?keyword=&size=` (검색) ·
 * `GET /api/v1/stocks/search/recent` · `DELETE /api/v1/stocks/search/recent/{keywordId}` ·
 * `DELETE /api/v1/stocks/search/recent` (최근 검색어) · `GET /api/v1/stocks/recent`.
 *
 * ## 화면이 갈리는 방식
 *
 * 검색어가 2글자 미만이면 **탐색 상태**(최근 검색어 + 최근 본 종목)를 그리고,
 * 2글자 이상이면 **결과 상태**로 바꾼다. 결과 상태에서는 최근 기록을 감춘다
 * (design.md §336 "검색 결과 상태에서는 랭킹/최근 기록을 숨기고 결과만 표시").
 *
 * 시장 랭킹 섹션은 만들지 않는다. design.md 가 2026-09-07 에 이 절을 걷었고
 * 프로토타입 `isSearch` 블록에도 랭킹 마크업이 없다 (`prototype-diff-search.md` E절).
 */

/**
 * 검색어를 URL 에 반영하기까지 기다리는 시간. 글자마다 요청을 보내지 않으려는 것이고
 * 계약이 아니라 화면 재량이다.
 */
const SEARCH_DEBOUNCE_MS = 300;

/** `?q=` 파라미터 이름 (ia.md §2 쿼리 파라미터 표). */
const SEARCH_QUERY_PARAM = 'q';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryFromUrl = searchParams.get(SEARCH_QUERY_PARAM) ?? '';

  /**
   * 입력은 로컬 상태로 두고 URL 에는 디바운스해서 쓴다.
   * 글자마다 `setSearchParams` 를 부르면 히스토리가 글자 수만큼 쌓여 뒤로가기가
   * 검색어를 한 글자씩 되감는다. 그래서 `replace: true` 로 덮어쓴다 (ia.md §1 이
   * 최근 검색어에 라우트를 주지 않은 것과 같은 이유다).
   */
  const [input, setInput] = useState(queryFromUrl);
  const debouncedInput = useDebouncedValue(input, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (debouncedInput === queryFromUrl) {
      return;
    }
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (debouncedInput.trim() === '') {
          next.delete(SEARCH_QUERY_PARAM);
        } else {
          next.set(SEARCH_QUERY_PARAM, debouncedInput);
        }
        return next;
      },
      { replace: true },
    );
  }, [debouncedInput, queryFromUrl, setSearchParams]);

  const searchQuery = useStockSearch(debouncedInput);
  const recentKeywords = useRecentSearchKeywords();
  const recentStocks = useRecentStocks();
  const deleteKeyword = useDeleteRecentSearchKeyword();
  const deleteRecentStock = useDeleteRecentStock();

  const trimmed = debouncedInput.trim();
  const isSearching = trimmed.length >= STOCK_SEARCH_MIN_KEYWORD_LENGTH;
  // 한 글자만 친 구간. 에러가 아니라 안내 자리다 (`useStockSearch` 주석).
  const isTooShort = trimmed.length > 0 && !isSearching;

  const keywords = recentKeywords.data?.items ?? [];
  const viewedStocks = recentStocks.data?.items ?? [];

  return (
    <PageMain>
      {/* 프로토타입 isSearch 블록의 `<div class="nav"><span class="navt">탐색</span></div>`
          와 그 아래 검색 입력 줄이다. 다른 상시 화면(홈·포트폴리오·내 정보)과 같은
          자리·같은 크기의 제목이라 여기만 sr-only 로 두면 탭을 옮길 때 이 화면만
          제목이 사라져 보인다. 알림함 뱃지는 넣지 않는다 — 프로토타입의 탐색 nav
          에는 없다 (ia.md §1).

          **둘 다 스크롤 밖에 남는다.** 프로토타입은 `.nav` 와 입력 줄을 `flex:none`
          으로 `.sc` 앞에 두어 본문만 굴린다(proto L1566-1572). 우리는 `PageMain`
          자신이 `.sc` 자리라 그 안에서 `sticky top-0` 로 같은 결과를 만든다 —
          `PageHeader` 가 쓰는 방식과 같고, 좌우 26px·위 24px 여백을 음수 마진으로
          끌어와 배경을 깔아야 본문이 글자 뒤로 지나간다.
          아래 16px 은 입력 줄의 `padding-bottom` 이다 (proto L1567). */}
      <div className="sticky top-0 z-10 -mx-6.5 -mt-6 bg-bg px-6.5 pt-6 pb-4">
        <h1 className="mb-4 text-section-title text-text-primary">탐색</h1>
        <StockSearchField value={input} onChange={setInput} />
      </div>

      <div>
        {isTooShort && (
          <p className="pt-1 text-body-2 text-text-secondary">
            {STOCK_SEARCH_MIN_KEYWORD_LENGTH}글자 이상 입력해 주세요
          </p>
        )}

        {isSearching && (
          <SearchResults
            isPending={searchQuery.isPending}
            isError={searchQuery.isError}
            onRetry={() => void searchQuery.refetch()}
            results={searchQuery.data?.items ?? []}
          />
        )}

        {!isSearching && !isTooShort && (
          <>
            <section>
              <SearchSectionHeader
                label="최근 검색어"
                action={
                  keywords.length > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        // 지운 뒤에 아무 말이 없으면 지워졌는지 실패했는지
                        // 화면으로 알 수 없다. 목록이 비는 것은 성공했을 때만
                        // 보이는 신호라 실패와 구분되지 않는다.
                        deleteKeyword.mutate('all', {
                          onSuccess: () => {
                            showToast('최근 검색어를 모두 지웠어요.');
                          },
                        })
                      }
                      className="text-caption text-text-muted"
                    >
                      전체 삭제
                    </button>
                  ) : undefined
                }
              />
              {keywords.length > 0 ? (
                <RecentKeywordChips
                  keywords={keywords}
                  onPick={setInput}
                  onRemove={(keywordId) => deleteKeyword.mutate(keywordId)}
                />
              ) : (
                <p className="text-body-2 text-text-secondary">
                  최근 검색어가 없어요.
                  <br />
                  궁금한 종목을 검색해 보세요.
                </p>
              )}
            </section>

            <section className="mt-9 pb-5">
              <SearchSectionHeader
                label="최근 본 종목"
                className="mb-1.5"
                action={
                  viewedStocks.length > 0 ? (
                    <Link
                      to={ROUTES.recent}
                      className="text-caption text-text-muted"
                    >
                      전체 보기
                    </Link>
                  ) : undefined
                }
              />
              {viewedStocks.length > 0 ? (
                <RecentStockList
                  stocks={viewedStocks}
                  onRemove={(stockCode) => deleteRecentStock.mutate(stockCode)}
                />
              ) : (
                <p className="text-body-2 text-text-secondary">
                  아직 최근에 본 종목이 없어요.
                  <br />
                  종목을 둘러보면 여기에 모아둘게요.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </PageMain>
  );
}

/**
 * 결과 영역의 네 상태 (프로토타입 `searchLoading`·`searchFailed`·`searchEmpty`·`showResults`).
 * 페이지 본문이 길어져서 갈라 뒀다. 상태 판단은 전부 부모가 넘긴 값으로 한다.
 */
type SearchResultsProps = {
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  results: readonly StockSummary[];
};

function SearchResults({
  isPending,
  isError,
  onRetry,
  results,
}: SearchResultsProps) {
  if (isPending) {
    return (
      <div className="flex flex-col gap-4.5 pt-2.5">
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-5 w-1/2" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="pt-1.5">
        <p className="text-body-1 font-medium text-text-primary">
          검색 결과를 불러오지 못했어요
        </p>
        <p className="mt-1.5 text-body-2 text-text-secondary">
          잠시 후 다시 시도해 주세요.
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2.5 text-label font-medium text-text-secondary underline underline-offset-[3px]"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="pt-1.5">
        <p className="text-body-1 font-medium text-text-primary">
          검색 결과가 없어요
        </p>
        <p className="mt-1.5 text-body-2 text-text-secondary">
          종목명이나 종목코드를
          <br />
          다시 확인해 주세요.
        </p>
      </div>
    );
  }

  return (
    <section>
      <p className="mb-1.5 text-label font-semibold text-text-secondary">
        검색 결과
      </p>
      <StockSearchResultList results={results} />
    </section>
  );
}
