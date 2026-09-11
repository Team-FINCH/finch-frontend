import { useEffect, useState } from 'react';

import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion';
import {
  formatIndexPoint,
  formatSignedIndexPoint,
  formatSignedRate,
  getPriceDirection,
  type PriceDirection,
} from '@/shared/lib/formatNumber';
import { hasIndexValues, type MarketIndex } from '@/shared/types/market';

import { useMarketIndices } from '../api/useMarketIndices';

/**
 * 홈 헤더의 시장 지수 세로 롤링 (apiSpec §5.7 · 티켓 FINCH-228 · GitLab #65).
 *
 * 프로토타입 `.mkroll` 을 옮긴 것이다. **지수 전용 띠가 아니라 "홈" 글자 옆에
 * 붙는 인라인 요소**이고 높이는 18px 한 줄이다 — 한 번에 지수 하나만 보이고
 * 일정 간격으로 다음 지수가 아래에서 올라온다.
 *
 * ## design.md 와 어긋나 보이는 지점
 *
 * `design.md` §7.1 지수 절은 "자동으로 흐르는 Animation은 사용하지 않는다 ·
 * 한 줄 Horizontal Scroll" 이라고 적었지만 **이 자리는 프로토타입을 따른다.**
 * 마크업의 최종 근거는 프로토타입이고, 가로 스크롤 띠를 넣을 자리가 헤더에 없다.
 * 지수 항목에 한한 예외이고 `design.md` 의 그 문장 자체는 다른 화면에 살아 있다.
 *
 * ## 항목 수에 기대지 않는다
 *
 * 프로토타입은 `@keyframes mkroll` 에 4지수(KOSPI·KOSDAQ·USD-KRW·NASDAQ)의
 * 정지 지점을 퍼센트로 박아 뒀다(`0 → -18 → -36 → -54 → -72px`). **이번 범위는
 * KOSPI·KOSDAQ 둘로 구두 확정됐고**(USD-KRW·NASDAQ 은 백엔드 범위 밖, apiSpec
 * v0.8.7) 그 키프레임을 그대로 옮기면 주기의 절반이 빈칸으로 돈다.
 *
 * CSS 키프레임의 정지 지점은 퍼센트 리터럴이라 변수로 쓸 수 없다 — 항목 수가
 * 바뀌면 키프레임을 다시 써야 한다. 그래서 키프레임을 쓰지 않고 **타이머가
 * 한 칸씩 위치를 올리고 전환은 CSS 가 그린다.** 항목이 몇이든 같은 코드가 돌고,
 * USD-KRW·NASDAQ 이 나중에 응답에 실려도 이 파일을 고치지 않는다.
 * 같은 방식(상태 + `transition-transform`)을 `shared/ui/RollingNumber` 가 이미 쓴다.
 *
 * 마지막 항목 다음에 **첫 항목을 한 벌 더 깔아 둔다.** 그 자리로 굴러간 뒤
 * 전환 없이 0 번으로 되돌아오므로 계속 같은 방향으로 도는 것처럼 보인다.
 * 한 벌을 안 깔면 마지막에서 첫 항목으로 돌아갈 때 전부를 거꾸로 훑고 지나간다.
 *
 * ## 접근성
 *
 * `prefers-reduced-motion` 이면 **타이머를 돌리지 않고 첫 항목만 보인다.**
 * 전환만 끄면 3초마다 순간이동이 되어 오히려 나쁘다. 굴림 자체는 `aria-hidden`
 * 이고 낭독기는 `sr-only` 한 줄로 모든 지수를 한 번에 읽는다 —
 * `RollingNumber` 와 같은 방식이다.
 */

/** 프로토타입 `.mkroll`·`.mkroll i` 의 높이. 이 값이 곧 한 칸의 이동량이다. */
const ROW_HEIGHT_PX = 18;

/**
 * 한 항목이 머무는 시간. 프로토타입은 4항목을 12초에 돌리므로 항목당 3초다.
 * 항목 수를 곱하지 않는다 — 지수가 늘어도 한 항목을 읽을 시간은 그대로여야 한다.
 */
const SLOT_MS = 3_000;

/**
 * 한 칸 올라가는 데 걸리는 시간. 프로토타입 키프레임이 25% 구간 중 5% 를
 * 이동에 쓰므로 12초 × 5% = 600ms 다.
 */
