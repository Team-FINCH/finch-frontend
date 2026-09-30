import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';
import { installChunkRecovery } from '@/app/installChunkRecovery';
import { installAuthBridge } from '@/features/auth';
import '@/styles/index.css';

/**
 * MSW 는 반드시 동적 import 로만 연다.
 * 정적 import 면 트리셰이킹이 되지 않아 프로덕션 번들에 목 코드가 들어간다.
 * 그리고 render 보다 먼저 await 해야 첫 쿼리가 워커 등록과 경합하지 않는다.
 *
 * `import.meta.env.VITE_ENABLE_MSW` 를 여기 직접 적는 이유가 있다. 번들러는 이
 * 표현을 리터럴로 치환해 꺼져 있으면 블록 전체를 지운다. 다른 모듈에서 불린으로
 * 감싸 가져오면 치환이 블록까지 닿지 않아 MSW 청크가 프로덕션에 남는다.
 * `shared/config/env` 의 `IS_MOCK_MODE` 가 같은 조건이고, 화면 코드는 그쪽을 쓴다.
 *
 * **`DEV` 조건을 뺐다.** 목 서버로 도는 배포(Vercel)가 생겨서 프로덕션 빌드에서도
 * 켤 수 있어야 한다. 대신 기본값을 꺼짐으로 뒤집었다 — 사유는 `IS_MOCK_MODE` 주석.
 */
async function enableMocking(): Promise<void> {
  if (import.meta.env.VITE_ENABLE_MSW === 'true') {
    const { worker } = await import('@/mocks/browser');
    // 'bypass' 면 목이 못 잡은 요청이 조용히 프록시로 새어 나간다. 개발에는 백엔드가
    // 없어서 그 요청은 응답이 오지 않고, 화면은 영영 로딩에 갇힌다 — 원인이 콘솔
    // 어디에도 안 남는다. 경고를 남기고 통과시킨다.
    await worker.start({ onUnhandledRequest: 'warn' });
  }
}

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('#root 엘리먼트를 찾을 수 없습니다');
}

// 렌더보다 먼저 꽂는다. 컴포넌트 안에서 꽂으면 그보다 먼저 나간 요청에 토큰이 안 붙는다.
installAuthBridge();

// 라우터가 뜨기 전에 등록한다 (FINCH-304). 라우트가 전부 lazy 라 첫 화면부터
// 청크를 받는데, 그보다 늦게 붙으면 바로 그 실패를 놓친다. `window` 리스너라
// React 트리 밖이고, `enableMocking` 의 await 보다도 앞이어야 한다.
installChunkRecovery();

void enableMocking().then(() => {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
