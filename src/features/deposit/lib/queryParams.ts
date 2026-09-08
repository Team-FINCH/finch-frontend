/**
 * URL 쿼리에서 읽은 양의 정수. 없거나 정수가 아니면 `null` 이다.
 *
 * **`Number()` 만 쓰면 안 된다.** `Number('abc')` 는 `NaN` 이고 `NaN !== null` 이라
 * 호출부의 널 검사를 그대로 통과해 `NaN` 이 그대로 요청 본문에 실린다. 서버는
 * 400 을 주고 사용자는 이유를 모른다 — 결제 복귀 URL 은 우리가 만드는 값이 아니라
 * PG 가 붙여 보내는 값이라 형식을 믿을 수 없다.
 */
export function parsePositiveIntParam(value: string | null): number | null {
  if (value === null || value.trim() === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
