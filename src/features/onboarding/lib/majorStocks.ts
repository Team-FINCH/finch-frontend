/**
 * 온보딩 첫 화면에 보여줄 "국내 주요 종목".
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
 *
 * ## 서비스 종목 안에서만 고른다
 *
 * **여기 적힌 코드는 전부 백엔드 `application.yaml` 의 `finch.universe.codes`
 * (2026-09-14 확정, 30개) 안에 있어야 한다.** 밖의 종목은 검색에도 안 나오고
 * 관심 종목 등록이 `STOCK_NOT_FOUND` 로 막힌다 — 고르기 화면에 내놓고 고르면
 * 실패하는 종목을 두는 셈이다.
 *
 * `373220`(LG에너지솔루션)이 그랬다 (FINCH-300). 채우지 않고 뺐다 —
 * 다섯이라는 수부터가 근거 없는 값이라(design.md §7.16 미확정) 대신 넣을 종목을
 * 고르는 것도 같은 근거 없는 선택이 된다.
 *
 * **개수가 아니라 이 제약이 규칙이다.** 목록을 늘리거나 줄일 때 수는 자유지만
 * 유니버스 밖 종목은 넣지 않는다.
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
  { stockCode: '035420', stockName: 'NAVER', market: 'KOSPI' },
  { stockCode: '035720', stockName: '카카오', market: 'KOSPI' },
];
