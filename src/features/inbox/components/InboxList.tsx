import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';

import { useInboxItems } from '../api/useInboxItems';
import { useMarkInboxItemRead } from '../api/useMarkInboxItemRead';
import type { InboxItem } from '../model/types';

import { InboxItemRow } from './InboxItemRow';
import { RecordSheet } from './RecordSheet';

/**
 * 알림함 목록 (FINCH-49, ia.md §1 "알림함").
 *
 * 항목을 누르면 흐름은 셋으로 갈린다 —
 * - `record`(적어야 할 것) — "왜 담으셨나요?" 시트(`RecordSheet`, 프로토타입 `sheetRecord`)
 * - `wiki`(확인해야 할 것) — `/portfolio?tab=wiki` 로 **`push`** 이동(ia.md §1 "AI가
 *   이해한 나" 절 — 알림함에서 나가는 이동은 `push` 다. `replace` 로 하면 뒤로가기가
 *   알림함으로 돌아오지 못한다)
 * - `briefing`(읽을 것) — `/briefing` 으로 이동
 *
 * 여는 것과 무관하게 항목을 누르면 읽음 처리(`POST /inbox/{itemId}/read`, 추정)를
 * 함께 보낸다 — 실패해도 이동 자체는 막지 않는다.
 */
export function InboxList() {
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
      navigate(`${ROUTES.portfolio}?tab=wiki`);
      return;
    }
    navigate(ROUTES.briefing);
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
        onOpenChange={(open) => {
          if (!open) {
            setRecordItem(null);
          }
        }}
      />
    </>
  );
}
