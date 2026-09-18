import { formatAmount } from '@/shared/lib/formatNumber';
import { Skeleton } from '@/shared/ui/Skeleton';

import { formatCandleMonthDay, type TodayQuote } from '../lib/todayQuote';

/**
 * 격자와 자리표시자가 나눠 쓰는 뼈대 클래스. **두 판의 높이가 갈리면 자리표시자가
 * 제 일을 못 하므로** 한 곳에서만 적는다 (`StockTodayGridSkeleton` 참고).
 *
 * `SECTION_CLASS` 의 18px 은 탭 내용의 공통 위 여백이다(프로토타입 18px). 격자가
 * 탭 맨 위로 올라오면서 이 여백을 차트 묶음에서 넘겨받았다 — `StockChartTab` 참고.
 */
const SECTION_CLASS = 'mt-4.5';
const HEADER_ROW_CLASS = 'mb-3.5 flex items-baseline justify-between gap-3';
const GRID_CLASS = 'grid grid-cols-2 gap-x-5 gap-y-3.5';

/**
 * 차트 탭 맨 위 `오늘` 격자 (프로토타입 `isDtChart` 블록, 새 디코드 L1820–L1828).
 *
 * 2열 격자에 시가·고가·저가·거래량 넷이 들어간다. 실측값 — 칸 사이 가로 20px ·
 * 세로 14px, 라벨 `.cp`(13/18 `--t3`), 값 `.b1`(16/24) `font-weight:500` 에
 * 위 여백 2px. 섹션 머리는 `.sh`(아래 14px) + `.sht`(18px 700).
 *
 * **프로토타입은 이 격자를 차트 아래에 두지만 우리는 봉 종류 세그먼트 위에 둔다**
 * (FINCH-330, 2026-09-18). 격자는 화면이 어떤 봉 종류를 보고 있든 늘 일봉만
 * 본다(`StockChartTab` 참고). 그런데 차트 바로 아래에 있으면 차트에서 뽑아낸
 * 요약처럼 읽혀서, 세그먼트를 눌러도 네 숫자가 그대로인 것이 고장 난 것처럼 보였다.
 * 이 넷은 헤더의 현재가·등락과 같은 "오늘 한 장면" 이고 세그먼트·차트가 "기간의
 * 흐름" 이라, 순서를 바꿔 헤더 쪽에 붙였다. 경계를 세게 긋는 것(구분선·배경)으로는
 * 풀리지 않는 자리였다 — 이미 18px/700 섹션 제목이 서 있는데도 어색했다. 프로토타입
 * 과 `design.md` 의 위계 줄도 같은 MR 에서 고쳤다.
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
    <section className={SECTION_CLASS}>
      <div className={HEADER_ROW_CLASS}>
        <h2 className="min-w-0 text-section-title text-text-primary">
          {quote.isToday ? '오늘' : '마지막 거래일'}
        </h2>
        {!quote.isToday && (
          <span className="flex-none text-caption whitespace-nowrap text-text-muted">
            {formatCandleMonthDay(quote.date)}
          </span>
        )}
      </div>

      <dl className={GRID_CLASS}>
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

/** 자리표시자의 칸 넷. 글자가 없어 라벨이 필요 없으므로 `key` 로만 쓴다. */
const SKELETON_CELL_KEYS = ['open', 'high', 'low', 'volume'];

/**
 * 격자가 들어올 자리를 미리 잡아 두는 자리표시자.
 *
 * **격자가 세그먼트 위로 올라오면서 필요해졌다.** 차트 아래에 있을 때는 값이 늦게
 * 와도 아래로 늘어나기만 해서 티가 나지 않았는데, 위로 오면 도착하는 순간 세그먼트와
 * 차트를 통째로 밀어 내린다. 게다가 차트 탭은 캔들을 둘(보고 있는 봉 종류 · 일봉)
 * 따로 받으므로, 자리를 비워 두지 않으면 차트 자리표시자가 떠 있는 동안 한 번 더
 * 밀린다.
 *
 * 뼈대 클래스를 격자와 그대로 나눠 쓰고, 글자가 설 자리에는 그 줄 높이를 그대로 준
 * 막대를 둔다 — 제목 26px(`.sht` 18/26) · 라벨 18px(`.cp` 13/18) · 값 24px(`.b1`
 * 16/24) + 위 여백 2px. **폭은 눈대중이어도 되지만 높이는 아니다.** 높이가 어긋나면
 * 자리를 잡아 두는 의미가 없어진다.
 */
export function StockTodayGridSkeleton() {
  return (
    <section className={SECTION_CLASS} aria-hidden="true">
      <div className={HEADER_ROW_CLASS}>
        <Skeleton className="h-6.5 w-14" />
      </div>

      <div className={GRID_CLASS}>
        {SKELETON_CELL_KEYS.map((key) => (
          <div key={key}>
            <Skeleton className="h-4.5 w-8" />
            <Skeleton className="mt-0.5 h-6 w-20" />
          </div>
        ))}
      </div>
    </section>
  );
}