const SLIDE_MS = 600;

const DIRECTION_TEXT_CLASS: Record<PriceDirection, string> = {
  rise: 'text-stock-up',
  fall: 'text-stock-down',
  flat: 'text-stock-neutral',
};

type RollState = {
  /** 트랙이 서 있는 칸. 0 부터 `items.length` 까지이고 마지막이 첫 항목 복제본이다 */
  position: number;
  /** `true` 면 전환 없이 자리만 옮긴다 */
  snap: boolean;
};

const INITIAL_ROLL: RollState = { position: 0, snap: true };

/**
 * 화면에 보이는 지수 이름. **`indexCode` 를 그대로 쓴다 — 한글로 옮기지 않는다.**
 *
 * 프로토타입의 마퀴 데이터가 `KOSPI`·`KOSDAQ`·`USD/KRW`·`NASDAQ` 으로 영문이고
 * 마크업의 최종 근거는 프로토타입이다. 한때 `코스피`·`코스닥` 으로 옮기는 표를
 * `features/home/lib/` 아래 따로 두었는데, 그렇게 옮길 근거가 어디에도 없어 지웠다.
 *
 * **종목 상세·탐색의 시장 표기와는 별개다.** 그 둘은 프로토타입도 한글을 쓰므로
 * `StockDetailHeader`·`StockSearchResultList` 의 `MARKET_LABEL` 은 그대로 둔다.
 * 같은 문자열이라고 묶어 고치면 그 두 화면이 프로토타입과 어긋난다.
 *
 * 옮기는 표가 없으므로 **모르는 코드도 코드 문자열이 그대로 나온다** — 값은 있는데
 * 이름만 없는 줄이 생기지 않는다. USD-KRW·NASDAQ 이 응답에 실리기 시작해도 이
 * 파일을 고칠 일이 없다. 다만 프로토타입은 그 자리를 `USD/KRW`(빗금)로 적어
 * 두었으므로, 서버가 `USD-KRW`(붙임표)로 내려주면 그때 옮기는 표가 다시 필요하다.
 */
function indexLabel(index: MarketIndex): string {
  return index.indexCode;
}

/** 낭독용 한 줄. 자릿수가 아니라 값으로 읽히게 문장으로 만든다. */
function toSpokenLine(index: MarketIndex): string {
  const label = indexLabel(index);
  if (!hasIndexValues(index)) {
    return `${label} 지수를 불러오지 못했어요`;
  }

  const line = `${label} ${formatIndexPoint(index.currentValue)}, 전일 대비 ${formatSignedIndexPoint(index.changeValue)}, ${formatSignedRate(index.changeRate)}`;
  return index.stale ? `${line}, 지연된 값` : line;
}

/**
 * 한 칸. 프로토타입 `.mkroll i` 의 실측값을 옮겼다 —
 * 이름 11px/600 `--t3` · 값 12px/500 `--t2` · 등락률 11px/600 등락색, 사이 간격 5px.
 * 11·12px 은 타이포 토큰에 없는 크기다(가장 작은 `--text-caption` 이 13px).
 * 헤더 보조 정보 전용이라 토큰을 새로 만들지 않고 실측값을 그대로 쓴다.
 */
