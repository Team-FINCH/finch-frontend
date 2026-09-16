import { formatAmount, formatSignedRate } from '@/shared/lib/formatNumber';
import { Skeleton } from '@/shared/ui/Skeleton';
import { StockLogo } from '@/shared/ui/StockLogo';

/**
 * 주문 화면 맨 위의 종목 한 줄 — 이니셜 뱃지 · 종목명 · `시장가 · {현재가}원` ·
 * 등락률 태그 (FINCH-260, 프로토타입 `isOrder` 의 첫 `.sec`).
 *
 * ## 왜 필요했나
 *
 * 전에는 `시장가 · 현재가 68,100원` 한 줄뿐이라 **어느 종목을 사는지 화면에 없었다.**
 * 헤더 제목도 `매수`/`매도` 라 종목을 말하지 않는다. 진입점이 종목 상세 하나뿐이라
 * "방금 보던 그 종목" 이 맞기는 하지만, 주문은 되돌릴 수 없는 화면이라 확인할 것이
 * 화면에 있어야 한다.
 *
 * ## 종목명이 이 컴포넌트로 오는 경로
 *
 * **`GET /orders/available` 에는 `stockName` 이 없다** (`tradable`·`reason`·
 * `currentPrice`·`availableCash`·`maxQuantity`·`holdingQuantity` 뿐). 그래서
 * `GET /stocks/{stockCode}` 에서 따로 받아야 하는데, feature 끼리 직접 import 하지
 * 않는 규약(frontConvention §2)이 있어 **`OrderPage`(pages 층)가 두 쿼리를 합쳐
 * 이 컴포넌트에 props 로 넘긴다.** 이 파일은 서버를 모른다.
 *
 * 추가 왕복은 거의 없다 — 진입점이 종목 상세뿐이라 그 화면이 이미 같은 키로 받아 둔
 * 캐시가 `staleTime` 30초 안에 살아 있다.
 *
 * ## 등락률을 여기서 계산하는 이유
 *
 * **`previousClose` 와 현재가로 직접 구한다.** 상세 응답의 `changeRate` 를 그대로
 * 쓰지 않는다 — 그 값은 화면을 연 순간의 스냅숏이고 이후 갱신되지 않는데
 * (`useStockDetail` 은 폴링하지 않는다), 바로 옆의 현재가는 `useOrderAvailable` 이
 * 3초마다 새로 받는다. 그대로 두면 **주문 화면에 오래 머무를수록 살아 있는 가격 옆에
 * 멈춘 등락률이 붙는다.**
 *
 * `previousClose` 는 전일 종가라 장중에 움직이지 않는다. 그래서 이 계산은 현재가가
 * 갱신될 때마다 함께 맞는다. 시세를 한 번 더 구독하는(`useStockQuote`) 방법도 있지만
 * 이 화면의 폴링이 두 배가 되고, 얻는 것이 태그 하나라 택하지 않았다.
 *
 * 서버 계산과 어긋나지 않는다 — 서버도 `(현재가 - 전일종가) / 전일종가 x 100` 이고,
 * `formatSignedRate` 가 소수 둘째 자리에서 끊어 반올림 차이가 화면에 남지 않는다.
 */

