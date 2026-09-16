import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import {
  formatAmount,
  formatSignedAmountWithRate,
  formatSignedRate,
  getPriceDirection,
  type PriceDirection,
} from '@/shared/lib/formatNumber';

import { StockLogo } from './StockLogo';

/**
 * 종목 한 줄. 실제로 쓰는 곳은 셋이다(grep 으로 확인, 2026-09-16) —
 * 홈의 내 종목·관심 종목(`HoldingsWatchlistPreview`), 최근 본 종목
 * (`RecentStockList`), 검색 결과(`StockSearchResultList`). 포트폴리오 보유
 * (`HoldingsTab`)·브리핑 전체(`BriefingFullList`)·알림함(`InboxList`)은 각자
 * 독자 컴포넌트를 쓰고, 시장 랭킹 화면은 `design.md` 가 걷어내 코드에 없다.
 *
 * **이 목록이 이 컴포넌트를 고칠 때 얼마나 번지는지의 근거다.** 목록이 틀리면
 * 영향 범위를 잘못 재게 된다 — 오늘 실제로 사고가 났다(FINCH-312).
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
      /** 있으면 등락률과 한 줄로 합쳐 그린다(`formatSignedAmountWithRate`). 검색 결과가 이 모양이다 */
      changeAmount?: number | null;
    }
  | {
      kind: 'holding';
      /** `null` 이면 값 없음으로 그린다 (시세 없는 보유 종목 · apiSpec v0.8.2 §8.1) */
      evaluationAmount: number | null;
      evaluationProfitRate: number | null;
      /** 있으면 평가손익률과 한 줄로 합쳐 그린다(`formatSignedAmountWithRate`) */
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
   * `true` 면 종목명 옆에 `보유` 칩을 붙인다 (2026-09-16 결정, 관심 목록의
   * `WatchlistItem.held`). **선택 prop이라 기존 호출부는 영향이 없다.**
   * 등락색·종목 틴트를 쓰지 않는 중립 칩이다 — `SuspendedBadge` 와 같은 치수를
   * 공유한다(아래 `RowBadge`).
   */
  held?: boolean;
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

/**
 * 종목명 옆 중립 칩의 공용 치수. 프로토타입 `.tag` 치수(높이 24px · 좌우 8px)다.
 * 거래정지·보유가 이 치수를 함께 쓴다 — 새로 만들지 않고 이미 있던 자리를 읽었다.
 *
 * 면색은 `--color-surface-soft` 다. `--color-primary-soft` 와 값이 거의 같지만
 * 그쪽은 "선택된" 상태 하나에 쓰는 색이고(토큰 파일 주석), 이 칩들은 선택이
 * 아니라 종목이 놓인 상태를 알린다. 같은 회색으로 보여도 역할이 다르면 토큰도 다르다.
 */
function RowBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-6 flex-none items-center rounded-tag bg-surface-soft px-2 text-caption font-medium text-text-secondary">
      {children}
    </span>
  );
}

/**
 * 거래정지 뱃지. 프로토타입은 이 뱃지에 상승 적색을 쓰는데, 컨벤션 §11 이 등락색을
 * 등락 표시 밖에서 쓰지 못하게 한다 — 떨어진 종목에 적색 뱃지가 붙으면 오독된다.
 */
function SuspendedBadge() {
  return <RowBadge>거래정지</RowBadge>;
}

/**
 * 보유 칩 (2026-09-16 결정). 관심 목록에서 이미 보유한 종목을 표시한다 —
 * 전에는 보조 줄에 `{종목코드} · 보유 중` 문자열로 붙어 있었다.
 * 등락색·종목 틴트를 쓰지 않는다 — 등락색은 숫자 영역 전용이고(컨벤션 §11),
 * 종목 틴트는 "이 종목" 을 뜻하는 색이라 상태 칩에 쓰면 뜻이 겹친다.
 */
function HeldBadge() {
  return <RowBadge>보유</RowBadge>;
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
  held = false,
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

  // 등락색은 이 줄에만 붙는다. 행 전체를 칠하지 않는다 (컨벤션 §11).
  const changeColorClass =
    rateValue === null
      ? 'text-text-secondary'
      : DIRECTION_TEXT_CLASS[getPriceDirection(rateValue)];
  // 등락액이 함께 나와 문자열이 길어지면 프로토타입처럼 한 단계 작은 글자를 쓴다.
  const changeSizeClass = diffValue === null ? 'text-label' : 'text-caption';
  const changeClass = `${changeSizeClass} font-medium ${changeColorClass}`;

  const content = (
    <>
      {rank === undefined ? null : (
        <span className="w-4.5 flex-none text-caption text-text-secondary tabular-nums">
          {rank}
        </span>
      )}
      <StockLogo stockCode={stockCode} stockName={stockName} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.75">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-body-1 font-medium text-text-primary">
            {stockName}
          </span>
          {suspended ? <SuspendedBadge /> : null}
          {held ? <HeldBadge /> : null}
        </span>
        {sub === undefined ? null : (
          <span className="truncate text-caption text-text-secondary">
            {sub}
          </span>
        )}
      </span>
      <span className="flex flex-none flex-col items-end gap-0.75 tabular-nums">
        <span className="text-body-1 font-semibold text-text-primary">
          {amount === null ? (
            <NoValue label="시세 없음" />
          ) : (
            formatAmount(amount)
          )}
        </span>
        {/*
          손익 한 줄(2026-09-16 결정, `formatSignedAmountWithRate`). 예전에는
          금액·비율을 별도 span 둘로 그려 세로로 쌓였다(FINCH-291 의 여섯 호출부
          통일에서 이 행만 빠졌다). 값 없음 갈래는 셋을 그대로 지킨다 —
          rateValue===null(등락 자체가 없음) · diffValue===null(비율만 있고
          변동액은 없음, `RecentStock`처럼 changeAmount 가 없는 스키마) ·
          둘 다 있음(병합). `unit` 을 빈 문자열로 넘기는 이유는 위 금액 줄도
          `formatAmount`(원 생략)를 쓰기 때문이다 — 폭이 좁은 목록 행이라
          단위를 생략하는 자리다(`formatSignedAmountWithRate` 주석 참고).
        */}
        <span className={changeClass}>
          {rateValue === null ? (
            <NoValue label={suspended ? '거래정지로 등락 없음' : '등락 없음'} />
          ) : diffValue === null ? (
            formatSignedRate(rateValue)
          ) : (
            formatSignedAmountWithRate(diffValue, rateValue, '')
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
