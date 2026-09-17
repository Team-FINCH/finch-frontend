import { useNavigate } from 'react-router-dom';

import { formatKstTime } from '@/shared/lib/formatDate';
import {
  formatAmount,
  formatSignedAmountWithRate,
  getPriceDirection,
  type PriceDirection,
} from '@/shared/lib/formatNumber';
import { formatMarketLabel } from '@/shared/lib/marketLabel';
import {
  type StockDetailResponse,
  type StockQuote,
} from '@/shared/types/stock';
import { hasDetailQuoteValues, hasQuoteValues } from '@/shared/types/stock';
import { HomeLink } from '@/shared/ui/HomeLink';

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
 * **상세 응답 쪽도 비어 있을 수 있다** (contracts C102). 시세가 없는 종목이면
 * `GET /stocks/{stockCode}` 가 가격 네 필드를 `null` 로 준다 — 폴링이 한 번도
 * 오기 전에 이미 빈 상태다. 두 경로가 같은 자리를 비우므로 `values` 한 값으로
 * 합쳐 판정한다. **거래정지와는 다른 조건이다** — 거래정지가 아닌데 시세만
 * 없는 종목이 있을 수 있어 뱃지 유무로 갈음하지 않는다.
 *
 * 등락색은 숫자 두 줄에만 붙는다. 헤더 전체를 칠하지 않는다 (컨벤션 §11).
 */

