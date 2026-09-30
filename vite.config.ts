import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * 목 배포에서만 내보내는 `/sw.js`. **스스로를 지우는 것이 하는 일의 전부다.**
 *
 * 이 도메인은 전에 k3s 실배포를 서비스했고, 그때 방문한 브라우저에는 그쪽 PWA
 * 서비스 워커가 설치돼 있다. 목 배포로 바뀐 뒤 그 워커는 이렇게 걸린다.
 *
 *   1. precache 해 둔 **예전 앱**을 먼저 띄운다
 *   2. 갱신하려고 `/sw.js` 를 받는데 목 빌드에는 그 파일이 없어, `vercel.json` 의
 *      SPA 폴백이 `index.html` 을 돌려준다. 스크립트가 아니므로 갱신이 거부된다
 *   3. 예전 화면이 계속 뜨고 그 화면의 `/api/v1` 요청은 Vercel 에 없어 전부 실패한다
 *
 * 사이트 데이터를 지우기 전까지 풀리지 않는다. 시연에 쓴 폰과 앱으로 설치한 사람이
 * 여기 해당한다(2026-09-29 인프라 리뷰, PR #426).
 *
 * 그래서 **갱신 요청이 받아 갈 진짜 스크립트**를 하나 놓는다. 예전 워커가 이것으로
 * 교체되고, 교체되자마자 등록을 지우고 열려 있는 창을 다시 불러 목 앱이 뜬다.
 *
 * **`public/sw.js` 로 두지 않는다.** 그러면 실배포 빌드에서 PWA 가 만드는 `sw.js` 와
 * 부딪친다. 목 빌드에서만 내보내는 쪽이 안전하다.
 */
function retireLegacyServiceWorker(): Plugin {
  return {
    name: 'retire-legacy-sw',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  await self.registration.unregister();
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((c) => c.navigate(c.url));
})()));`,
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  /*
   * **`process.env` 가 아니라 `loadEnv` 다.**
   *
   * 설정 파일 안에서는 `.env` 가 `process.env` 로 들어오지 않는다. 셸 환경변수만
   * 보인다. 그래서 `process.env.VITE_ENABLE_MSW` 로 판정하면 Vercel(대시보드 변수를
   * 진짜 환경변수로 넣어 준다)은 맞게 돌지만, **로컬에서 `.env` 로 목을 켜면 목만
   * 켜지고 PWA 워커가 그대로 생겨** 이 설정이 막으려던 `/` 스코프 충돌이 난다.
   *
   * 화면 코드가 보는 `import.meta.env` 는 `.env` 를 읽으므로 두 판정이 어긋났고,
   * 검증을 셸 환경변수로만 해서 그 어긋남이 가려져 있었다 (2026-09-29 인프라 리뷰).
   * `loadEnv` 는 `.env` 와 셸 환경변수를 함께 보므로 양쪽이 같은 값을 본다.
   */
  const env = loadEnv(mode, process.cwd(), '');
  const isMock = env.VITE_ENABLE_MSW === 'true';

  return {
    // 워크트리마다 node_modules 가 master 를 가리키는 심볼릭 링크라
    // 기본 cacheDir(node_modules/.vite) 이 워크트리 사이에 공유된다.
    // 워크트리 안쪽으로 분리해 config 차이·동시 dev 서버 충돌을 예방한다.
    cacheDir: '.vite-cache',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        /*
         * **목 모드에서는 PWA 워커를 만들지 않는다.**
         *
         * 서비스 워커는 같은 스코프(`/`)를 둘이 가질 수 없다. 목 배포에서는 그
         * 자리를 `public/mockServiceWorker.js` 가 가져야 요청을 가로챈다. 아래
         * `devOptions` 주석이 dev 에서 같은 이유로 이 플러그인을 끈다고 적어 둔
         * 것과 같은 문제이고, 목으로 도는 프로덕션 빌드가 생기면서 그 갈래가
         * dev 밖으로 넓어졌다.
         *
         * 대가는 목 배포본이 앱으로 설치되지 않는 것이다. 웹으로 보는 용도라
         * 받아들인다(2026-09-29 사용자 결정). 실제 배포는 변수를 안 주므로
         * 그대로 설치된다.
         */
        disable: isMock,
        // devOptions 를 켜지 않는다 — 기본값이 false 라 dev 서버에서는 이 플러그인이
        // 서비스 워커를 등록하지 않는다. `public/mockServiceWorker.js` 가 개발에서
        // 이미 같은 스코프(`/`)에 서비스 워커를 등록하므로, 둘을 동시에 켜면 스코프를
        // 다툰다 (FINCH-287). PWA 워커는 프로덕션 빌드에서만 켠다.
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        workbox: {
          // `/api/` 를 프리캐시·런타임캐시 어느 쪽에도 넣지 않는다. 시세·잔고가 캐시된
          // 낡은 값으로 보이는 것이 증권 서비스에서 가장 나쁜 고장이다. 기본
          // globPatterns 는 정적 빌드 산출물(JS·CSS·HTML·이미지)만 잡고 `/api/` 요청은
          // 애초에 대상이 아니라 runtimeCaching 항목을 아예 추가하지 않는다.
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          // MSW 의 개발 전용 서비스 워커를 프로덕션 프리캐시 목록에서 뺀다. public/
          // 아래 있어 dist/ 로 그대로 복사되고 기본 globPatterns 가 잡아버린다.
          globIgnores: ['**/mockServiceWorker.js'],
        },
        // 매니페스트는 플러그인이 생성하지 않는다. `public/manifest.webmanifest` 정적
        // 파일로 직접 쓴다 — `public/` 아래 파일은 Vite 가 그대로 `dist/` 루트에 복사한다.
        // 파일명 `.webmanifest` 의 MIME 타입(`application/manifest+json`)이 nginx 기본
        // mime.types 에 없어 회신 대기 중이다 (GitLab #88). 회신이 늦어도 설치가 되도록,
        // 이 경로가 나오는 곳을 `public/manifest.webmanifest` 파일명과 `index.html` 의
        // `<link rel="manifest">` 한 곳으로만 묶어 뒀다 — 회신이 안 오면 파일명을
        // `manifest.json` 으로 바꾸는 것이 이 두 곳만 고치면 끝난다.
        manifest: false,
      }),
      // 목 빌드에만 넣는다. 실배포 빌드에서는 PWA 가 진짜 `sw.js` 를 만든다.
      ...(isMock ? [retireLegacyServiceWorker()] : []),
    ],
    resolve: {
      alias: {
        // tsconfig.app.json 의 paths 와 반드시 같은 값을 유지한다.
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy: {
        // MSW 를 껐을 때 실제 백엔드로 넘기는 폴백 경로. 위와 같은 이유로 `loadEnv`
        // 가 읽은 값을 쓴다 — `process.env` 면 `.env` 에 적은 주소가 무시된다.
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  };
});
