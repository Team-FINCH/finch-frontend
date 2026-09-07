import { ROUTES } from '@/shared/config/routes';
import { type StockSummary } from '@/shared/types/stock';
import { StockRow } from '@/shared/ui/StockRow';

/**
 * 검색 결과 목록 (프로토타입 `showResults` 블록).
 *
 * 행은 `shared/ui/StockRow` 를 그대로 쓴다. 검색 결과 모양이 `figures.kind: 'quote'`
 * 에 `changeAmount` 까지 실린 변형이고, 보조 줄은 `종목코드 · 시장` 이다 —
 * 그 문자열은 행이 알 수 없어서 부르는 쪽이 만들어 넘긴다 (StockRow 주석).
 *
 * 거래정지 뱃지는 `StockRow` 가 `suspended` 로 그린다 (contracts C46).
 * 프로토타입은 이 뱃지에 상승 적색을 쓰지만 `StockRow` 가 중립색으로 이미 고쳐 뒀다 —
 * 등락색을 등락 표시 밖에서 쓰지 않는다는 컨벤션 §11 때문이다. 여기서 되돌리지 않는다.
 *
 * 행 사이 구분선은 프로토타입이 왼쪽 56px 을 비운다(뱃지 44px + 간격 12px).
 */
const MARKET_LABEL: Record<string, string> = {
  KOSPI: '코스피',
  KOSDAQ: '코스닥',
};

type StockSearchResultListProps = {
  results: readonly StockSummary[];
};

export function StockSearchResultList({ results }: StockSearchResultListProps) {
  return (
    <ul>
      {results.map((stock, index) => (
        <li key={stock.stockCode}>
          {index > 0 && <div className="ml-14 h-px bg-border opacity-50" />}
          <StockRow
            stockCode={stock.stockCode}
            stockName={stock.stockName}
            suspended={stock.suspended}
            sub={`${stock.stockCode} · ${MARKET_LABEL[stock.market] ?? stock.market}`}
            figures={{
              kind: 'quote',
              currentPrice: stock.currentPrice,
              changeRate: stock.changeRate,
              changeAmount: stock.changeAmount,
            }}
            to={ROUTES.stockDetail(stock.stockCode)}
          />
        </li>
      ))}
    </ul>
  );
}
