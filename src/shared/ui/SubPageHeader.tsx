import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';
import { HomeLink } from '@/shared/ui/HomeLink';

/**
 * 하단 탭에 없는 하위 화면(입금·출금·매매 내역·알림함·브리핑 전체 등)이 공유하는
 * 상단 헤더 — 뒤로가기 `‹` + 화면 제목. 탭 화면 셋(홈·포트폴리오·마이페이지)의
 * 제목 + 알림함 뱃지 헤더는 `PageHeader` 다. 둘은 다른 컴포넌트다 — 탭 화면에는
 * 뒤로가기가 없고, 하위 화면에는 알림함 뱃지가 없다(ia.md §1 "알림함" 절).
 *
 * **원래 화면마다 인라인으로 따로 그려져 있던 것을 여기로 올렸다.** `PageHeader`
 * 가 세 탭 화면의 중복을 셋으로 확인한 시점에 합쳐진 것과 같은 경위다 — 매매 내역·
 * 알림함·브리핑 전체·주문 네 화면이 각자 `‹` 버튼을 그렸고(aria-label 이 `뒤로`·
 * `뒤로가기`·`뒤로 가기` 로 서로 달랐고, 크기도 40px 과 44px 이 섞였다), 입금·출금
 * 다섯 화면에는 뒤로가기가 아예 없어 마이페이지에서 들어가면 나올 길이 없었다
 * (FINCH-196). 마크업의 기준은 프로토타입 `.nav` 묶음이다(디코드본 L1038-1042).
 *
 * 프로토타입 실측값:
 * - `.nav`  — 높이 56px, `align-items:center`, `gap:4px`, 좌우 padding 15px.
 *   그 56px 은 `--page-header-height` 다 — `PageHeader` 와 값을 함께 쓴다
 * - `.ico`  — 44×44, 글자 20px, `border-radius:12px`, 눌림 배경 140ms 전환
 * - `.navt` — 18px/700, `letter-spacing:-.01em`, `flex:1`. 뒤로가기 뒤에 오면
 *   `padding-left:0`, 뒤로가기가 없으면 `padding-left:11px`(본문 여백 26px 에 맞춘다)
 *
 * 눌림 배경은 프로토타입이 `rgba(31,35,40,.06)` 인데 대응 토큰이 없어 주문 화면
 * 인라인 뒤로가기가 쓰던 `--color-primary-soft` 를 따른다.
 *
 * ## 스크롤 밖에 선다 — `PageMain` 의 형제다
 *
 * **`PageHeader` 와 같은 자리에 선다.** `PageMain` 안이 아니라 바로 앞 형제다 —
 * 안에 있으면 본문과 함께 굴러 올라가 잘린다. 근거와 경위(`sticky top-0 -mt-6` 로
 * 흉내 내다 실패한 FINCH-231)는 `PageHeader` 주석의 같은 절에 있고, 하위 화면
 * 전부를 그 구조로 맞춘 것이 FINCH-297 이다.
 *
 * 그래서 좌우 여백·최대 너비·가운데 정렬을 **직접 갖는다**
 * (`mx-auto w-full max-w-md px-3.75`). 좌우 15px 은 프로토타입 `.nav` 실측값이다.
 * 전에는 `PageMain` 안에 있는 것을 전제로 그 26px 여백에서 `-mx-2.75`(−11px) 를
 * 빼 15px 을 만들었는데, 밖으로 나오면 뺄 여백 자체가 없다.
 *
 * **뒤로가기 동작은 프로토타입 `back()` 과 같다** — 히스토리 스택을 하나 되돌리고,
 * 스택이 비었으면 홈으로 간다(`app-logic.js` `back(){ ... k.pop()||"home" }`).
 * 새 탭에서 주소로 바로 열었을 때 `navigate(-1)` 은 우리 앱 밖으로 나가 버리므로,
 * 그때 갈 곳은 `fallbackTo` 로 호출부가 정한다(기본은 홈). 진입 판정은 react-router
 * 의 `useLocation().key` 다 — 앱이 처음 그린 위치의 key 는 `"default"` 고, 앱 안에서
 * 이동해 온 위치는 고유 key 를 받는다.
 *
 * **`showBack={false}` 는 결제 결과 화면 전용이다.** 프로토타입 `isPayReturn` 은
 * 제목 `결제 결과` 만 두고 뒤로가기를 일부러 뺐다(L2714) — 결제가 끝난 뒤 되돌아가면
 * 이중 확정이 날 자리다(design.md "결제 복귀": "이 화면에는 탭바도 뒤로가기도 없어").
 *
 * 아래 여백은 컴포넌트가 갖지 않는다 — `PageHeader` 와 같은 이유로 호출부가
 * `className` 으로 정한다.
 */
type SubPageHeaderProps = {
  title: string;
  /** 뒤로가기 `‹` 를 그린다. 결제 결과 화면만 `false` 다. 기본 `true`. */
  showBack?: boolean;
  /** 앱 안에 되돌아갈 곳이 없을 때(새 탭에서 바로 열었을 때) 갈 경로. 기본 홈. */
  fallbackTo?: string;
  /**
   * 오른쪽 끝 홈 버튼을 그린다. 기본 `true` — **끄는 화면은 아직 없다.**
   *
   * 하위 화면에는 하단 탭 바가 없어서(그쪽은 탭 화면 넷 전용) 홈으로 가려면
   * 뒤로가기를 온 만큼 눌러야 했다. 뒤로가기가 **한 칸**이고 이것이 **끝까지**다.
   */
  showHome?: boolean;
  /** 제목과 홈 버튼 사이에 놓을 화면 전용 동작. 헤더 흐름 안에서 폭을 차지한다. */
  action?: ReactNode;
  className?: string;
};

export function SubPageHeader({
  title,
  showBack = true,
  fallbackTo = ROUTES.home,
  showHome = true,
  action,
  className = '',
}: SubPageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  function handleBack() {
    if (location.key === 'default') {
      void navigate(fallbackTo, { replace: true });
      return;
    }
    void navigate(-1);
  }

  return (
    <div
      className={`mx-auto flex h-(--page-header-height) w-full max-w-md flex-none items-center gap-1 px-3.75 ${className}`}
    >
      {showBack ? (
        <button
          type="button"
          onClick={handleBack}
          aria-label="뒤로가기"
          className="flex size-11 flex-none items-center justify-center rounded-12 text-[20px] leading-none text-text-primary transition-colors duration-(--motion-fast) active:bg-primary-soft"
        >
          ‹
        </button>
      ) : null}
      <h1
        className={`min-w-0 flex-1 text-section-title text-text-primary ${
          showBack ? '' : 'pl-2.75'
        }`}
      >
        {title}
      </h1>
      {action === undefined ? null : (
        <div className="flex h-full flex-none items-center">{action}</div>
      )}
      {/*
        홈으로 (FINCH-269). `showBack={false}` 인 결제 결과 화면에도 **그린다** —
        그 화면은 뒤로가기를 일부러 뺀 자리라(이중 확정 방지) 나갈 길이 본문 버튼
        하나뿐인데, 승인 대기 상태에서는 그 버튼조차 비어 있어 아예 갇힌다.
        홈으로 가는 것은 이중 확정과 무관하므로 막을 이유가 없다.

        `button` + `navigate` 가 아니라 `Link` 다. 링크는 새 탭으로 열거나 주소를
        복사할 수 있어야 하고, 이 동작에는 뒤로가기처럼 "스택을 몇 칸 되돌릴까" 하는
        판단이 없다 — 언제나 홈 한 곳이다.
      */}
      {showHome ? <HomeLink /> : null}
    </div>
  );
}
