/**
 * 멱등성 키를 만든다 (apiSpec §1.4 · contracts C30).
 *
 * **UUID v4 다.** 클라이언트가 만들고, 같은 클릭의 재시도는 같은 키를 다시 쓰며
 * 새 클릭은 새 키를 쓴다. 키를 재사용하면 서버가 첫 결과를 그대로 되돌려 주므로
 * 네트워크가 끊겨 응답을 못 받은 주문이 두 번 체결되지 않는다.
 *
 * `crypto.randomUUID` 는 보안 컨텍스트(https · localhost)에서만 있다. 개발 중
 * LAN IP 로 열어 보는 경우가 있어 폴백을 둔다 — 폴백은 암호학적 품질이 아니지만
 * 이 값은 비밀이 아니라 충돌만 피하면 되는 식별자다.
 */
export function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.trunc(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
