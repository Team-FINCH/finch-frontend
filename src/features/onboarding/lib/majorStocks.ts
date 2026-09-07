/**
 * 온보딩 첫 화면에 보여줄 "국내 주요 종목" 다섯 개.
 *
 * **이 목록은 프론트 임시값이다.** 종목 카탈로그를 목록으로 내려주는 API 가 없다 —
 * `GET /stocks/search` 는 검색어 두 글자 이상을 요구하고(`STOCK_SEARCH_MIN_KEYWORD_LENGTH`),
 * `GET /stocks/{stockCode}` 는 호출 자체가 최근 본 종목에 기록을 남긴다(contracts C51).
 * 고르기만 하는 화면에서 최근 본 목록을 오염시킬 수는 없다.
 *
 * `design.md` §7.16 의 미확정도 같은 말을 한다 — "현재는 종목 목록 앞 5개다.
 * 실제로는 시가총액 상위 같은 기준이 필요하지만 해당 API가 없다."
 *
 * **API 가 생기면 이 파일만 지우면 된다.** 종목명을 화면에 그리는 유일한 자리라
 * 여기 값이 실제 종목명과 다르면 화면에서 바로 드러난다.
 *
 * 랭킹·추천 API 는 만들지 않기로 확정했으므로(2026-09-07) 이 목록의 근거로
 * 랭킹을 기대하지 않는다. 카탈로그 목록 조회만 있으면 된다.
 */
export type MajorStock = {
  /** 6자리 문자열 (contracts C19) */
  stockCode: string;
  stockName: string;
  market: 'KOSPI' | 'KOSDAQ';
};

export const MAJOR_STOCKS: readonly MajorStock[] = [
  { stockCode: '005930', stockName: '삼성전자', market: 'KOSPI' },
  { stockCode: '000660', stockName: 'SK하이닉스', market: 'KOSPI' },
  { stockCode: '373220', stockName: 'LG에너지솔루션', market: 'KOSPI' },
  { stockCode: '035420', stockName: 'NAVER', market: 'KOSPI' },
  { stockCode: '035720', stockName: '카카오', market: 'KOSPI' },
];
