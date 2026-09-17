import { Link } from 'react-router-dom';

import { isHttpError } from '@/shared/api';
import {
  formatSignedRate,
  getPriceDirection,
  type PriceDirection,
} from '@/shared/lib/formatNumber';
import type { AiBriefingItem } from '@/shared/types/ai/briefing';
import { AiGlyph } from '@/shared/ui/AiCard';
import { AiSegmentText } from '@/shared/ui/AiSegmentText';
import { AiStatus } from '@/shared/ui/AiStatus';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';
import { StockLogo } from '@/shared/ui/StockLogo';
import { NoValue } from '@/shared/ui/StockRow';

import { useHomeBriefing } from '../api/useHomeBriefing';
import { countBriefingEventTypes } from '../lib/briefingEventLabel';
import { isInternalDeeplink } from '../lib/internalDeeplink';
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
 *
 * ## 글자 크기를 토큰이 아니라 실측값으로 적은 이유
 *
 * 프로토타입 `isBriefing` 은 이 화면에만 쓰는 계단을 갖는다 — 12·11·14·19·16·13px.
 * 우리 타이포 토큰(`styles/index.css`)에는 12px·11px·19px 이 없고, 있는 값들도
 * 행간이 다르다(`text-caption` 13/18 vs 여기 13/19). 화면 하나 때문에 공용 토큰을
 * 늘리면 그 토큰을 쓰는 다른 화면이 함께 움직이므로, 여기서 실측값을 적는다.
 * 색과 등락색만은 토큰으로 참조한다(컨벤션 §6).
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

/** 섹션 라벨 (`핵심 소식` · `오늘의 다른 소식 N건`). 프로토타입 실측 12px/500/`--t3`. */
const SECTION_LABEL_CLASS =
  'text-[12px] font-medium tracking-[.01em] text-text-muted';

/**
 * 소식 한 건의 치수. 프로토타입은 1위(`briefTop`)와 나머지(`briefsRest`)를
 * 다른 계단으로 그린다 — 1위만 왼쪽에 2px 세로선을 두고 글자가 한 단계씩 크다.
 */
const ROW_STYLE = {
  top: {
    // padding 2px 0 4px 18px · border-left 2px --border2 · border-radius 1px
    shell: 'rounded-[1px] border-l-2 border-border-strong pt-0.5 pb-1 pl-4.5',
    head: 'mb-3.25',
    headGap: 'gap-2.5',
    rate: 'text-[14px]',
    summary: 'text-[19px] leading-[28px] tracking-[-.02em]',
    why: 'mt-3.25 text-[14px] leading-[21px]',
    meta: 'mt-3.25',
  },
  rest: {
    // padding 22px 0 24px. 프로토타입은 항목 사이에 구분선을 두지 않는다
    shell: 'pt-5.5 pb-6',
    head: 'mb-2.75',
    headGap: 'gap-2.25',
    rate: 'text-[13px]',
    summary: 'text-[16px] leading-[23px]',
    why: 'mt-2.25 text-[13px] leading-[19px]',
    meta: 'mt-2.25',
  },
} as const;