function IndexRow({ index }: { index: MarketIndex }) {
  const label = indexLabel(index);

  if (!hasIndexValues(index)) {
    /*
      값 없음(기동 직후 첫 수신 전). **그 지수 자리만 비운다** — 둘 다 없다고
      롤링 전체를 숨기지 않는다. 자리가 사라지면 다음 갱신에 헤더 폭이 튄다.
    */
    return (
      <span className="flex h-[18px] items-baseline gap-1.25 whitespace-nowrap">
        <span className="text-[11px] font-semibold tracking-[0.02em] text-text-muted">
          {label}
        </span>
        <span className="text-[12px] font-medium text-text-muted tabular-nums">
          -
        </span>
      </span>
    );
  }

  return (
    <span className="flex h-[18px] items-baseline gap-1.25 whitespace-nowrap">
      <span className="text-[11px] font-semibold tracking-[0.02em] text-text-muted">
        {label}
      </span>
      <span className="text-[12px] font-medium text-text-secondary tabular-nums">
        {formatIndexPoint(index.currentValue)}
      </span>
      <span
        className={`text-[11px] font-semibold tabular-nums ${DIRECTION_TEXT_CLASS[getPriceDirection(index.changeRate)]}`}
      >
        {formatSignedRate(index.changeRate)}
      </span>
      {index.stale && (
        /*
          지연 표시 (contracts C42 와 같은 관용). 종목 상세는 가격 아래에
          `text-caption text-text-muted` 한 줄로 "시세가 지연되고 있어요" 를
          붙이는데(`StockDetailHeader`), 여기는 18px 한 줄이라 그 문장이 들어갈
          자리가 없다. 같은 뜻·같은 색을 짧은 말로 줄여 같은 줄에 둔다.
          문장 전체는 `sr-only` 쪽(`toSpokenLine`)이 읽는다.

          **장 마감은 여기 해당하지 않는다.** 마감·주말·휴장일에도 서버는
          `stale: false` 에 마지막 종가를 준다(apiSpec §5.7). `stale` 은 수신이
          60초 넘게 끊겼다는 뜻뿐이다.
        */
        <span className="text-[11px] text-text-muted">지연</span>
      )}
    </span>
  );
}

export function MarketIndexRoller() {
  const { data } = useMarketIndices();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [roll, setRoll] = useState<RollState>(INITIAL_ROLL);

  const items = data?.items ?? [];
  const count = items.length;
  const isRolling = !prefersReducedMotion && count > 1;

  useEffect(() => {
    if (!isRolling) {
      return;
    }

    const timer = setInterval(() => {
      setRoll((previous) =>
        /*
          정상 경로에서는 복제본 칸(`count`)에 닿는 즉시 아래 `onTransitionEnd`
          가 0 으로 되돌린다. 여기 갈래는 그 이벤트를 못 받았을 때의 안전장치다
          (탭이 숨겨져 전환이 끝나지 않은 경우). 한 칸 더 올리면 빈칸이 보이므로
          전환 없이 처음으로 돌린다.
        */
        previous.position >= count
          ? { position: 0, snap: true }
          : { position: previous.position + 1, snap: false },
      );
    }, SLOT_MS);

    return () => {
      clearInterval(timer);
    };
  }, [isRolling, count]);

  const first = items[0];
  if (first === undefined) {
    // 첫 응답 전이거나 조회에 실패했다. 헤더에 빈 칸을 만들지 않는다.
    return null;
  }

  /*
    복제본은 굴릴 때만 붙인다. `prefers-reduced-motion` 이거나 항목이 하나면
    0 번 칸에 멈춰 있어 복제본이 보일 일이 없다.
  */
  const rows = isRolling ? [...items, first] : items;

  /*
    굴리지 않을 때의 자리는 상태가 아니라 여기서 정한다 — 효과 안에서 상태를
    되돌리면 렌더가 한 번 더 돈다. 항목 수가 줄어드는 경우(지수가 빠지는 응답)를
    대비해 상한도 여기서 건다. 상태에는 손대지 않으므로 설정을 다시 끄면 멈춰
    있던 자리에서 이어서 돈다.
  */
  const position = isRolling ? Math.min(roll.position, count) : 0;
  const isSnapped = isRolling ? roll.snap : true;

  return (
    <span className="inline-flex min-w-0">
      <span className="sr-only">{items.map(toSpokenLine).join('. ')}</span>
      <span
        aria-hidden="true"
        className="block h-[18px] overflow-hidden leading-[18px]"
      >
        <span
          className={`block ${isSnapped ? 'transition-none' : 'transition-transform ease-roll'}`}
          style={{
            transform: `translateY(${String(-ROW_HEIGHT_PX * position)}px)`,
            transitionDuration: `${String(SLIDE_MS)}ms`,
          }}
          onTransitionEnd={() => {
            // 복제본까지 굴러왔다. 내용이 같은 0 번으로 전환 없이 되돌린다.
            setRoll((previous) =>
              previous.position >= count
                ? { position: 0, snap: true }
                : previous,
            );
          }}
        >
          {rows.map((index, rowIndex) => (
            <IndexRow
              key={`${index.indexCode}-${String(rowIndex)}`}
              index={index}
            />
          ))}
        </span>
      </span>
    </span>
  );
}
