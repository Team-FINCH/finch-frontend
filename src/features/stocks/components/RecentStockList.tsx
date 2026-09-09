import { ROUTES } from '@/shared/config/routes';
import { type RecentStock } from '@/shared/types/stock';
import { StockRow } from '@/shared/ui/StockRow';

/**
 * 최근 본 종목 목록 (프로토타입 `viewedPreview` 블록).
 *
 * **미리보기 3건만 그린다.** 프로토타입이 `slice(0,3)` 으로 자르고(proto L3647)
 * design.md L381 도 최대 3개를 적는다. 서버는 최대 30건을 내려주므로(contracts C51)
 * 나머지는 "전체 보기"(`/recent`)가 받는다.
 *
 * **등락액이 없다.** `RecentStock` 은 `currentPrice`·`changeRate` 만 갖는다
 * (apiSpec §6.1) — 그래서 `changeAmount` 를 넘기지 않고, `StockRow` 가 등락률 한 줄만
 * 그린다. 없는 값을 0 으로 채우지 않는다.
 *
 * 보조 줄은 종목코드다. 프로토타입도 여기서는 시장을 적지 않는다 — 응답에 없다.
 *
 * 행 위아래 여백은 프로토타입이 이 목록에서만 `.row` 의 14px 을 15px 로 덮는다
 * (proto L1648). 구분선은 각 행 뒤에 오고 마지막 행 뒤에도 있다 (proto L1661).
 *
 * **행마다 `✕` 가 붙는다** (proto L1659 · design.md L384). 프로토타입은 행(`.row`)을
 * `flex:1` 로 좁히고 그 오른쪽 밖에 34x34px 버튼을 6px 띄워 놓는다 — 행 안이 아니라
 * 행 옆이라 종목 상세로 가는 링크와 삭제가 겹치지 않는다. 누르면
 * `DELETE /stocks/recent/{stockCode}` 다 (apiSpec §6.1).
 */
const RECENT_STOCK_PREVIEW_COUNT = 3;

type RecentStockListProps = {
  stocks: readonly RecentStock[];
  /** 행의 `✕`. 넘기지 않으면 삭제 버튼을 그리지 않는다 */
  onRemove?: (stockCode: string) => void;
};

export function RecentStockList({ stocks, onRemove }: RecentStockListProps) {
  return (
    <ul>
      {stocks.slice(0, RECENT_STOCK_PREVIEW_COUNT).map((stock) => (
        <li key={stock.stockCode}>
          <div className="flex items-center">
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
              className="min-w-0 flex-1 py-[15px]"
            />
            {onRemove === undefined ? null : (
              <button
                type="button"
                onClick={() => onRemove(stock.stockCode)}
                aria-label={`최근 본 종목 ${stock.stockName} 삭제`}
                className="ml-1.5 flex size-8.5 flex-none items-center justify-center text-caption leading-none text-text-muted"
              >
                ✕
              </button>
            )}
          </div>
          <div className="ml-14 h-px bg-border opacity-50" />
        </li>
      ))}
    </ul>
  );
}
