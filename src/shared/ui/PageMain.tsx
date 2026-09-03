import { type ComponentProps } from 'react';

/**
 * 페이지 골격. 모바일 우선으로 만들고 넓은 화면은 중앙 정렬 + 최대 너비 제한으로만
 * 대응한다 (컨벤션 §9).
 *
 * 좌우 여백 26px 은 프로토타입 `.sc`·`.tabs` 의 화면 여백이다 (px-6.5 = 26px).
 * design.md §5 는 20px 이라고 적었지만 프로토타입이 1차 근거다.
 * Tailwind v4 는 간격 스케일에 소수 배수를 허용해 6.5 = 26px 로 나온다.
 *
 * 하단 여백에 safe-area 를 더하는 이유 — 홈 인디케이터가 있는 기기에서 마지막 버튼이
 * 그 밑에 깔린다. 페이지마다 손으로 적으면 빠뜨린 화면에서만 조용히 어긋난다.
 */
export function PageMain({ className = '', ...props }: ComponentProps<'main'>) {
  return (
    <main
      {...props}
      className={`mx-auto w-full max-w-md px-6.5 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] ${className}`}
    />
  );
}
