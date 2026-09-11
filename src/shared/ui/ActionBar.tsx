import { type ComponentProps } from 'react';

import { useRegisterBottomFixedSpace } from '@/shared/hooks/useBottomFixedSpace';

/**
 * 화면 하단에 고정되는 액션 바.
 *
 * **근거는 프로토타입이다.** `design.md` §11 의 Light Action Row 는 이것이 아니다 —
 * 그쪽은 `매수 이유 기록하기` 처럼 본문 안에 놓이는 셰브런 달린 보조 CTA 행이고,
 * 하단 고정 바가 아니다. 프로토타입에는 대응하는 클래스 이름이 없고 두 화면이
 * 같은 인라인 스타일을 반복해 쓴다. 그 값을 여기로 모았다 —
 * `flex:none; padding:12px 26px 22px; border-top:1px solid var(--border);
 *  background:var(--surface)`.
 *
 * 쓰는 곳은 둘이다. 셋이 아니다.
 * - 주문 제출 (`{{ submit }}` 버튼을 감싼 바)
 * - 충전 제출 (`{{ doDeposit }}` 버튼을 감싼 바)
 *
 * **종목 상세는 쓰지 않는다.** 그 화면은 하단 탭바가 그대로 매수/매도 바로 바뀌는
 * 구조다 (프로토타입 `.tabpill.trade`). 액션 바를 겹쳐 두면 바가 둘이 된다.
 *
 * 바닥 여백에 safe-area 를 더하는 이유는 PageMain 과 같다 — 홈 인디케이터가 있는
 * 기기에서 제출 버튼이 그 밑에 깔린다. 프로토타입은 고정 크기 기기 프레임을 그린
 * 것이라 `env()` 를 쓰지 않는다. 실제 기기에서 필요해 우리가 더했다.
 *
 * 가로 폭을 PageMain 과 같은 `max-w-md` 로 맞춘다. 넓은 화면에서 본문은 가운데
 * 정렬인데 바만 화면 끝까지 가면 둘이 어긋나 보인다.
 *
 * **이 바를 쓰는 화면은 본문 아래에 바 높이만큼 여백을 둔다.** 고정 레이어라
 * 문서 흐름에서 자리를 차지하지 않아 마지막 내용이 바 밑에 가린다.
 *
 * 토스트가 이 바 위 14px 에 앉도록 자기 자리를 알린다 (FINCH-232).
 * 바를 쓰는 화면이 값을 따로 적지 않는다 — 알리는 것은 바 자신의 몫이다.
 * 근거는 `shared/hooks/useBottomFixedSpace.ts` 에 있다.
 */
export function ActionBar({ className = '', ...props }: ComponentProps<'div'>) {
  const bottomFixedRef = useRegisterBottomFixedSpace();

  return (
    <div
      {...props}
      ref={bottomFixedRef}
      className={
        'fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-border bg-surface px-6.5 pt-3 ' +
        `pb-[calc(1.375rem+env(safe-area-inset-bottom))] ${className}`
      }
    />
  );
}
