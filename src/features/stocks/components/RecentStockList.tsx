import { ROUTES } from '@/shared/config/routes';
import { type RecentStock } from '@/shared/types/stock';
import { StockRow } from '@/shared/ui/StockRow';

/**
 * 최근 본 종목 목록 (프로토타입 `viewedPreview` 블록).
 *
 * **등락액이 없다.** `RecentStock` 은 `currentPrice`·`changeRate` 만 갖는다
 * (apiSpec §6.1) — 그래서 `changeAmount` 를 넘기지 않고, `StockRow` 가 등락률 한 줄만
 * 그린다. 없는 값을 0 으로 채우지 않는다.
 *
 * 보조 줄은 종목코드다. 프로토타입도 여기서는 시장을 적지 않는다 — 응답에 없다.
 */
type RecentStockListProps = {
  stocks: readonly RecentStock[];
};

export function RecentStockList({ stocks }: RecentStockListProps) {
  return (
    <ul>
      {stocks.map((stock, index) => (
        <li key={stock.stockCode}>
          {index > 0 && <div className="ml-14 h-px bg-border opacity-50" />}
          <StockRow
            stockCode={stock.stockCode}
            stockName={stock.stockName}
            sub={stock.stockCode}
            figures={{
              kind: 'quote',
              currentPrice: stock.currentPrice,
              changeRate: stock.changeRate,
            }}
            to={ROUTES.stockDetail(stock.stockCode)}
          />
        </li>
      ))}
    </ul>
  );
}
