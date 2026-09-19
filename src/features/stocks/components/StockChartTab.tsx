import { useState } from 'react';

import { formatAmount } from '@/shared/lib/formatNumber';
import { type CandleInterval } from '@/shared/types/stock';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';
import { SoftBox, SoftBoxRow } from '@/shared/ui/SoftBox';
import { NoValue } from '@/shared/ui/StockRow';

import { useCandles } from '../api/useCandles';
import { selectTodayQuote } from '../lib/todayQuote';

import { CandleChart, CHART_HEIGHT_CLASS } from './CandleChart';
import { ChartPeriodSegment } from './ChartPeriodSegment';
import { StockTodayGrid, StockTodayGridSkeleton } from './StockTodayGrid';

/**
 * 차트 탭 (프로토타입 `isDtChart` 블록, 새 디코드 L1748–L1830).
 *
 * 위에서부터 세 묶음이다 — `오늘` 격자 · 봉 종류 세그먼트 · 캔들 차트.
 * 그리고 거래정지 종목은 **차트와 기간 탭을 아예 그리지 않는다**
 * (`d.tradableChart`, 새 디코드 L1749–L1761).
 *
 * **`내 보유 상세` 섹션은 걷어냈다(FINCH-301, 2026-09-16).** 프로토타입
 * 새 디코드 L1819–L1828 에 있었지만, 보여주던 세 값 — 보유 수량·평균 매수가·
 * 평가손익 — 이 껍데기의 요약 카드(`StockHoldingBox`)와 정확히 같아 중복이었다.
 * 앵커 `hold-detail` 과, 그 카드를 누르면 여기로 스크롤하던 `onPress`(프로토타입
 * `scrollToHold`)도 도착지가 없어졌으므로 함께 걷어냈다 — `StockHoldingBox` 참고.
 *
 * **`오늘` 격자는 봉 종류 탭과 무관하게 일봉을 따로 구독한다.** `GET
 * /stocks/{stockCode}` 응답에는 시가·고가·저가·거래량이 없지만(apiSpec §5.2 는
 * `currentPrice`·`previousClose`·`changeAmount`·`changeRate` 만 준다) 캔들
 * 응답(§5.3)의 봉이 넷을 다 갖고 있고, §5.3 "진행 중인 당일 봉" 이 장중의 마지막
 * 봉은 **현재가 응답과 같은 출처의 그날 값**이라고 못박았다. 그런데 주·월봉의
 * 마지막 봉은 이번 주·이번 달을 묶은 값이라(`../lib/todayQuote.ts` 참고) 이
 * 격자에는 쓸 수 없다 — 그래서 화면이 어떤 봉 종류를 보고 있든 이 격자만은 일봉
 * 캔들을 따로 받는다. 일봉이 봉 종류 탭의 기본값이라 처음 들어온 사람은 이미 그
 * 응답을 받아 둔 상태고, `useCandles` 가 봉 종류를 쿼리 키에 넣어 캐시하므로
 * 호출이 늘지 않는다(`?interval=WEEK` 등으로 곧장 들어온 드문 경로만 예외다).
 * 값을 고르는 규칙의 근거는 `../lib/todayQuote.ts` 에 적었다. **전에 여기 적혀
 * 있던 "필드 추가를 GitLab #46 으로 요청해 뒀다" 는 더는 유효하지 않다** —
 * 캔들로 되는 것이라 새 필드가 필요 없다.
 *
 * **그 격자가 세그먼트 위에 있는 이유도 같은 데서 나온다(FINCH-330,
 * 2026-09-18).** 프로토타입은 차트 아래(새 디코드 L1820–L1828)에 두지만, 늘 일봉만
 * 보는 블록이 차트 바로 밑에 붙어 있으면 차트에서 뽑아낸 요약처럼 읽혀서 세그먼트를
 * 눌러도 숫자가 그대로인 것이 고장 난 것처럼 보였다. 자세한 근거는 `StockTodayGrid`
 * 에 적었다. 순서가 바뀌면서 **탭 공통 위 여백 18px 을 격자가 가져가고** 차트
 * 묶음은 둘 사이 간격을 갖는다.
 *
 * **차트 탭의 밀도를 한 번 더 조였다(FINCH-331, 2026-09-18).** 격자를 압축하고
 * (약 160px -> 108px) 세그먼트 위아래 여백을 줄여(32 -> 24 · 22 -> 16) 확보한 66px 에
 * 24px 을 더해 차트를 150px -> 240px 로 키웠다. 차트 탭인데 차트가 보조 그래프처럼
 * 보이던 것이 이유다. **세그먼트 높이 38px 은 건드리지 않았다** -- 커 보이던 것은
 * 높이가 아니라 위아래 여백이었고, 38px 은 프로토타입 실측이라 대조표가 닫아 둔 값이다.
 *
 * 차트 자리의 높이는 `CandleChart` 가 내보내는 `CHART_HEIGHT_CLASS` 하나를 쓴다 --
 * 스켈레톤·빈 상태·실패 자리가 차트와 같은 높이여야 봉 종류를 바꿀 때 아래가 튀지 않는데,
 * 전에는 같은 값을 여기 한 번 더 적어 둬서 한쪽만 고치면 조용히 어긋났다.
 *
 * 봉 종류는 URL 이 갖는다 (`?interval=` — `@/shared/types/candleInterval.ts` 참고).
 * 부모가 넘기고 여기서는 바꾸기만 한다.
 */

