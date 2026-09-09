import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import {
  formatAmount,
  formatSignedAmount,
  formatSignedRate,
  getPriceDirection,
  type PriceDirection,
} from '@/shared/lib/formatNumber';

/**
 * 종목 한 줄. 홈의 내 종목 · 검색 결과 · 시장 랭킹 · 관심 목록 · 포트폴리오 보유 ·
 * 브리핑 전체 · 알림함이 같은 행을 쓴다.
 *
 * 치수는 프로토타입 `prototype/screen/finch-prototype.html` 의 `.row`·`.th` 에서 읽었다 —
 * 행 최소 높이 72px · 안쪽 여백 14px 0 · 요소 간격 12px · 이니셜 뱃지 44x44 반경 14px.
 *
 * **표기 규약** (frontConvention §11)
 * - 등락에는 항상 부호를 붙인다. 삼각형(▲▼)은 쓰지 않는다
 * - 등락색은 숫자 영역에만 쓴다. 행 전체를 칠하지 않는다
 * - 숫자는 고정폭(`tabular-nums`)이다. 시세가 갱신돼도 자리가 흔들리지 않는다
 * - `stockCode` 는 6자리 문자열이다. 숫자로 다루면 `005930` 의 앞 `0` 이 사라진다
 */

/** 값이 없는 자리. 거래정지 종목의 등락, 시세 캐시 미스가 여기 걸린다. */
const NO_VALUE = '—';

/**
 * 등락 방향을 의미 토큰 클래스로 바꾼다. 색 이름을 직접 쓰지 않는다 (컨벤션 §6).
 * 보합은 `--color-stock-neutral` 이다. 색도 부호도 중립이다.
 */
const DIRECTION_TEXT_CLASS: Record<PriceDirection, string> = {
  rise: 'text-stock-up',
  fall: 'text-stock-down',
  flat: 'text-stock-neutral',
};

/**
 * 오른쪽 숫자 열. **같은 자리에 서로 다른 스키마의 필드가 들어간다.**
 * 시세 계열은 `StockSummary`·`WatchlistItem`·`RecentStock`(`shared/types/stock.ts`),
 * 보유 계열은 `Holding`(`shared/types/portfolio.ts`)이다.
 * 필드 이름을 하나로 뭉개면 어느 값이 그려지고 있는지 호출부에서 알 수 없어져서
 * 스키마 이름을 그대로 두고 판별자로 갈랐다.
 *
 * 비율은 둘 다 **백분율**이다 (`Percent`, contracts C18). 100 을 곱하지 않는다.
 */
export type StockRowFigures =
  | {
      kind: 'quote';
      /** `null` 이면 값 없음으로 그린다 (`StockQuote` 캐시 미스 · apiSpec §5.4) */
      currentPrice: number | null;
      changeRate: number | null;
      /** 있으면 등락률 위에 한 줄 더 붙는다. 검색 결과가 이 모양이다 */
      changeAmount?: number | null;
    }
  | {
      kind: 'holding';
      /** `null` 이면 값 없음으로 그린다 (시세 없는 보유 종목 · apiSpec v0.8.2 §8.1) */
      evaluationAmount: number | null;
      evaluationProfitRate: number | null;
      evaluationProfit?: number | null;
    };

type StockRowProps = {
  /** 6자리 문자열 (contracts C19). 이니셜 뱃지 대체 텍스트와 링크에 쓴다 */
  stockCode: string;
  stockName: string;
  figures: StockRowFigures;
  /**
   * `true` 면 뱃지를 붙이고 등락을 `—` 로 그린다 (contracts C46).
   * 색으로만 알리지 않으려고 문구 뱃지를 함께 쓴다.
   */
  suspended?: boolean;
  /**
   * 종목명 아래 보조 한 줄. 부르는 쪽이 만들어 넘긴다 —
   * 보유 목록은 `수량 · 평단`, 검색 결과는 `종목코드 · 시장`, 관심 목록은 힌트 문장이라
   * 행이 알 수 없다. 포맷은 `shared/lib/formatNumber` 를 쓴다.
   */
  sub?: ReactNode;
  /**
   * 시장 랭킹의 순위. 있으면 왼쪽 끝에 붙는다.
   * 프로토타입은 `--t3`(흰 배경 대비 3.90)를 쓰지만 순위는 읽어야 하는 정보라
   * `--color-text-secondary`(6.73)로 올렸다 (토큰 파일 주석 · design.md §12).
   */
  rank?: number;
  /** 누르면 이동. `to` 와 `onClick` 이 없으면 정적 행이다 */
  to?: string;
  onClick?: () => void;
  className?: string;
};

/** 이니셜 뱃지 (`.th`). 종목별 틴트가 프로토타입에 있지만 API 에 근거가 없어 중립으로 둔다. */
function InitialBadge({ stockName }: { stockName: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-11 flex-none items-center justify-center rounded-md bg-surface-soft text-body-1 font-bold text-text-secondary"
    >
      {stockName.slice(0, 1)}
    </span>
  );
}

