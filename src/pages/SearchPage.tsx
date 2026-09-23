import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  RecentKeywordChips,
  RecentStockList,
  SearchSectionHeader,
  ServiceStockList,
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
import { SERVICE_STOCKS } from '@/shared/config/serviceStocks';
import { showToast } from '@/shared/hooks/useToastStore';
import { type StockSummary } from '@/shared/types/stock';
import { PageHeader } from '@/shared/ui/PageHeader';
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
 * `DELETE /api/v1/stocks/search/recent` (최근 검색어) · `GET /api/v1/stocks/recent` ·
 * `GET /api/v1/stocks/prices` (서비스 종목 시세).
 *
 * ## 화면이 갈리는 방식
 *
 * 검색어가 2글자 미만이면 **탐색 상태**(최근 검색어 + 최근 본 종목 + 서비스 종목)를
 * 그리고, 2글자 이상이면 **결과 상태**로 바꾼다. 결과 상태에서는 나머지를 전부 감춘다
 * (design.md §336 "검색 결과 상태에서는 랭킹/최근 기록을 숨기고 결과만 표시").
 *
 * ## 서비스 종목 절은 랭킹이 아니다 (FINCH-338)
 *
 * 앞의 두 묶음은 **사용자의 행동 기록**이라 처음 온 사람에게는 둘 다 비어 있고,
 * 서비스 종목이 30개로 닫혀 있다는 사실은 화면 어디에도 없었다. 세 번째 묶음이
 * 그 자리다 — 프론트 상수(`shared/config/serviceStocks.ts`)로 목록을 그리고 시세만
 * `GET /stocks/prices` 한 번으로 채운다. **백엔드에 새로 만든 것이 없다.**
 *
 * **시장 랭킹 섹션은 여전히 만들지 않는다.** design.md 가 2026-09-07 에 그 절을 걷었고
 * 프로토타입 `isSearch` 블록에도 랭킹 마크업이 없다 (`prototype-diff-search.md` E절).
 * 서비스 종목 절은 순위를 매기지 않고(순위 숫자 없음) 정렬하지 않으며(정본 순서 고정)
 * 일부를 고르지 않는다(전부). 셋 중 하나라도 어기면 그때부터 랭킹이고, 되살리려면
 * design.md 절과 `featureSpec` §12 를 함께 고쳐야 한다.
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
    <>
      {/* 제목 줄은 다른 탭 화면과 같은 `shared/ui/PageHeader` 다 — 프로토타입도
          탐색의 머리를 같은 `.nav`(56px)로 그린다. 전에는 이 자리에 제목·검색창을
          한 덩어리로 묶어 두어 높이가 56px 이 아니라 둘을 합친 값이었고, 탭을
          옮길 때 이 화면만 머리가 내려앉아 보였다 (FINCH-241).

          `unreadCount` 를 넘기지 않아 알림함 뱃지가 없다 — 프로토타입 탐색의
          `.nav` 에는 뱃지 버튼이 없다 (ia.md §1). */}
      <PageHeader title="탐색" />

      {/* 검색 입력 줄. 프로토타입은 이것도 `.sc` 앞에 `flex:none` 으로 두어
          본문만 굴린다 — `<div style="flex:none;padding:0 26px 16px">`.
          그래서 `PageMain` 안이 아니라 형제로 둔다. 전에는 안에 넣고
          `sticky top-0 -mx-6.5 -mt-6 bg-bg` 로 흉내 냈는데, 음수 마진과 `sticky`
          를 같은 요소에 함께 쓰면 어긋난다(`PageHeader` 주석의 231 경위).

          좌우 26px·최대 너비·가운데 정렬을 `PageHeader`·`PageMain` 과 같은 값으로
          직접 갖는다. 넓은 화면에서 본문만 가운데로 모이면 이 줄만 왼쪽에 남는다.
          아래 16px 은 프로토타입의 `padding-bottom` 이다. */}
      <div className="mx-auto w-full max-w-md flex-none px-6.5 pb-4">
        <StockSearchField value={input} onChange={setInput} />
      </div>

      <PageMain>
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

            <section className="mt-9">
              {/* **`전체 보기` 링크는 일부러 없다 — 되살리지 마라**
                  (FINCH-324, 2026-09-17 사용자 결정).

                  전에는 이 자리에 `/recent` 로 가는 `전체 보기` 가 있었는데, 그
                  라우트는 개발용 자리표시 화면이었다. 하단 탭 바도 뒤로가기도 홈
                  버튼도 없어 한 번 들어가면 나올 길이 없었다.

                  **`/recent` 전체 화면은 만들지 않기로 확정했다.** 최근 검색어와
                  최근 본 종목이 이미 이 화면에 있고, 서버가 최대 30건을 주지만
                  미리보기 3건 위로 더 볼 만한 자리가 아니라고 봤다. 그래서 링크만
                  걷지 않고 **라우트·`ROUTES.recent` 상수·자리표시 컴포넌트까지
                  함께 지웠다** — 닿을 수 없는 화면이 남아 있으면 다음 사람이
                  "만들다 만 화면" 으로 읽는다.

                  그래서 머리에 `action` 을 넘기지 않는다. 바로 위 `최근 검색어`
                  머리도 지울 것이 없으면 같은 방식으로 라벨만 그린다. */}
              <SearchSectionHeader label="최근 본 종목" className="mb-1.5" />
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

            {/* 서비스 종목 전체. **빈 상태 전용이 아니다 — 최근 본 종목이 있든
                없든 항상 그린다.** 빈 자리를 메우는 장치로 만들면 종목 하나만
                봐도 카탈로그가 사라진다. "이 앱에 뭐가 있나" 는 처음 온 사람만의
                질문이 아니고, 빈 상태 전용은 사람이 딱 한 번 보고 마는 화면을
                만드는 것이다.

                **머리에 개수를 적는 것이 이 절의 요점이다.** 서비스 종목이 30개로
                닫혀 있다는 사실이 지금까지 화면 어디에도 없었다 — 검색은 두 글자
                이상을 요구하고 유니버스 밖 종목은 `STOCK_NOT_FOUND` 인데
                (FINCH-300) 경계선을 볼 자리가 없었다. 숫자를 코드에 박지 않고
                목록 길이에서 읽는다(ia.md §7). */}
            <section className="mt-9 pb-5">
              <SearchSectionHeader
                label="서비스 종목"
                className="mb-1.5"
                action={
                  <span className="text-caption text-text-muted">
                    {SERVICE_STOCKS.length}개
                  </span>
                }
              />
              <p className="mb-1.5 text-body-2 text-text-secondary">
                이 앱에서 거래할 수 있는 종목이에요.
              </p>
              <ServiceStockList />
            </section>
          </>
        )}
      </PageMain>
    </>
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
        {/* 재시도만 버튼으로 올린다 (디자인 회신 2026-09-11, 이슈 #54).
            밑줄 텍스트는 누를 수 있다는 것이 보이지 않았다. 치수는 `.aist` 버튼
            스펙을 그대로 쓰고 정렬만 왼쪽으로 둔다 — 38px · min-width 104px ·
            radius 10(--radius-sm) · 1px --border2 · 14px/500(--text-label) ·
            --t1 · margin-top 14px.

            `shared/ui/AiStatus` 의 버튼과 같은 모양이지만 공용으로 올리지 않는다.
            그쪽은 가운데 정렬 상태 셸 안에 붙박여 있어 이 자리에 그대로 쓸 수 없고,
            지금 같은 모양을 쓰는 자리가 둘뿐이라 셸을 나눌 근거가 약하다.

            `before:` 로 눌리는 영역만 위아래 3px 씩 넓혀 44px 을 만든다
            (design.md §12 최소 터치 영역). AiStatus 와 같은 방식이다 — 보이는
            높이를 44px 로 올리면 실측값에서 벗어난다. */}
        <button
          type="button"
          onClick={onRetry}
          className="relative mt-3.5 h-9.5 min-w-26 rounded-sm border border-border-strong bg-surface px-4.5 text-label text-text-primary before:absolute before:inset-x-0 before:-inset-y-0.75 before:content-['']"
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
