import { formatAmount } from '@/shared/lib/formatNumber';

import { formatCandleMonthDay, type TodayQuote } from '../lib/todayQuote';

/**
 * 차트 아래 `오늘` 격자 (프로토타입 `isDtChart` 블록, 새 디코드 L1820–L1828).
 *
 * 2열 격자에 시가·고가·저가·거래량 넷이 들어간다. 실측값 — 칸 사이 가로 20px ·
 * 세로 14px, 라벨 `.cp`(13/18 `--t3`), 값 `.b1`(16/24) `font-weight:500` 에
 * 위 여백 2px. 섹션 머리는 `.sh`(아래 14px) + `.sht`(18px 700).
 *
 * **고가·저가의 색은 등락이 아니라 자리에 붙는다.** 프로토타입이 `.b1 up` ·
 * `.b1 dn` 을 클래스로 박아 뒀다 — 고가는 언제나 상승색(적), 저가는 언제나
 * 하락색(청)이다. 그날 주가가 올랐는지 내렸는지와 무관하다. 그래서
 * `getPriceDirection` 을 거치지 않는다. 시가·거래량은 기본 글자색이다.
 *
 * **값에 단위를 붙이지 않는다.** 프로토타입이 `KRW()` 로 천 단위 구분 기호만
 * 찍는다(`94,376`). 거래량은 애초에 원이 아니라 주 수라 같은 포맷을 쓴다.
 *
 * **제목이 둘이다.** 마지막 봉이 오늘이면 `오늘`, 아니면 `마지막 거래일` +
 * 오른쪽에 그 날짜다. 장 전·휴장일에는 오늘 봉이 아예 실려 오지 않아
 * (apiSpec §5.3 "프론트는 마지막 봉이 오늘이라고 가정하지 않는다") 마지막
 * 거래일 봉이 마지막에 남는데, 그것에 `오늘` 이라고 적으면 틀린 값이 된다.
 * 날짜 칸은 프로토타입 `.sh` 가 이미 갖고 있는 오른쪽 슬롯(`.sh>.cp`)이다 —
 * 새 구조를 만든 것이 아니다.
 */
type StockTodayGridProps = {
  quote: TodayQuote;
};

export function StockTodayGrid({ quote }: StockTodayGridProps) {
  return (
    <section className="mt-8 pt-2">
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <h2 className="min-w-0 text-section-title text-text-primary">
          {quote.isToday ? '오늘' : '마지막 거래일'}
        </h2>
        {!quote.isToday && (
          <span className="flex-none text-caption whitespace-nowrap text-text-muted">
            {formatCandleMonthDay(quote.date)}
          </span>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-5 gap-y-3.5">
        <div>
          <dt className="text-caption text-text-muted">시가</dt>
          <dd className="mt-0.5 text-body-1 font-medium text-text-primary">
            {formatAmount(quote.open)}
          </dd>
        </div>
        <div>
          <dt className="text-caption text-text-muted">고가</dt>
          <dd className="mt-0.5 text-body-1 font-medium text-stock-up">
            {formatAmount(quote.high)}
          </dd>
        </div>
        <div>
          <dt className="text-caption text-text-muted">저가</dt>
          <dd className="mt-0.5 text-body-1 font-medium text-stock-down">
            {formatAmount(quote.low)}
          </dd>
        </div>
        <div>
          <dt className="text-caption text-text-muted">거래량</dt>
          <dd className="mt-0.5 text-body-1 font-medium text-text-primary">
            {formatAmount(quote.volume)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
