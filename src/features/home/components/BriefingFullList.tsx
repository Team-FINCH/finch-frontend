import { Link } from 'react-router-dom';

import { isHttpError } from '@/shared/api';
import type { AiBriefingItem } from '@/shared/types/ai/briefing';
import { AiSegmentText } from '@/shared/ui/AiSegmentText';
import { AiStatus } from '@/shared/ui/AiStatus';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';

import { useHomeBriefing } from '../api/useHomeBriefing';
import { briefingCategoryLabel } from '../lib/briefingCategoryLabel';

/**
 * 브리핑 전체 화면 본문 (ia.md §4 "1번 슬롯 — 브리핑은 블록 하나에 항목 최대
 * 4건이다", 프로토타입 `isBriefing` 블록 — "핵심 소식"(1위) + "오늘의 다른
 * 소식"(나머지)).
 *
 * **피드백을 붙이지 않는다.** `BriefingSection.tsx` 머리 주석과 같은 이유 —
 * 프로토타입의 실제 피드백 UI 셋에 브리핑이 없다.
 */
export function BriefingFullList() {
  const briefing = useHomeBriefing();

  if (briefing.isPending) {
    return (
      <div className="flex flex-col gap-4 pt-2">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (briefing.isError) {
    const code = isHttpError(briefing.error)
      ? (briefing.error.code ?? undefined)
      : undefined;

    return (
      <AiStatus
        code={code}
        title="브리핑을 불러오지 못했어요"
        description="잠시 후 다시 시도해 주세요."
        onRetry={() => briefing.refetch()}
      />
    );
  }

  const { items } = briefing.data.content;

  if (items.length === 0) {
    return (
      <EmptyState
        className="pt-17.5"
        title="오늘은 모을 소식이 없어요."
        description="보유·관심 종목에 새 소식이 생기면 여기 모아둘게요."
      />
    );
  }

  const sorted = [...items].sort((a, b) => a.rank - b.rank);
  const [top, ...rest] = sorted;

  return (
    <div className="pt-2">
      <div className="flex items-center gap-2 pb-3.5">
        <span className="text-caption font-bold tracking-[.06em] text-text-secondary">
          AI 데일리 브리핑
        </span>
      </div>
      <p className="text-title-2 text-text-primary">
        오늘 확인할 소식 {items.length}건
      </p>

      {top === undefined ? null : (
        <div className="mt-9.5">
          <p className="mb-3.5 text-caption font-medium text-text-muted">
            핵심 소식
          </p>
          <BriefingRow item={top} emphasized />
        </div>
      )}

      {rest.length === 0 ? null : (
        <div className="mt-10 divide-y divide-border">
          <p className="mb-1 text-caption font-medium text-text-muted">
            오늘의 다른 소식 {rest.length}건
          </p>
          {rest.map((item) => (
            <BriefingRow key={item.rank} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function BriefingRow({
  item,
  emphasized = false,
}: {
  item: AiBriefingItem;
  emphasized?: boolean;
}) {
  const relatedTicker = item.relatedTickers[0];

  return (
    <div
      className={
        emphasized ? 'border-l-2 border-border-strong pl-4.5' : 'py-5.5'
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-caption font-medium text-text-secondary">
          {briefingCategoryLabel(item.category)}
        </span>
      </div>
      <p
        className={
          emphasized
            ? 'text-title-3 text-pretty text-text-primary'
            : 'text-body-1 font-semibold text-pretty text-text-primary'
        }
      >
        {item.title}
      </p>
      <p className="mt-3 text-body-2 text-pretty text-text-secondary">
        <AiSegmentText segments={item.segments} />
      </p>
      {relatedTicker === undefined ? null : (
        <Link
          to={item.deeplink}
          className="mt-3 inline-block text-caption font-medium text-text-primary underline underline-offset-3"
        >
          관련 종목 보기
        </Link>
      )}
    </div>
  );
}
