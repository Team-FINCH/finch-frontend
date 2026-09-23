/**
 * 서비스 종목 30개.
 *
 * **정본은 백엔드다.** `backend/src/main/resources/application.yaml` 의
 * `finch.universe.codes`(2026-09-14 확정, 30개)를 그대로 옮긴 사본이고, 순서까지
 * 저쪽 순서다. 서비스 종목이 바뀌면 저기를 먼저 고치고 여기와 로고 SVG
 * (`public/brand/stocks/`)를 같이 맞춘다.
 *
 * ## 왜 프론트에 목록을 두나
 *
 * **종목 카탈로그를 목록으로 내려주는 API 가 없다.** `GET /stocks/search` 는 검색어
 * 두 글자 이상을 요구하고(`STOCK_SEARCH_MIN_KEYWORD_LENGTH`), `GET /stocks/{stockCode}`
 * 는 호출 자체가 최근 본 종목에 기록을 남긴다(contracts C51) — 목록을 만들겠다고
 * 상세를 30번 부르면 사용자가 보지도 않은 종목 30개가 최근 본 목록을 덮는다.
 * 랭킹·추천 API 는 만들지 않기로 확정했으므로(2026-09-07) 이 목록의 근거로
 * 랭킹을 기대하지 않는다. 카탈로그 목록 조회만 있으면 이 파일은 사라진다.
 *
 * 온보딩의 `features/onboarding/lib/majorStocks.ts` 가 같은 이유로 먼저 만들어진
 * 4개짜리 임시 상수다. **그쪽을 이 목록으로 흡수하는 것은 별 티켓이다** — 온보딩
 * 화면까지 번진다.
 *
 * ## 순서는 정본 순서이고 바꾸지 않는다
 *
 * **등락률 같은 기준으로 정렬하지 않는다.** 순서가 매번 바뀌면 사람은 그것을 순위로
 * 읽는다. 랭킹·추천 API 를 만들지 않기로 한 결정(`frontend/docs/design.md` 시장 랭킹
 * 절 · GitLab 이슈 #30 회수)을 정렬로 되살리는 셈이고, 시연 중에 같은 화면이 두 번
 * 다르게 나오는 것도 손해다. 정본 순서를 그대로 쓰면 "왜 이 순서냐" 에 답할 것이 없다.
 *
 * ## 이 목록으로 종목의 존재 여부를 판정하지 않는다
 *
 * 서비스 종목인지 아닌지는 서버만 안다. 보유·거래내역에는 유니버스 밖 코드가 남아
 * 있을 수 있고(상장폐지·유니버스 개편), 프론트가 이 사본으로 "없는 종목" 이라고
 * 단정하면 서버는 멀쩡히 주는 데이터를 화면이 가린다. 여기 쓰임새는 **보여줄 목록을
 * 고르는 것** 하나다.
 */

export type ServiceStock = {
  /** 6자리 문자열 (contracts C19). 숫자로 다루면 `005930` 의 앞 `0` 이 사라진다 */
  stockCode: string;
  stockName: string;
};

export const SERVICE_STOCKS: readonly ServiceStock[] = [
  { stockCode: '005930', stockName: '삼성전자' },
  { stockCode: '000660', stockName: 'SK하이닉스' },
  { stockCode: '005380', stockName: '현대차' },
  { stockCode: '009150', stockName: '삼성전기' },
  { stockCode: '092790', stockName: '넥스틸' },
  { stockCode: '034020', stockName: '두산에너빌리티' },
  { stockCode: '024060', stockName: '흥구석유' },
  { stockCode: '042700', stockName: '한미반도체' },
  { stockCode: '066570', stockName: 'LG전자' },
  { stockCode: '035420', stockName: 'NAVER' },
  { stockCode: '035720', stockName: '카카오' },
  { stockCode: '017670', stockName: 'SK텔레콤' },
  { stockCode: '108490', stockName: '로보티즈' },
  { stockCode: '003490', stockName: '대한항공' },
  { stockCode: '047040', stockName: '대우건설' },
  { stockCode: '042660', stockName: '한화오션' },
  { stockCode: '006400', stockName: '삼성SDI' },
  { stockCode: '086520', stockName: '에코프로' },
  { stockCode: '006800', stockName: '미래에셋증권' },
  { stockCode: '011070', stockName: 'LG이노텍' },
  { stockCode: '196170', stockName: '알테오젠' },
  { stockCode: '009830', stockName: '한화솔루션' },
  { stockCode: '064400', stockName: 'LG씨엔에스' },
  { stockCode: '466100', stockName: '클로봇' },
  { stockCode: '307950', stockName: '현대오토에버' },
  { stockCode: '267260', stockName: 'HD현대일렉트릭' },
  { stockCode: '006360', stockName: 'GS건설' },
  { stockCode: '062040', stockName: '산일전기' },
  { stockCode: '058610', stockName: '에스피지' },
  { stockCode: '047810', stockName: '한국항공우주' },
];

/**
 * 종목코드만. `SERVICE_STOCKS` 에서 파생시킨다 — 코드 목록을 손으로 한 벌 더 적으면
 * 두 목록이 어긋나는 날이 온다(백엔드 `application.yaml` 도 같은 이유로 실시간 등록
 * 목록을 앵커로 재사용한다).
 */
export const SERVICE_STOCK_CODES: readonly string[] = SERVICE_STOCKS.map(
  (stock) => stock.stockCode,
);
