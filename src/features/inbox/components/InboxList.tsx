import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';

import { useInboxItems } from '../api/useInboxItems';
import { useMarkInboxItemRead } from '../api/useMarkInboxItemRead';
import type { InboxRecordSubmit } from '../model/recordSubmit';
import type { InboxItem } from '../model/types';

import { InboxItemRow } from './InboxItemRow';
import { RecordSheet } from './RecordSheet';

/**
 * 알림함 목록 (FINCH-49, ia.md §1 "알림함", apiSpec §6.4).
 *
 * 항목을 누르면 흐름은 셋으로 갈린다 — 갈래는 계약의 `kind` 표 그대로다.
 * - `record`(적어야 할 것) — "왜 담으셨나요?" 시트(`RecordSheet`, 프로토타입 `sheetRecord`)
 * - `wiki`(확인해야 할 것) — `/portfolio?tab=wiki` 로 **`push`** 이동(ia.md §1 "AI가
 *   이해한 나" 절 — 알림함에서 나가는 이동은 `push` 다. `replace` 로 하면 뒤로가기가
 *   알림함으로 돌아오지 못한다)
 * - `news`(읽을 것) — **그 종목 상세의 AI 탭**으로 `push` 이동. 이전 판은 `briefing`
 *   이라는 이름으로 `/briefing` 에 보내고 있었는데 계약이 종류 이름과 이동 대상을
 *   함께 바꿨다 — 브리핑 전체 화면이 아니라 종목 하나의 소식이다
 *
 * **`wiki`·`news` 는 지금 서버가 내보내지 않는다**(AI 추측 생성기 미구현 · 종목별 소식
 * 원천 미정). 그래도 갈래를 만들어 둔다 — 원천이 붙는 날 화면을 다시 고치지 않는다.
 * 목 서버(`mocks/handlers/inbox.ts`)에 세 종류를 다 넣은 것이 이 갈래를 확인하는
 * 유일한 길이다.
 *
 * **`stockCode` 가 `null` 이면 이동하지 않는다.** 계약이 `stockCode` 를
 * `string | null` 로 두고 값이 보장되는 것은 `record` 뿐이라고 적었다(§6.4 필드 표).
 * 종목 없는 `news`·`wiki` 가 오면 갈 곳이 없으므로 읽음 표시만 하고 제자리에 둔다 —
 * 목적지 없는 `navigate` 로 엉뚱한 화면에 떨어뜨리지 않는다.
 *
 * 여는 것과 무관하게 항목을 누르면 읽음 표시(`POST /inbox/{itemId}/read`)를 함께
 * 보낸다 — 실패해도 이동 자체는 막지 않는다. `itemId` 는 불투명 문자열이라 그대로
 * 돌려보낸다.
 */

/**
 * 종목 상세의 AI 탭을 여는 쿼리. 값의 원본은
 * `features/stocks/lib/stockDetailParams.ts` 의 `STOCK_DETAIL_TAB_PARAM`·
 * `STOCK_DETAIL_TABS` 인데 **feature 끼리 import 할 수 없어**(컨벤션 §2,
 * `import-x/no-restricted-paths`) 여기서 문자열로 적는다. 탭 파라미터 이름은
 * AI 브리핑의 `deeplink` 가 쓰는 값이기도 해서 프론트가 마음대로 바꾸지 못한다
 * (`shared/config/routes.ts` 머리 주석).
 */
const STOCK_DETAIL_AI_TAB_QUERY = 'tab=ai';

type InboxListProps = {
  /**
   * `record` 항목의 시트가 쓰는 저장 경로. **알림함이 직접 만들지 못한다** —
   * 매수 이유는 `POST /ai/wiki/theses` 로 가고 그 훅이 다른 feature 에 있어
   * `pages/InboxPage.tsx` 가 내려준다(`../model/recordSubmit.ts` 머리 주석).
   */
  recordSubmit: InboxRecordSubmit;
};

export function InboxList({ recordSubmit }: InboxListProps) {
  const { data, isPending, isError, refetch } = useInboxItems();
  const markRead = useMarkInboxItemRead();
  const navigate = useNavigate();
  const [recordItem, setRecordItem] = useState<InboxItem | null>(null);

  function handleItemClick(item: InboxItem) {
    if (item.unread) {
      markRead.mutate(item.itemId);
    }

    if (item.kind === 'record') {
      setRecordItem(item);
      return;
    }
    if (item.kind === 'wiki') {
      void navigate(`${ROUTES.portfolio}?tab=wiki`);
      return;
    }
    if (item.stockCode !== null) {
      void navigate(
        `${ROUTES.stockDetail(item.stockCode)}?${STOCK_DETAIL_AI_TAB_QUERY}`,
      );
    }
  }

  if (isPending) {
    return (
      <div className="flex flex-col gap-4 pt-1">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="pt-1.5">
        <p className="text-body-1 font-medium text-text-primary">
          알림함을 불러오지 못했어요
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-2.5 text-label font-medium text-text-primary underline underline-offset-3"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (data.items.length === 0) {
    return (
      <EmptyState
        title="아직 받은 소식이 없어요."
        description="종목을 담으면 확인할 것들을 여기에 모아둘게요."
      />
    );
  }

  return (
    <>
      <div className="flex flex-col divide-y divide-border">
        {data.items.map((item) => (
          <InboxItemRow
            key={item.itemId}
            item={item}
            onClick={handleItemClick}
          />
        ))}
      </div>
      <RecordSheet
        item={recordItem}
        submit={recordSubmit}
        onOpenChange={(open) => {
          if (!open) {
            setRecordItem(null);
          }
        }}
      />
    </>
  );
}