/**
 * 거래정지 뱃지. 프로토타입 `.tag` 치수(높이 24px · 좌우 8px)를 쓰되 색은 중립이다.
 * 프로토타입은 이 뱃지에 상승 적색을 쓰는데, 컨벤션 §11 이 등락색을 등락 표시 밖에서
 * 쓰지 못하게 한다 — 떨어진 종목에 적색 뱃지가 붙으면 오독된다.
 */
function SuspendedBadge() {
  return (
    <span className="inline-flex h-6 flex-none items-center rounded-tag bg-primary-soft px-2 text-caption font-medium text-text-secondary">
      거래정지
    </span>
  );
}

/** 값이 없는 자리. 색만으로 알리지 않으려고 화면 낭독용 문구를 함께 둔다. */
export function NoValue({ label }: { label: string }) {
  return (
    <>
      <span aria-hidden="true">{NO_VALUE}</span>
      <span className="sr-only">{label}</span>
    </>
  );
}

function readFigures(figures: StockRowFigures) {
  if (figures.kind === 'holding') {
    return {
      amount: figures.evaluationAmount,
      rate: figures.evaluationProfitRate,
      diff: figures.evaluationProfit ?? null,
    };
  }
  return {
    amount: figures.currentPrice,
    rate: figures.changeRate,
    diff: figures.changeAmount ?? null,
  };
}

/**
 * 행 높이 72px 은 터치 영역 44px 기준을 넉넉히 넘는다 (design.md §12).
 * 반경 12px 은 누를 때 잠깐 깔리는 배경에만 보인다. `--radius-md`(14px)와 다른
 * 값이라 `rounded-md`로 끌어오지 않고 `rounded-12`를 쓴다.
 */
const ROW_CLASS =
  'flex w-full min-h-18 items-center gap-3 rounded-12 py-3.5 text-left ' +
  'transition-colors duration-(--motion-fast) ease-standard active:bg-primary-soft';

export function StockRow({
  stockCode,
  stockName,
  figures,
  suspended = false,
  sub,
  rank,
  to,
  onClick,
  className = '',
}: StockRowProps) {
  const { amount, rate, diff } = readFigures(figures);

  // 거래정지 종목은 등락을 계산하지 않는다. 마지막 값이 남아 있어도 지금 등락이 아니다.
  const rateValue = suspended ? null : rate;
  const diffValue = rateValue === null ? null : diff;

  // 등락색은 이 두 줄에만 붙는다. 행 전체를 칠하지 않는다 (컨벤션 §11).
  const changeColorClass =
    rateValue === null
      ? 'text-text-secondary'
      : DIRECTION_TEXT_CLASS[getPriceDirection(rateValue)];
  // 등락액이 함께 나오면 두 줄이 되므로 프로토타입처럼 한 단계 작은 글자를 쓴다.
  const changeSizeClass = diffValue === null ? 'text-label' : 'text-caption';
  const changeClass = `${changeSizeClass} font-medium ${changeColorClass}`;

  const content = (
    <>
      {rank === undefined ? null : (
        <span className="w-4.5 flex-none text-caption text-text-secondary tabular-nums">
          {rank}
        </span>
      )}
      <InitialBadge stockName={stockName} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.75">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-body-1 font-medium text-text-primary">
            {stockName}
          </span>
          {suspended ? <SuspendedBadge /> : null}
        </span>
        {sub === undefined ? null : (
          <span className="truncate text-caption text-text-secondary">
            {sub}
          </span>
        )}
      </span>
      <span
        className={`flex flex-none flex-col items-end tabular-nums ${
          diffValue === null ? 'gap-0.75' : 'gap-0.5'
        }`}
      >
        <span className="text-body-1 font-semibold text-text-primary">
          {amount === null ? (
            <NoValue label="시세 없음" />
          ) : (
            formatAmount(amount)
          )}
        </span>
        {diffValue === null ? null : (
          <span className={changeClass}>{formatSignedAmount(diffValue)}</span>
        )}
        <span className={changeClass}>
          {rateValue === null ? (
            <NoValue label={suspended ? '거래정지로 등락 없음' : '등락 없음'} />
          ) : (
            formatSignedRate(rateValue)
          )}
        </span>
      </span>
    </>
  );

  const rowClassName = `${ROW_CLASS} ${className}`;

  if (to !== undefined) {
    return (
      <Link to={to} className={rowClassName} data-stock-code={stockCode}>
        {content}
      </Link>
    );
  }

  if (onClick !== undefined) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={rowClassName}
        data-stock-code={stockCode}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={rowClassName} data-stock-code={stockCode}>
      {content}
    </div>
  );
}
