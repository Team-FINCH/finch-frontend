/**
 * 지수 `indexCode` 한글 라벨 (apiSpec §5.7 — "표시용 이름은 내려주지 않는다.
 * `indexCode` 를 화면이 라벨로 바꾼다").
 *
 * 모르는 코드는 코드 문자열을 그대로 보여준다. USD-KRW · NASDAQ 이 나중에
 * 범위에 들어오면 여기 두 줄을 더하는 것으로 끝난다 — 못 찾았다고 자리를
 * 비우면 값은 있는데 이름만 없는 줄이 된다.
 */
const INDEX_LABEL: Record<string, string> = {
  KOSPI: '코스피',
  KOSDAQ: '코스닥',
};

export function marketIndexLabel(indexCode: string): string {
  return INDEX_LABEL[indexCode] ?? indexCode;
}
