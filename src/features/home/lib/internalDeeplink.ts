/**
 * 브리핑 항목의 `deeplink` 가 **앱 안 주소인지** 본다 (FINCH-324).
 *
 * ## 왜 필요한가
 *
 * `deeplink` 는 AI 서버가 만들어 보내는 문자열이고 우리가 만든 값이 아니다
 * (`ia.md` §2 · `shared/config/routes.ts` 주석). 그런데 `react-router` 의 `Link`
 * 는 `to` 가 외부 오리진이나 `javascript:` 같은 다른 스킴이면 **SPA 링크로 그리지
 * 않고 평범한 `<a href>` 로 내보낸다** (react-router 7.18.2). 즉 누르면 앱을 나간다.
 * AI 가 경로를 잘못 만들거나 모델이 다른 문자열을 뱉는 날, 사용자는 브리핑을
 * 누르고 우리 앱 밖으로 나가게 된다.
 *
 * ## 무엇을 보는가 — 앱 안 주소인지만 본다
 *
 * 라우트 표와 대조하지 않는다. `/` 로 시작하고 **오리진을 바꿀 수 없는 모양**이면
 * 통과다. 라우트까지 대조하면 AI 가 새 화면 경로를 먼저 내보내기 시작했을 때
 * 멀쩡한 링크가 함께 죽고, 그 대조표를 라우트가 늘 때마다 같이 고쳐야 한다.
 * 존재하지 않는 앱 내부 경로는 이미 `NotFoundPage` 가 받는다 — 그쪽에는 나갈 길이
 * 있으므로 여기서 미리 막을 이유가 없다.
 *
 * 막는 모양은 셋이다.
 * - `/` 로 시작하지 않는 전부 — `https://…` · `javascript:…` · `mailto:…` ·
 *   `stocks/000660`(상대 경로라 지금 주소에 따라 엉뚱한 곳으로 붙는다)
 * - `//evil.example` — **프로토콜 상대 주소**다. `/` 로 시작하지만 오리진이 바뀐다
 * - `/\evil.example` — 위와 같은 것이다. 브라우저의 URL 파서가 `\` 를 `/` 로
 *   정규화하므로 `//evil.example` 과 같게 취급된다. `/` 하나만 세면 빠져나간다
 */
export function isInternalDeeplink(deeplink: string): boolean {
  if (!deeplink.startsWith('/')) {
    return false;
  }

  // 두 번째 글자가 `/` 나 `\` 면 오리진이 바뀌는 주소다.
  const second = deeplink[1];
  return second !== '/' && second !== '\\';
}