const DIRECTION_TEXT_CLASS: Record<PriceDirection, string> = {
  rise: 'text-stock-up',
  fall: 'text-stock-down',
  flat: 'text-stock-neutral',
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

  // 폴링이 캐시 미스를 알린 상태 (contracts C42). 상세 응답에 값이 남아 있어도
  // 그쪽으로 되돌아가지 않는다 — "지금 시세를 모른다" 가 더 새 정보다.
  const quoteMissing =
    quote !== undefined && !hasQuoteValues(quote) && quote.stale;

  // 상세 응답 자체에 시세가 없는 종목 (contracts C102). 폴링이 아직 오기 전이라도
  // 여기서 이미 가격 자리가 빈다 — 거래정지와는 다른 조건이다.
  const fallback = hasDetailQuoteValues(detail) ? detail : null;

  const values = quoteMissing ? null : (live ?? fallback);

  // 헤더 아래 캡션 한 줄 (contracts C42 · C102, 사용자 결정 2026-09-17).
  // 두 조건이 겹치지 않는다 — `notice`가 값 없음 문구면 `values`가 `null`이라
  // stale 지연 문구 조건(`values !== null`)을 만족하지 못한다. 같은 자리를
  // 공유해도 되는 이유다.
  const notice =
    values === null
      ? '실시간 시세가 없어요'
      : quote?.stale === true
        ? '시세가 지연되고 있어요'
        : null;
  const showNotice = notice !== null;

  return (
    <header>
      <div className="flex items-start gap-1 pt-1.5">
        <button
          type="button"
          onClick={() => void navigate(-1)}
          aria-label="뒤로 가기"
          className="flex size-11 flex-none items-center justify-center rounded-12 text-[20px] leading-none text-text-primary active:bg-primary-soft"
        >
          ‹
        </button>
        <span className="flex min-w-0 flex-1 flex-col gap-0.75 pt-2.25">
          <span className="truncate text-[17px] leading-[23px] font-bold tracking-[-0.01em] text-text-primary">
            {detail.stockName}
          </span>
          <span className="text-caption text-text-muted">
            {detail.stockCode} · {formatMarketLabel(detail.market)}
          </span>
        </span>
        {detail.suspended && (
          /*
            거래정지 뱃지 (프로토타입 `.tag.ne`, 새 디코드 L1702).
            중립 회색이다 — `--up` 을 쓰지 않는다. 실측 —
            높이 24 · 좌우 8 · 반경 8 · 13px/500 · 면 `#F1F3F6`(`--color-surface-soft`) ·
            글씨 `--t3`(`--color-text-muted`).
            반경 8px 은 `--radius-tag` 다 (`--radius-sm` 은 10px 이라 쓸 수 없다).
          */
          <span className="mr-0.5 flex h-6 flex-none items-center rounded-tag bg-surface-soft px-2 text-caption font-medium text-text-muted">
            거래정지
          </span>
        )}
        {/*
          관심 토글. 프로토타입은 색을 두 값으로 갈라 쓴다 —
          선택 `#1F2328`(`--color-text-primary` 와 같은 값) ·
          비선택 `#C6CEDA` (새 디코드 L3716 `starColor`).

          비선택 쪽은 글자색 계단이 아니라 **글리프 토큰**을 쓴다.
          `--color-text-muted`(#78828E)는 흰 배경 대비 3.90 이라
          `styles/index.css` 가 "캡션·기준 시각·출처에만" 으로 쓰는 자리를
          좁혀 둔 색이고, `#C6CEDA` 는 그보다 더 옅다. 글자색 계단에 넷째로
          붙이면 그 결정을 뒤집는 것이 되므로 읽을 필요가 없는 장식 글리프
          전용 토큰으로 분리했다. 라벨·본문에는 쓰지 않는다.
        */}
        <button
          type="button"
          onClick={onToggleWatch}
          disabled={isTogglePending}
          aria-pressed={detail.watched}
          aria-label={detail.watched ? '관심 종목 해제' : '관심 종목 담기'}
          className={`flex size-11 flex-none items-center justify-center rounded-12 text-[20px] leading-none active:bg-primary-soft disabled:opacity-40 ${
            detail.watched ? 'text-text-primary' : 'text-glyph-disabled'
          }`}
        >
          {detail.watched ? '♥' : '♡'}
        </button>
        {/*
          홈으로 (FINCH-269). 이 화면은 하단 탭 바가 없고 진입 경로가 여럿이라
          (홈·탐색·포트폴리오·브리핑·알림함) 뒤로가기만으로는 홈까지 몇 번을
          눌러야 할지 화면마다 다르다.

          관심 토글 **뒤**에 둔다. 토글은 이 화면의 동작이고 홈은 화면을 떠나는
          길이라, 떠나는 것을 가장자리로 민다 — `SubPageHeader` 도 같은 자리다.

          좁은 화면에서 버튼 셋(뒤로·관심·홈)이 132px 을 쓰지만 종목명이
          `truncate` 라 넘치지 않고 줄어든다.
        */}
        <HomeLink />
      </div>

      <div className="pt-3.5">
        {values === null ? (
          <p className="text-display text-text-secondary tabular-nums">—</p>
        ) : (
          <>
            <p className="text-display text-text-primary tabular-nums">
              {formatAmount(values.currentPrice)}
              <span className="text-[20px] font-medium text-text-secondary">
                {' '}
                원
              </span>
            </p>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              {/*
                거래정지 종목은 등락·등락률을 `—`로 두고 글씨를 `--t3`(text-text-muted)로
                내린다 (design.md §7.3 L445). 현재가는 그대로 둔다 — 마지막 체결가로서
                의미가 있는 것은 현재가뿐이고, 그 줄을 `—`로 바꾸라는 것은 등락·등락률
                뿐이다. `values`는 시세가 있는 갈래(거래정지 여부와 무관하게 채워진다)라
                손대지 않으면 정지 종목도 상승·하락 색이 그대로 붙는다.

                같은 판단이 §7.4(L528)의 차트 제거에도 있다 — "갱신이 멈춘 시세를
                캔들로 그리면 살아 있는 차트로 읽힌다"며 차트를 통째로 뺐다. 차트는
                살아 보일까 봐 뺐는데 헤더에서 상승·하락 색이 그대로면 앞뒤가 안 맞는다.
                §5(L197) "상승·하락 색상은 금융 의미 전달에만 사용하고 장식용·상태용으로
                쓰지 않는다"도 같은 결이다 — 갱신이 멈춘 값은 금융 의미가 없다.
              */}
              <span
                className={`text-body-1 font-medium whitespace-nowrap tabular-nums ${
                  detail.suspended
                    ? 'text-text-muted'
                    : DIRECTION_TEXT_CLASS[getPriceDirection(values.changeRate)]
                }`}
              >
                {detail.suspended
                  ? '—'
                  : formatSignedAmountWithRate(
                      values.changeAmount,
                      values.changeRate,
                    )}
              </span>
              {/*
                여기 기준 시각만 초까지 적는다(사용자 피드백, 2026-09-17). 장중에는
                폴링 응답이 이 값을 계속 갱신하므로 시:분만으로는 방금 온 값인지
                가늠할 수 없다 — 다른 자리(홈 총자산·AI 분석)는 갱신이 뜸해 시:분으로 충분하다.
              */}
              <span className="text-[12px] whitespace-nowrap text-text-muted">
                {formatKstTime(values.asOf)} 기준
              </span>
            </div>
          </>
        )}

        {/*
          헤더 캡션 한 줄 — 시세 지연(contracts C42) 과 시세 없음(C42 캐시 미스 ·
          C102) 이 이 한 자리를 공유한다(사용자 결정 2026-09-17). 전에는 시세
          없음을 `text-title-2` 문장으로 현재가 자리에 크게 띄웠는데, 실제로
          `/stocks/058610` 을 열어 보니 숫자가 있어야 할 자리가 장애 안내처럼
          보였다 — 일봉·오늘 격자는 멀쩡히 나오는데 헤더만 전부 실패한 것처럼
          읽혔다. 지금은 현재가 자리를 비우고(위 `—`) 이유를 여기 캡션으로 내린다.

          TODO(계약): `stale` 허용 시간과 그에 따른 주문 차단 기준이 미확정이다.
          지금은 서버가 준 `stale` 불리언만 그대로 노출하고 임계 시간으로 판정하지
          않는다. 값이 정해지면 `shared/config` 상수로 두고 여기서 참조한다
          (ia.md §7 "시세 갱신 주기와 stale 임계값은 코드에 숫자로 박지 않는다").
          — 근거: contracts P10 / 스프린트 0 결정

          줄 자체는 늘 그린다. `visible`/`invisible` 토글만 한다 —
          안 그리면 켜질 때마다 `text-caption` 줄 높이만큼 아래가 밀린다 (FINCH-284).
          `invisible` 은 `visibility: hidden` 이라 스크린리더 트리에서도 빠지므로
          `aria-hidden` 을 겹쳐 명시적으로 맞춘다.
        */}
        <p
          aria-hidden={!showNotice}
          className={`mt-2 text-caption text-text-muted ${
            showNotice ? 'visible' : 'invisible'
          }`}
        >
          {notice ?? '시세가 지연되고 있어요'}
        </p>

        {/*
          거래정지 안내 회색 박스는 걷어냈다. 프로토타입은 헤더에 **중립 회색 뱃지**만
          두고(위 `.tag.ne`) 정지 사유는 차트 탭의 정지 화면에서 말한다
          (새 디코드 L1749–L1759, `StockChartTab` 참고). `ia.md` L134 · contracts C46 이
          요구한 "뱃지 노출 + `suspendedReason`" 도 그 둘로 함께 만족한다.
        */}
      </div>
    </header>
  );
}
