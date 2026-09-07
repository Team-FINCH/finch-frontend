import { useNavigate } from 'react-router-dom';

import { formatKstTime } from '@/shared/lib/formatDate';
import {
  formatAmount,
  formatSignedAmount,
  formatSignedRate,
  getPriceDirection,
  type PriceDirection,
} from '@/shared/lib/formatNumber';
import {
  type StockDetailResponse,
  type StockQuote,
} from '@/shared/types/stock';
import { hasQuoteValues } from '@/shared/types/stock';

/**
 * 종목 상세 머리 — 뒤로가기 · 종목명 · 관심 토글 · 현재가 · 등락 · 기준 시각.
 * (프로토타입 `isDetail` 블록의 `.nav` 와 그 아래 `.d36` 묶음.)
 *
 * **시세는 상세 응답이 아니라 폴링 응답을 우선한다.** `GET /stocks/{stockCode}` 는
 * 화면을 열 때 한 번 오고, 그 뒤 값은 `GET /stocks/{stockCode}/price` 가 갱신한다
 * (apiSpec §5.4). 둘 다 있으면 새 쪽을 그린다.
 *
 * **값이 없는 것은 에러가 아니다** (contracts C42). 캐시 미스면 가격 3필드가 전부
 * `null` 로 오므로 `hasQuoteValues` 로 갈라 가격 자리를 비운다.
 *
 * 등락색은 숫자 두 줄에만 붙는다. 헤더 전체를 칠하지 않는다 (컨벤션 §11).
 */

const DIRECTION_TEXT_CLASS: Record<PriceDirection, string> = {
  rise: 'text-stock-up',
  fall: 'text-stock-down',
  flat: 'text-stock-neutral',
};

const MARKET_LABEL: Record<string, string> = {
  KOSPI: '코스피',
  KOSDAQ: '코스닥',
};

type StockDetailHeaderProps = {
  detail: StockDetailResponse;
  /** 폴링으로 받은 최신 시세. 아직 없으면 상세 응답의 값을 쓴다. */
  quote?: StockQuote;
  onToggleWatch: () => void;
  isTogglePending: boolean;
};

export function StockDetailHeader({
  detail,
  quote,
  onToggleWatch,
  isTogglePending,
}: StockDetailHeaderProps) {
  const navigate = useNavigate();

  // 폴링 값이 있고 실제 숫자가 실려 있을 때만 갈아끼운다.
  const live = quote !== undefined && hasQuoteValues(quote) ? quote : null;
  const currentPrice = live?.currentPrice ?? detail.currentPrice;
  const changeAmount = live?.changeAmount ?? detail.changeAmount;
  const changeRate = live?.changeRate ?? detail.changeRate;
  const asOf = live?.asOf ?? detail.asOf;

  // 캐시 미스로 값 자체가 없는 상태. 마지막 값도 없어서 가격 자리를 비운다.
  const hasNoValue =
    quote !== undefined && !hasQuoteValues(quote) && quote.stale;

  const changeClass = DIRECTION_TEXT_CLASS[getPriceDirection(changeRate)];

  return (
    <header>
      <div className="flex items-start gap-1 pt-1.5">
        <button
          type="button"
          onClick={() => void navigate(-1)}
          aria-label="뒤로 가기"
          className="flex size-11 flex-none items-center justify-center rounded-12 text-title-2 leading-none text-text-primary active:bg-primary-soft"
        >
          ‹
        </button>
        <span className="flex min-w-0 flex-1 flex-col gap-0.75 pt-2.25">
          <span className="truncate text-title-3 font-bold text-text-primary">
            {detail.stockName}
          </span>
          <span className="text-caption text-text-muted">
            {detail.stockCode} · {MARKET_LABEL[detail.market] ?? detail.market}
          </span>
        </span>
        <button
          type="button"
          onClick={onToggleWatch}
          disabled={isTogglePending}
          aria-pressed={detail.watched}
          aria-label={detail.watched ? '관심 종목 해제' : '관심 종목 담기'}
          className={`flex size-11 flex-none items-center justify-center rounded-12 text-title-3 leading-none active:bg-primary-soft disabled:opacity-40 ${
            detail.watched ? 'text-text-primary' : 'text-text-muted'
          }`}
        >
          {detail.watched ? '★' : '☆'}
        </button>
      </div>

      <div className="pt-3.5">
        {hasNoValue ? (
          <p className="text-title-2 text-text-secondary">
            시세를 불러오지 못했어요
          </p>
        ) : (
          <>
            <p className="text-display text-text-primary tabular-nums">
              {formatAmount(currentPrice)}
              <span className="text-title-2 font-medium text-text-secondary">
                {' '}
                원
              </span>
            </p>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <span
                className={`text-body-1 font-medium whitespace-nowrap tabular-nums ${changeClass}`}
              >
                {formatSignedAmount(changeAmount)}원 ·{' '}
                {formatSignedRate(changeRate)}
              </span>
              <span className="text-[12px] whitespace-nowrap text-text-muted">
                {formatKstTime(asOf)} 기준
              </span>
            </div>
          </>
        )}

        {/*
          시세 지연 표시 (contracts C42). `stale` 이면 마지막 수신 값이 그려지고 있다.

          TODO(계약): `stale` 허용 시간과 그에 따른 주문 차단 기준이 미확정이다.
          지금은 서버가 준 `stale` 불리언만 그대로 노출하고 임계 시간으로 판정하지
          않는다. 값이 정해지면 `shared/config` 상수로 두고 여기서 참조한다
          (ia.md §7 "시세 갱신 주기와 stale 임계값은 코드에 숫자로 박지 않는다").
          — 근거: contracts P10 / 스프린트 0 결정
        */}
        {quote?.stale === true && !hasNoValue && (
          <p className="mt-2 text-caption text-text-muted">
            시세가 지연되고 있어요
          </p>
        )}

        {detail.suspended && (
          <div className="mt-4 rounded-sm bg-surface-soft p-4">
            <p className="text-body-2 font-medium text-text-primary">
              거래정지 종목이에요
            </p>
            {detail.suspendedReason !== null && (
              <p className="mt-1 text-caption text-text-secondary">
                {detail.suspendedReason}
              </p>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
