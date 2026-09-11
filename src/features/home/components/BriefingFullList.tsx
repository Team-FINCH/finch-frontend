import { Link } from 'react-router-dom';

import { isHttpError } from '@/shared/api';
import {
  formatSignedRate,
  getPriceDirection,
  type PriceDirection,
} from '@/shared/lib/formatNumber';
import type { AiBriefingItem } from '@/shared/types/ai/briefing';
import { AiSegmentText } from '@/shared/ui/AiSegmentText';
import { AiStatus } from '@/shared/ui/AiStatus';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';
import { NoValue } from '@/shared/ui/StockRow';

import { useHomeBriefing } from '../api/useHomeBriefing';
import {
  useBriefingStockFacts,
  type BriefingStockFacts,
} from '../model/useBriefingStockFacts';

/**
 * 브리핑 전체 화면 본문 (ia.md §4 "1번 슬롯 — 브리핑은 블록 하나에 항목 최대
 * 4건이다", 프로토타입 `isBriefing` 블록 — "핵심 소식"(1위) + "오늘의 다른
 * 소식"(나머지)).
 *
 * **피드백을 붙이지 않는다.** `BriefingSection.tsx` 머리 주석과 같은 이유 —
 * 프로토타입의 실제 피드백 UI 셋에 브리핑이 없다.
 */

/**
 * 훅에 넘길 빈 목록. 모듈 밖에 두어야 참조가 같다 — 안에서 `[]` 를 새로 만들면
 * 브리핑이 아직 안 온 동안 매 렌더마다 `useMemo` 의 의존성이 바뀐다.
 */
const NO_ITEMS: readonly AiBriefingItem[] = [];

/** 등락 방향 → 의미 토큰 (컨벤션 §6 · §11). 색 이름을 직접 쓰지 않는다. */
const DIRECTION_TEXT_CLASS: Record<PriceDirection, string> = {
  rise: 'text-stock-up',
  fall: 'text-stock-down',
  flat: 'text-stock-neutral',
};

export function BriefingFullList() {
  const briefing = useHomeBriefing();
  const items = briefing.data?.content.items ?? NO_ITEMS;
  // 훅은 조건부로 부를 수 없어 early return 앞에 둔다. 항목이 없으면 종목코드도
  // 없어서 시세를 부르지 않는다(`useHomeStockQuotes` 의 `enabled`).
  const factsOf = useBriefingStockFacts(items);

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
          <BriefingRow item={top} factsOf={factsOf} emphasized />
        </div>
      )}

      {rest.length === 0 ? null : (
        <div className="mt-10 divide-y divide-border">
          <p className="mb-1 text-caption font-medium text-text-muted">
            오늘의 다른 소식 {rest.length}건
          </p>
          {rest.map((item) => (
            <BriefingRow key={item.rank} item={item} factsOf={factsOf} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 종목 이니셜 뱃지. `shared/ui/StockRow` 의 것과 규칙은 같지만(틴트를 쓰지 않는다 —
 * 종목별 틴트가 프로토타입에 있어도 API 에 근거가 없다) 치수가 다르다.
 * 목록 행은 44px 이고 브리핑 행 머리는 22px 이라 그쪽을 끌어다 쓸 수 없다.
 */
function InitialBadge({ stockName }: { stockName: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-5.5 flex-none items-center justify-center rounded-xs bg-surface-soft text-[11px] font-bold text-text-secondary"
    >
      {stockName.slice(0, 1)}
    </span>
  );
}

/**
 * 행 머리의 등락률. 세 상태를 가른다 —
 * 값이 있으면 부호와 등락색을 붙이고, `null`(거래정지·시세 없음)이면 `—` 를 그리고,
 * `undefined`(아직 모름)면 자리를 아예 만들지 않는다.
 */
function ChangeRate({
  changeRate,
  className,
}: {
  changeRate: number | null;
  className: string;
}) {
  if (changeRate === null) {
    return (
      <span className={`${className} text-text-secondary`}>
        <NoValue label="등락 없음" />
      </span>
    );
  }

  return (
    <span
      className={`${className} ${DIRECTION_TEXT_CLASS[getPriceDirection(changeRate)]} tabular-nums`}
    >
      {formatSignedRate(changeRate)}
    </span>
  );
}

/**
 * 소식 한 건. 프로토타입은 행 머리에 **종목명 · 확인 필요 · 등락률**을 한 줄로 둔다
 * (`briefTop`·`briefsRest`). 이전 판은 그 자리에 `category` 라벨 하나만 두고 본문
 * 아래에 "관련 종목 보기" 링크를 달았는데, 프로토타입은 행 전체가 눌리는 버튼이라
 * 링크를 따로 두지 않는다.
 *
 * 가리키는 종목이 없으면(`relatedTickers` 가 빈 배열) 행 머리를 통째로 뺀다 —
 * 이름도 시세도 종목코드에서 나오므로 그릴 것이 남지 않는다.
 */
function BriefingRow({
  item,
  factsOf,
  emphasized = false,
}: {
  item: AiBriefingItem;
  factsOf: (stockCode: string) => BriefingStockFacts;
  emphasized?: boolean;
}) {
  const stockCode = item.relatedTickers[0];
  const facts: BriefingStockFacts | undefined =
    stockCode === undefined ? undefined : factsOf(stockCode);

  return (
    <Link
      to={item.deeplink}
      className={`block ${
        emphasized ? 'border-l-2 border-border-strong pl-4.5' : 'py-5.5'
      }`}
    >
      {facts === undefined ? null : (
        <span className="mb-3 flex items-center gap-2.5">
          <InitialBadge stockName={facts.stockName} />
          <span className="min-w-0 flex-1 truncate text-caption font-medium text-text-secondary">
            {facts.stockName}
          </span>
          {facts.changeRate === undefined ? null : (
            <ChangeRate
              changeRate={facts.changeRate}
              className="flex-none text-caption font-semibold"
            />
          )}
        </span>
      )}
      <span
        className={`block ${
          emphasized
            ? 'text-title-3 text-pretty text-text-primary'
            : 'text-body-1 font-semibold text-pretty text-text-primary'
        }`}
      >
        {item.title}
      </span>
      <span className="mt-3 block text-body-2 text-pretty text-text-secondary">
        <AiSegmentText segments={item.segments} />
      </span>
    </Link>
  );
}
