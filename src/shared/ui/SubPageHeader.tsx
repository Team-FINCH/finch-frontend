import { useLocation, useNavigate } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';

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
 * - `.nav`  — 높이 56px, `align-items:center`, `gap:4px`, 좌우 padding 15px
 * - `.ico`  — 44×44, 글자 20px, `border-radius:12px`, 눌림 배경 140ms 전환
 * - `.navt` — 18px/700, `letter-spacing:-.01em`, `flex:1`. 뒤로가기 뒤에 오면
 *   `padding-left:0`, 뒤로가기가 없으면 `padding-left:11px`(본문 여백 26px 에 맞춘다)
 *
 * 좌우 15px 은 `PageMain` 의 본문 여백 26px 보다 11px 안쪽이라 `-mx-2.75` 로
 * 그만큼 밖으로 뺀다. 눌림 배경은 프로토타입이 `rgba(31,35,40,.06)` 인데 대응 토큰이
 * 없어 주문 화면 인라인 뒤로가기가 쓰던 `--color-primary-soft` 를 따른다.
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
  className?: string;
};

export function SubPageHeader({
  title,
  showBack = true,
  fallbackTo = ROUTES.home,
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
      className={`-mx-2.75 flex h-14 flex-none items-center gap-1 ${className}`}
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
        className={`flex-1 text-title-3 font-bold tracking-[-.01em] text-text-primary ${
          showBack ? '' : 'pl-2.75'
        }`}
      >
        {title}
      </h1>
    </div>
  );
}
