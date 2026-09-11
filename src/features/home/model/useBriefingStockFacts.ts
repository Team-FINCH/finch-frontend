import { useCallback, useMemo } from 'react';

import type { AiBriefingItem } from '@/shared/types/ai/briefing';
import { hasQuoteValues } from '@/shared/types/stock';

import { useHomePortfolio } from '../api/useHomePortfolio';
import { useHomeStockQuotes } from '../api/useHomeStockQuotes';
import { useHomeWatchlist } from '../api/useHomeWatchlist';
import { toQuoteMap } from '../lib/applyQuotes';

/**
 * 브리핑 행 머리에 그릴 종목 이름과 등락률 (프로토타입 `isBriefing` 의
 * `briefTop.name`·`briefTop.pct`).
 *
 * **둘 다 브리핑 응답에 없다.** `AiBriefingItemSchema` 가 주는 것은
 * `relatedTickers`(6자리 코드)뿐이라 이름도 시세도 프론트가 채운다.
 *
 * ## 이름 — 보유·관심 목록에서 찾는다
 *
 * 브리핑은 보유(`GET /portfolio`)와 관심(`GET /watchlist`)을 대상으로 만들어지므로
 * (AI 명세 §8) 대부분 둘 중 하나에서 찾아진다. 둘 다에 없으면 **종목코드를 그대로
 * 보여준다** — 이름 자리를 비우면 행 머리가 통째로 무너진다.
 *
 * 이름 하나 때문에 `GET /stocks/{stockCode}` 를 부르지 않는다. 그 호출은 최근 본
 * 종목에 기록을 남겨서(contracts C51) 브리핑을 열기만 해도 최근 본 종목이 덮인다.
 *
 * 홈에서 들어오면 두 쿼리는 이미 캐시에 있다(같은 키). 주소로 바로 열면 여기서
 * 처음 나간다 — 브리핑 한 화면에 요청 둘이 더 붙지만, 대신 이름을 못 찾는 행이
 * 사라진다.
 *
 * ## 등락률 — 벌크 한 번
 *
 * `GET /stocks/prices?stockCodes=…` 로 한 번에 묻는다(apiSpec §5.5 · contracts C41).
 * 행마다 `GET /stocks/{stockCode}` 를 부르면 위와 같은 이유로 최근 본 종목이 덮인다.
 * 브리핑 항목은 최대 4건이라 `STOCK_PRICES_MAX_CODES`(50) 에 걸리지 않는다.
 */
export type BriefingStockFacts = {
  /** 보유·관심에서 찾은 이름. 못 찾으면 종목코드 그대로다 */
  stockName: string;
  /**
   * 백분율(`Percent`). 세 값을 구분한다 —
   * 숫자면 그 값, `null` 이면 값이 없다(`—`), `undefined` 면 아직 모른다.
   *
   * `undefined` 일 때 `—` 를 그리면 시세가 도착하는 순간 숫자로 바뀌며 깜빡인다.
   * 모르는 동안은 자리를 아예 그리지 않는다.
   */
  changeRate: number | null | undefined;
  /**
   * `확인 필요` 뱃지 (프로토타입 `briefTop.needCheck`).
   *
   * TODO(계약): **출처가 없어 항상 `false` 다.** 프로토타입은 이 값을 상수로 박아
   * 뒀고, 실제 값은 알림함의 미읽음으로 보이는데 브리핑 항목과 알림을 이어 붙일
   * 열쇠가 어느 응답에도 없다 (GitLab #57 회신 대기). `false` 인 동안 화면은 그
   * `span` 을 아예 만들지 않는다 — 빈 문자열을 그리면 종목명과 등락률 사이가 벌어진다.
   */
  needCheck: boolean;
  /**
   * 본문 아래 보조 한 줄 `{종류} · {출처}` (프로토타입 `briefTop.meta`).
   *
   * TODO(계약): **출처가 없어 항상 `undefined` 다.** `category` 는 뉴스 종류가
   * 아니라 브리핑 항목 분류(`holding_move`·`portfolio_shift` 등)이고, `출처` 에
   * 해당하는 필드가 응답에 없다 — `citations` 는 현재 구현에서 항상 빈 배열이다
   * (contracts C56).
   */
  meta: string | undefined;
};

/**
 * 관심 목록 정렬. 홈의 기본값(`HomePage` 의 `watchSort` 초깃값)과 같은 값이라야
 * 쿼리 키가 겹쳐 홈에서 들어왔을 때 다시 부르지 않는다. 브리핑은 이 목록을
 * 이름을 찾는 데만 쓰므로 순서 자체는 뜻이 없다.
 */
const WATCHLIST_SORT = 'REGISTERED';

/**
 * 브리핑 항목들이 가리키는 종목의 이름과 등락률을 모아 종목코드로 찾게 해 준다.
 *
 * 항목 하나가 여러 종목을 가리킬 수 있지만 행 머리에는 하나만 그리므로
 * (프로토타입도 이름 하나다) `relatedTickers[0]` 만 모은다.
 */
export function useBriefingStockFacts(
  items: readonly AiBriefingItem[],
): (stockCode: string) => BriefingStockFacts {
  const stockCodes = useMemo(() => {
    const codes = items.flatMap((item) => item.relatedTickers.slice(0, 1));
    return Array.from(new Set(codes));
  }, [items]);

  const portfolio = useHomePortfolio();
  const watchlist = useHomeWatchlist(WATCHLIST_SORT);
  const quotes = useHomeStockQuotes(stockCodes);

  // 보유를 먼저 넣는다. 같은 종목이 양쪽에 있어도 이름은 같으므로 순서가 화면을
  // 바꾸지는 않는다 — 먼저 채운 쪽을 남기는 규칙만 분명히 해 둔다.
  const nameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const holding of portfolio.data?.holdings ?? []) {
      map.set(holding.stockCode, holding.stockName);
    }
    for (const item of watchlist.data?.items ?? []) {
      if (!map.has(item.stockCode)) {
        map.set(item.stockCode, item.stockName);
      }
    }
    return map;
  }, [portfolio.data, watchlist.data]);

  const quoteMap = useMemo(
    () => toQuoteMap(quotes.snapshot?.items ?? []),
    [quotes.snapshot],
  );

  // 첫 시세를 아직 못 받은 동안이다. 실패했으면(`isDisconnected`) 기다리는 것이
  // 아니라 값이 없는 것이므로 `null` 로 떨어뜨린다.
  const quotePending = quotes.isConnecting;

  return useCallback(
    (stockCode: string): BriefingStockFacts => {
      const quote = quoteMap.get(stockCode);

      return {
        stockName: nameMap.get(stockCode) ?? stockCode,
        changeRate: quotePending
          ? undefined
          : quote !== undefined && hasQuoteValues(quote)
            ? quote.changeRate
            : null,
        needCheck: false,
        meta: undefined,
      };
    },
    [nameMap, quoteMap, quotePending],
  );
}