type StockChartTabProps = {
  stockCode: string;
  interval: CandleInterval;
  onIntervalChange: (interval: CandleInterval) => void;
  /** 보유 중이면 평균 매수가에 점선을 긋는다 (프로토타입 `chartHasAvg`). */
  avgBuyPrice: number | null;
  /** 거래정지면 차트·기간 탭을 그리지 않는다 (프로토타입 `d.tradableChart`). */
  suspended: boolean;
  suspendedReason: string | null;
  /**
   * 정지 화면의 `마지막 체결가`. **시세가 없는 종목이면 `null` 이다**
   * (contracts C102) — 그때는 금액 대신 `—` 를 둔다.
   */
  currentPrice: number | null;
};

export function StockChartTab({
  stockCode,
  interval,
  onIntervalChange,
  avgBuyPrice,
  suspended,
  suspendedReason,
  currentPrice,
}: StockChartTabProps) {
  /*
   * 거래정지면 캔들을 부르지 않는다 — 차트를 그리지 않으므로 응답을 쓸 자리가 없다.
   * 프로토타입도 정지 종목에서는 차트 블록 자체가 렌더되지 않는다.
   */
  const candles = useCandles(stockCode, interval, !suspended);

  /*
   * `오늘` 격자는 화면에 보이는 봉 종류와 무관하게 항상 일봉을 본다 — 주·월봉의
   * 마지막 봉은 하루치가 아니다(`../lib/todayQuote.ts`). 일봉이 봉 종류 탭의
   * 기본값이라 이미 캐시에 있고, 쿼리 키가 봉 종류별로 갈리는 `useCandles` 가
   * 그대로 재사용해 호출을 늘리지 않는다.
   */
  const dailyCandles = useCandles(stockCode, 'DAY', !suspended);

  /*
   * 첫 진입 Wipe 는 한 번만 탄다 (프로토타입 `.pfirst`, 새 디코드 L1020·L3726).
   * 프로토타입은 세그먼트를 **누른 적이 있는가**(`prevPeriod`)로 가른다 — 그리기
   * 횟수가 아니라 사용자의 조작이 기준이다. 그대로 옮겼다.
   *
   * 플래그가 이 탭에 있어야 한다. 봉 종류를 바꾸면 캔들 쿼리 키가 갈려
   * `CandleChart` 가 스켈레톤을 거쳐 다시 마운트되므로, 차트 안에 두면 전환마다
   * 다시 탄다. 전환을 사이에 두고 살아 있는 것은 이 탭이다.
   */
  const [intervalPressed, setIntervalPressed] = useState(false);

  /*
   * `오늘` 격자 값. 일봉 캔들이 하나도 없으면 `null` 이고 그때는 격자를 그리지
   * 않는다 (근거는 `../lib/todayQuote.ts`).
   *
   * `useMemo` 로 감싸지 않는다. 오늘이 며칠인지는 렌더마다 다시 봐야 하는 값이고
   * (화면을 열어 둔 채 자정을 넘길 수 있다) 계산은 배열의 마지막 원소 하나를
   * 읽는 것이 전부다.
   */
  const todayQuote = dailyCandles.isSuccess
    ? selectTodayQuote(dailyCandles.data.candles)
    : null;

  /*
   * 격자가 설 자리가 잡혀 있는가. 일봉이 오는 중이면 자리표시자가, 왔으면 격자가
   * 서고, 둘 다 아니면(응답이 실패했거나 봉이 하나도 없으면) 그 자리가 통째로 빈다.
   * 빌 때는 차트 묶음이 탭 공통 위 여백(18px)을 도로 가져간다 — 그 여백은 자리가
   * 아니라 **탭의 첫 블록** 에 붙는 값이다.
   */
  const hasTodayGrid = dailyCandles.isPending || todayQuote !== null;

  return (
    <>
      {suspended ? (
        <section className="mt-4.5">
          {/*
            정지 화면 (새 디코드 L1749–L1759). `.est` 실측 여백은 위 52 · 좌우 20 ·
            아래 40 이라 `EmptyState` 의 기본 여백을 덮어 쓴다.
            글자 위계는 `EmptyState` 가 이미 `.est` 를 따른다 (제목 17px/23px/600 ·
            설명 15px/22px) — 여기서 다시 덮지 않는다.
          */}
          <EmptyState
            className="px-5 pt-13 pb-10"
            title="시세가 갱신되지 않아요"
            description="거래가 정지돼 있어 차트와 당일 시세를 보여드릴 수 없어요."
          />
          <SoftBox className="mt-1">
            <SoftBoxRow
              label="마지막 체결가"
              value={
                currentPrice === null ? (
                  <NoValue label="마지막 체결가가 오지 않음" />
                ) : (
                  `${formatAmount(currentPrice)} 원`
                )
              }
              valueClassName="font-semibold"
            />
            {/* 사유는 서버가 준 문장이다. 프로토타입의 목 문구(`감사의견 거절`)를
                박지 않는다 — contracts C46 이 `suspendedReason` 을 계약으로 뒀다. */}
            <SoftBoxRow
              label="정지 사유"
              value={
                suspendedReason ?? <NoValue label="정지 사유가 오지 않음" />
              }
            />
          </SoftBox>
        </section>
      ) : (
        <>
          {/*
            `오늘` 격자. 거래정지 종목에는 그리지 않는다 — 프로토타입도
            `d.tradableChart` 안에 있고, 애초에 캔들을 부르지 않는다.

            **일봉이 오는 동안에는 같은 높이의 자리표시자를 둔다.** 이 블록이 탭의
            맨 위라, 비워 두면 값이 도착하는 순간 세그먼트와 차트를 통째로 밀어
            내린다. 차트 쪽 캔들과 따로 도착하므로 차트 자리표시자가 떠 있는 동안
            한 번 더 밀린다.
          */}
          {dailyCandles.isPending ? (
            <StockTodayGridSkeleton />
          ) : (
            todayQuote !== null && <StockTodayGrid quote={todayQuote} />
          )}

          <section className={hasTodayGrid ? 'mt-6' : 'mt-4.5'}>
            <ChartPeriodSegment
              interval={interval}
              onChange={(next) => {
                setIntervalPressed(true);
                onIntervalChange(next);
              }}
            />

            <div className="mt-4">
              {candles.isPending && (
                <Skeleton className={`${CHART_HEIGHT_CLASS} w-full`} />
              )}

              {candles.isError && (
                <div
                  className={`flex ${CHART_HEIGHT_CLASS} flex-col items-center justify-center text-center`}
                >
                  <p className="text-body-2 text-text-secondary">
                    차트를 불러오지 못했어요
                  </p>
                  <button
                    type="button"
                    onClick={() => void candles.refetch()}
                    className="mt-2.5 text-label font-medium text-text-secondary underline underline-offset-[3px]"
                  >
                    다시 시도
                  </button>
                </div>
              )}

              {candles.isSuccess &&
                (candles.data.candles.length === 0 ? (
                  <div
                    className={`flex ${CHART_HEIGHT_CLASS} items-center justify-center`}
                  >
                    <p className="text-body-2 text-text-secondary">
                      표시할 시세 기록이 없어요
                    </p>
                  </div>
                ) : (
                  <CandleChart
                    candles={candles.data.candles}
                    interval={interval}
                    avgBuyPrice={avgBuyPrice}
                    animateIn={!intervalPressed}
                  />
                ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}
