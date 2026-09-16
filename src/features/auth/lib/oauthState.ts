/**
 * OAuth state 파라미터를 만들고 되돌아왔을 때 대조한다.
 *
 * 카카오로 이동하면 페이지가 언로드되므로 돌아왔을 때 변수도 스토어도 비어 있다.
 * 왕복하는 동안 살아남을 곳이 필요하고 그게 state 파라미터와 sessionStorage 다.
 * 담기는 것은 자격증명이 아니라 일회용 난수라 토큰 보관 규칙과 무관하다.
 *
 * **state 가 하는 일은 하나다 — CSRF 방어.** 공격자의 인가 코드가 담긴 콜백 URL 을
 * 피해자가 열면 공격자 계정으로 로그인이 붙는다. 우리가 만든 난수와 대조해야
 * 우리가 시작한 로그인임을 안다.
 *
 * **돌아갈 경로는 더 이상 싣지 않는다** (FINCH-295). 로그인 착지는 언제나
 * 홈이라 운반할 값이 없다 — 경로를 실을 자리를 남겨 두면 "언제나 홈" 과 "원래
 * 가려던 곳" 두 규칙이 같이 살아 있게 된다. 경로를 되살릴 일이 생기면
 * `PendingOauth` 에 필드를 다시 더하고 `toSafeRedirectPath` 같은 검사를 함께
 * 되살려야 한다 — `//evil.com` 처럼 `/` 로 시작하면서 바깥으로 나가는 값이 있다.
 *
 * 읽기와 지우기를 나눠 둔 이유 — 합치면 읽는 쪽이 부수효과를 갖게 되어 렌더 중에
 * 부를 수 없고, 리렌더 한 번에 값이 사라져 교환 중인 화면이 실패로 뒤집힌다.
 */

const STORAGE_KEY = 'auth.pendingOauth';

type PendingOauth = {
  state: string;
};

/**
 * crypto.randomUUID 는 보안 컨텍스트에서만 있다. 폰에서 `http://192.168.x.x:5173` 으로
 * 열면 없어서 로그인 버튼이 그 자리에서 터진다. getRandomValues 는 그 제약이 없다.
 */
function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

function isPendingOauth(value: unknown): value is PendingOauth {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.state === 'string';
}

function readPendingOauth(): PendingOauth | null {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }

  if (raw === null) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  return isPendingOauth(parsed) ? parsed : null;
}

/**
 * 난수를 만들어 저장하고 인가 URL 에 실을 값을 돌려준다.
 * 저장에 실패해도(사생활 보호 모드 등) 요청은 보낸다. 대신 돌아왔을 때 대조에
 * 실패해 로그인이 거절된다 — 확인할 수 없는 콜백을 통과시키는 것보다 낫다.
 */
export function createOauthState(): string {
  const state = createNonce();
  const pending: PendingOauth = { state };

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // 저장할 수 없는 환경이다. 실패는 콜백에서 드러난다.
  }

  return state;
}

/** 우리가 시작한 로그인이 맞는지만 본다. 읽기만 한다. */
export function isOauthStateMatched(returnedState: string | null): boolean {
  if (returnedState === null) {
    return false;
  }

  const pending = readPendingOauth();
  return pending !== null && pending.state === returnedState;
}

/** 대조 결과와 무관하게 버린다. 남기면 같은 난수로 두 번째 콜백이 통과한다. */
export function clearOauthState(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // 읽을 수 없었던 환경이면 지울 것도 없다.
  }
}