type RowVariant = keyof typeof ROW_STYLE;

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
  /**
   * 제목 아래 보조 한 줄 `정책 n · 공시 n · 실적 n` (프로토타입 `briefMix`).
   *
   * **빈 줄을 그리지 않는다.** 자리만 남기면 제목 아래 14px 이 이유 없이
   * 벌어진다 — 줄을 통째로 빼면 제목과 `핵심 소식` 사이 간격만 남고 화면이
   * 어색하지 않다. `countBriefingEventTypes` 가 이벤트가 하나도 없을 때(`items`
   * 전부 `eventType: null` 이거나 모르는 값)를 `undefined` 로 떨어뜨린다.
   */
  const briefMix = countBriefingEventTypes(items);

  return (
    <div className="pt-2">
      {/* 머리. 글리프는 `shared/ui/AiCard` 의 공용 정의를 그대로 쓴다 —
          design.md §3 "화면마다 다른 AI 아이콘을 임의로 혼용하지 않는다",
          §8.4 "AI Glyph 위치/크기 통일". 프로토타입은 이 자리에 22px 이미지
          자산을 쓰지만, 그러면 홈 카드(17px 마스크 글리프)와 다른 아이콘이 된다. */}
      <div className="mb-3.5 flex items-center gap-2 text-text-secondary">
        <AiGlyph />
        <span className="text-[12px] font-bold tracking-[.06em]">
          AI 데일리 브리핑
        </span>
      </div>
      <p className="text-title-2 tracking-[-.02em] text-text-primary">
        오늘 확인할 소식 {items.length}건
      </p>
      {briefMix === undefined ? null : (
        <p className="mt-3.5 text-[13px] text-text-muted">{briefMix}</p>
      )}

      {top === undefined ? null : (
        <div className="mt-9.5">
          <p className={`mb-3.5 ${SECTION_LABEL_CLASS}`}>핵심 소식</p>
          <BriefingRow item={top} factsOf={factsOf} variant="top" />
        </div>
      )}

      {rest.length === 0 ? null : (
        <div className="mt-10">
          <p className={`mb-1 ${SECTION_LABEL_CLASS}`}>
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
  variant = 'rest',
}: {
  item: AiBriefingItem;
  factsOf: (stockCode: string, item: AiBriefingItem) => BriefingStockFacts;
  variant?: RowVariant;
}) {
  const style = ROW_STYLE[variant];
  /**
   * 종목코드와 그 종목의 표시값을 **한 덩이로 묶는다.** 둘을 따로 두면 `facts` 가
   * 있을 때 `stockCode` 도 반드시 있다는 것을 타입이 모른다 — 뱃지가 종목코드로
   * 색을 고르게 되면서(FINCH-261) 그 자리에 `?? ''` 같은 군더더기가 붙는다.
   * 빈 문자열은 실제로 올 수 없는 값이라 적어 두면 다음 사람이 그 경우를 고민한다.
   */
  const stockCode = item.relatedTickers[0];
  const head: { stockCode: string; facts: BriefingStockFacts } | null =
    stockCode === undefined
      ? null
      : { stockCode, facts: factsOf(stockCode, item) };

  /**
   * **`deeplink` 를 검증하는 자리는 스키마가 아니라 여기다** (FINCH-324).
   *
   * `deeplink` 는 AI 서버가 만든 값이라(`ia.md` §2) 앱 밖 주소가 올 수 있고,
   * 그러면 `Link` 가 SPA 링크가 아니라 평범한 `<a href>` 로 그려 앱을 나간다
   * (`../lib/internalDeeplink` 주석).
   *
   * **그런데 `shared/types/ai/briefing.ts` 의 `z.string()` 을 좁히지 않았다.**
   * `items` 는 배열이라 원소 하나가 검증에 걸리면 `safeParse` 가 실패하고
   * **브리핑 응답 전체가 사라진다.** 링크 하나가 이상하다고 오늘 소식 네 건을
   * 통째로 감추는 것은 AI 가 준 정보를 우리가 버리는 것이다. 같은 자리를
   * 이미 세 번 겪었다 — 검색(FINCH-255) · 관심 종목(FINCH-265) ·
   * 시세 필드 하나로 종목 상세가 통째로 죽던 것(FINCH-314). 스키마는
   * 넓게 받고 **화면에서 링크만 걷는 쪽**이 그 셋의 결론이다.
   *
   * 걷었을 때 행을 지우지 않는 것도 같은 이유다. 소식 내용(제목·근거·시세)은
   * 그대로 두고 `Link` 를 `div` 로만 바꿔 **누를 수 없는 줄**로 만든다.
   * `shared/ui/AiCitationList` 가 `url` 이 없는 근거에 쓰는 것과 같은 방식이다.
   */
  const shellClass = `block ${style.shell}`;
  const body = (
    <>
      {head === null ? null : (
        <span className={`flex items-center ${style.head} ${style.headGap}`}>
          <StockLogo
            stockCode={head.stockCode}
            stockName={head.facts.stockName}
            size="sm"
          />
          {/* 이름과 `확인 필요` 를 한 덩이로 묶어 왼쪽에 붙인다. 이름에 `flex-1` 을
              주면 `확인 필요` 가 등락률 옆까지 밀려나고, 안 주면 긴 이름이 줄을
              넘친다. 프로토타입은 이름이 짧은 목업이라 그 갈림을 보여주지 않는다. */}
          <span className={`flex min-w-0 flex-1 items-center ${style.headGap}`}>
            <span className="truncate text-[14px] font-medium text-text-secondary">
              {head.facts.stockName}
            </span>
            {!head.facts.needCheck ? null : (
              <span className="flex-none text-[11px] font-semibold text-text-muted">
                확인 필요
              </span>
            )}
          </span>
          {head.facts.changeRate === undefined ? null : (
            <ChangeRate
              changeRate={head.facts.changeRate}
              className={`flex-none font-semibold ${style.rate}`}
            />
          )}
        </span>
      )}
      <span
        className={`block font-semibold text-pretty text-text-primary ${style.summary}`}
      >
        {item.title}
      </span>
      <span className={`block text-pretty text-text-secondary ${style.why}`}>
        <AiSegmentText segments={item.segments} />
      </span>
      {/* 메타 줄은 값이 있을 때만 만든다. 빼도 아래 여백은 다음 요소의 margin-top 이
          맡으므로 줄이 사라져도 행 사이가 좁아지지 않는다. */}
      {head?.facts.meta === undefined ? null : (
        <span
          className={`block text-[12px] leading-[17px] text-text-muted ${style.meta}`}
        >
          {head.facts.meta}
        </span>
      )}
    </>
  );

  if (!isInternalDeeplink(item.deeplink)) {
    return <div className={shellClass}>{body}</div>;
  }

  return (
    <Link to={item.deeplink} className={shellClass}>
      {body}
    </Link>
  );
}
