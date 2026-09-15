import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  // 워크트리마다 node_modules 가 master 를 가리키는 심볼릭 링크라
  // 기본 cacheDir(node_modules/.vite) 이 워크트리 사이에 공유된다.
  // 워크트리 안쪽으로 분리해 config 차이·동시 dev 서버 충돌을 예방한다.
  cacheDir: '.vite-cache',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
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
      // MSW 를 껐을 때(VITE_ENABLE_MSW=false) 실제 백엔드로 넘기는 폴백 경로.
      '/api': {
        target: process.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
