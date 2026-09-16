import { ROUTES } from '@/shared/config/routes';
import { formatMarketLabel } from '@/shared/lib/marketLabel';
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
 * 프로토타입도 이제 중립 캡슐(`.tag ne`)을 쓴다 — 옛 디코드의 적색 맨 글자에서
 * 바뀌었다 (proto L1606 · `.tag.ne` L1117). 홈·관심 목록과 모양이 같아졌다.
 *
 * 행 사이 구분선은 프로토타입이 각 행 **뒤**에 두고 왼쪽 56px 을 비운다
 * (뱃지 44px + 간격 12px). 마지막 행 뒤에도 선이 있다 (proto L1615).
 */
type StockSearchResultListProps = {
  results: readonly StockSummary[];
};

export function StockSearchResultList({ results }: StockSearchResultListProps) {
  return (
    <ul>
      {results.map((stock) => (
        <li key={stock.stockCode}>
          <StockRow
            stockCode={stock.stockCode}
            stockName={stock.stockName}
            suspended={stock.suspended}
            sub={`${stock.stockCode} · ${formatMarketLabel(stock.market)}`}
            figures={{
              kind: 'quote',
              currentPrice: stock.currentPrice,
              changeRate: stock.changeRate,
              changeAmount: stock.changeAmount,
            }}
            to={ROUTES.stockDetail(stock.stockCode)}
          />
          <div className="ml-14 h-px bg-border opacity-50" />
        </li>
      ))}
    </ul>
  );
}
