import { useSearchParams } from 'react-router-dom';

import {
  PortfolioSortSchema,
  type PortfolioSort,
} from '@/shared/types/portfolio';

/** `/portfolio?tab=` 넷 (ia.md §2). 라벨은 프로토타입 원문 그대로다. */
export const PORTFOLIO_TABS = [
  { value: 'holdings', label: '보유' },
  { value: 'diagnosis', label: 'AI 진단' },
  { value: 'cause', label: '수익률 분석' },
  { value: 'wiki', label: '투자 기준' },
] as const;

export type PortfolioTab = (typeof PORTFOLIO_TABS)[number]['value'];

const DEFAULT_TAB: PortfolioTab = 'holdings';
const DEFAULT_SORT: PortfolioSort = 'EVALUATION';

function isPortfolioTab(value: string | null): value is PortfolioTab {
  return PORTFOLIO_TABS.some((tab) => tab.value === value);
}

/**
 * `/portfolio` 의 `tab`·`sort` 쿼리 상태 (ia.md §2). 잘못되거나 없는 값은 기본값으로
 * 읽되, URL 자체는 고치지 않는다 — 공유된 이상한 링크를 열어도 화면은 정상 탭을
 * 보여주면 충분하고, 주소창을 조용히 바꾸는 것은 사용자가 요청하지 않은 동작이다.
 *
 * **탭 전환은 `replace`, 화면 이동은 `push`다**(`frontConvention.md` §10). 이 훅이
 * 만드는 `setTab`은 항상 `replace`다 — 다른 화면에서 이 탭으로 들어오는 이동
 * (알림함 → 위키 탭, 종목 상세 → 위키 탭)은 이 훅이 아니라 호출부의 `navigate`가
 * `push`로 처리한다.
 */
export function usePortfolioTabState() {
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const tab = isPortfolioTab(tabParam) ? tabParam : DEFAULT_TAB;

  const sortParam = searchParams.get('sort');
  const sortParsed = PortfolioSortSchema.safeParse(sortParam);
  const sort = sortParsed.success ? sortParsed.data : DEFAULT_SORT;

  function setTab(nextTab: PortfolioTab) {
    const next = new URLSearchParams(searchParams);
    next.set('tab', nextTab);
    setSearchParams(next, { replace: true });
  }

  function setSort(nextSort: PortfolioSort) {
    const next = new URLSearchParams(searchParams);
    next.set('sort', nextSort);
    setSearchParams(next, { replace: true });
  }

  return { tab, sort, setTab, setSort };
}