/**
 * 등락률 태그의 면색·글자색. **프로토타입 `.tag.u`·`.tag.d`·`.tag.g` 실측값이다.**
 *
 * ```
 * .tag.u{background:#FDECEC;color:#C13B3B}   상승
 * .tag.d{background:#EEF4FE;color:#2563EB}   하락
 * .tag.g{background:#F1F3F6;color:#565C66}   보합·값 없음
 * ```
 *
 * **`--color-stock-up`·`--color-stock-down` 을 쓰지 않는다. 대비 때문이다.**
 * 컨벤션 §11 은 등락색을 의미 토큰으로 참조하라고 하고 이 태그는 분명 등락이지만,
 * 두 토큰을 이 면 위에 올리면 작은 글씨 기준(4.5:1)에 못 미친다.
 *
 * | 글자 | 면 | 대비 |
 * | --- | --- | --- |
 * | `--color-stock-up` `#C93B3B` | `#FDECEC` | **4.41** 미달 |
 * | 프로토타입 `#C13B3B` | `#FDECEC` | 4.65 통과 |
 * | `--color-stock-down` `#2258C9` | `#EEF4FE` | 5.75 통과 |
 * | 프로토타입 `#2563EB` | `#EEF4FE` | 4.68 통과 |
 *
 * 즉 프로토타입이 태그 색을 등락 토큰과 미세하게 다르게 둔 것은 실수가 아니라
 * **면색이 깔린 자리에 맞춘 별개 계열**이다. 상승만 갈아 끼우면 상승·하락이 서로
 * 다른 근거의 색이 되므로 둘 다 프로토타입 값을 쓴다.
 *
 * 매매 내역 태그(`features/transactions/components/TransactionList`)가 같은 값을
 * 같은 이유로 지역 상수로 두고 있다. 태그를 쓰는 자리가 늘면 그때 공용으로 뺀다.
 *
 * **색만으로 등락을 말하지 않는다** — 부호(+/-)를 늘 함께 적는다(컨벤션 §11).
 */
const RATE_TAG_CLASS = {
  rise: 'bg-[#FDECEC] text-[#C13B3B]',
  fall: 'bg-[#EEF4FE] text-[#2563EB]',
  flat: 'bg-surface-soft text-text-secondary',
} as const;

type OrderStockHeaderProps = {
  /** 6자리 문자열. 종목명을 아직 모를 때 이름 자리를 대신한다 */
  stockCode: string;
  /** `GET /stocks/{stockCode}` 가 아직 안 왔거나 실패했으면 `null` */
  stockName: string | null;
  /** 응답을 기다리는 중. `true` 면 이름 자리에 스켈레톤을 놓는다 */
  isDetailPending: boolean;
  /** `GET /orders/available` 의 값. **주문 금액을 계산하는 값과 같아야 한다** */
  currentPrice: number;
  /** 전일 종가. 없으면 등락률을 그리지 않는다 */
  previousClose: number | null;
  /** 거래정지면 등락을 계산하지 않는다 — 마지막 값이 남아 있어도 지금 등락이 아니다 */
  suspended: boolean;
};

export function OrderStockHeader({
  stockCode,
  stockName,
  isDetailPending,
  currentPrice,
  previousClose,
  suspended,
}: OrderStockHeaderProps) {
  // 거래정지 종목과 전일 종가가 없는 종목은 등락을 그리지 않는다.
  // 0 으로 나누는 자리이기도 하다 — 신규 상장 첫날이 그럴 수 있다.
  const changeRate =
    suspended || previousClose === null || previousClose === 0
      ? null
      : ((currentPrice - previousClose) / previousClose) * 100;

  const tone =
    changeRate === null || changeRate === 0
      ? 'flat'
      : changeRate > 0
        ? 'rise'
        : 'fall';

  return (
    <div className="mt-4 flex items-center gap-3">
      <StockLogo stockCode={stockCode} stockName={stockName} />

      <span className="flex min-w-0 flex-1 flex-col gap-0.75">
        {isDetailPending ? (
          <Skeleton className="h-6 w-28" />
        ) : (
          /* 이름을 못 받았으면 종목코드를 그린다. 주문 화면에서 종목을 못 밝히는
             것보다는 코드라도 있는 쪽이 낫다 — 사용자가 대조할 수 있는 값이다. */
          <span className="truncate text-body-1 font-medium text-text-primary">
            {stockName ?? stockCode}
          </span>
        )}
        {/* 이 가격이 주문 금액을 계산하는 값과 같은 값이어야 한다.
            둘이 갈리면 화면에 적힌 단가와 실제 체결 금액이 어긋난다. */}
        <span className="truncate text-caption text-text-muted tabular-nums">
          시장가 · {formatAmount(currentPrice)}원
        </span>
      </span>

      {changeRate === null ? null : (
        <span
          className={`inline-flex h-6 flex-none items-center rounded-tag px-2 text-caption font-medium tabular-nums ${RATE_TAG_CLASS[tone]}`}
        >
          {formatSignedRate(changeRate)}
        </span>
      )}
    </div>
  );
}
