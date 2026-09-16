import { useEffect } from 'react';
import { useRouteError } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';
import { Button } from '@/shared/ui/Button';
import { PageMain } from '@/shared/ui/PageMain';

/**
 * 라우트에서 난 오류를 받는 화면 (FINCH-304). 라우터의 `errorElement` 다.
 *
 * **이것이 없으면 react-router 의 개발자용 기본 화면이 그대로 뜬다.** 배포본에서
 * `Unexpected Application Error!` 와 모듈 URL, 그리고 `💿 Hey developer 👋`
 * ("provide your own ErrorBoundary or errorElement") 까지 사용자가 봤다.
 * 시연 중에 이것이 뜨면 최악이다.
 *
 * ## 새 디자인이 아니다
 *
 * 문체·치수·버튼은 `pages/NotFoundPage` 를 그대로 따른다 — 같은 성격의 전면 오류
 * 화면이고, 둘이 갈리면 같은 앱에서 오류 화면이 두 벌이 된다. 껍데기와 `PageMain`
 * 조합도 같다 (`shared/ui/PageMain` 주석의 "껍데기가 높이를 주고 나서야
 * `justify-center` 가 실제로 세로 가운데로 온다").
 *
 * ## 두 버튼 다 문서를 새로 받는다
 *
 * 여기까지 오는 가장 흔한 길이 배포 중 청크 로드 실패다(`app/installChunkRecovery`).
 * 그 경우 이 탭은 **옛 `index.html`** 을 들고 있어서, 라우터 안에서 이동하는
 * `<Link>` 로 홈에 가 봐야 같은 문서가 같은 해시의 청크를 다시 요청해 또 실패한다.
 * `window.location` 으로 나가야 브라우저가 새 문서를 받아 실제로 낫는다.
 * 그래서 `shared/ui/Button` 의 `LinkButton` 이 아니라 `Button` 이다 — 생김새는
 * 같은 상수(`BASE_CLASS`)에서 나오므로 404 화면의 버튼과 다르지 않다.
 *
 * ## 화면에 개발자용 정보를 남기지 않는다
 *
 * 스택 트레이스와 모듈 URL 은 콘솔에만 적는다. 컨벤션 §7 의 "에러 메시지는 서버가
 * 준 `message` 를 쓰고, 스택이나 응답 원문은 노출하지 않는다. 원문은 콘솔에
 * 남긴다" 이고, `app/AppErrorBoundary` 도 같은 방식이다.
 *
 * **개발 환경에서만 보이는 블록도 두지 않았다.** 개발에서는 `console` 과 Vite
 * 오버레이가 이미 같은 것을 더 자세히 보여 주고, 개발자만 보는 분기는 아무도 보지
 * 않는 채로 썩는다. 무엇보다 이 화면이 실제로 필요한 상황(배포 중 청크 실패)은
 * 프로덕션 빌드에서만 나므로, 그 분기는 정작 문제가 나는 곳에서 꺼져 있다.
 */
export function RouteErrorPage() {
  const error = useRouteError();

  // 렌더 중에 적지 않는다. StrictMode 의 이중 렌더로 두 번 찍히고, 렌더는 순수해야 한다.
  useEffect(() => {
    console.error('[RouteErrorPage]', error);
  }, [error]);

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden bg-bg shadow-page-column">
      {/* 앱 셸 — 본문만 이 안에서 굴러간다 (FINCH-297, `shared/ui/PageMain` 주석). */}
      {/* 모바일 폭 기둥을 여기서 한 번 더 두른다 (FINCH-269). `errorElement` 는
          자기가 달린 라우트의 `element` 를 **대신** 그리므로, 이 화면이 뜨는 동안
          `RootLayout` 의 기둥은 없다. 두르지 않으면 데스크톱에서 오류 화면만 기둥
          바깥 색(--color-page-surround, "앱 아님") 위에 떠서 앱이 사라진 것처럼 보인다. */}
      <PageMain className="flex flex-col justify-center pt-6">
        <h1 className="text-lg font-semibold text-text-primary">
          화면을 열지 못했습니다
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          앱이 업데이트되는 중일 수 있습니다. 다시 시도해 주세요
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Button onClick={() => window.location.reload()}>다시 시도</Button>
          <Button
            variant="secondary"
            onClick={() => window.location.assign(ROUTES.home)}
          >
            홈으로
          </Button>
        </div>
      </PageMain>
    </div>
  );
}
