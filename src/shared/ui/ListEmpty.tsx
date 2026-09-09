import { type ReactNode } from 'react';

import { SoftBox } from './SoftBox';

/**
 * 목록 자리의 빈 상태. 화면 전체를 채우는 `EmptyState` 와 다른 물건이다.
 *
 * 프로토타입은 목록이 비었을 때 그 자리에 옅은 회색 면(`.soft`)을 깔아 "목록이
 * 있어야 하는 곳" 임을 남긴다 — 홈의 내 종목·관심 종목, 포트폴리오 보유 탭이
 * 같은 모양을 쓴다. 실측은 `.soft` 안에 가운데 정렬 · 제목 16px/500 ·
 * 설명까지 6px · 동작까지 14px 이고, 위아래 여백만 자리마다 다르다
 * (홈 내 종목 28px · 홈 관심 종목과 포트폴리오 24px).
 * 그 여백은 호출부가 `className` 으로 정한다.
 *
 * **캐릭터 일러스트는 넣지 않는다.** 프로토타입의 전면 빈 상태(`.est`)는 캐릭터를
 * 쓰지만 목록 안 빈 상태에는 없고, 캐릭터 에셋 자체가 프로토타입 번들 안에만
 * 있어 우리 레포에 없다 — 시안 요청으로 남아 있다.
 *
 * **`데이터가 없습니다`를 쓰지 않는다** (design.md §13).
 * 지금 무엇이 없는지와 무엇을 하면 채워지는지를 한 문장씩 적는다.
 */
type ListEmptyProps = {
  /** `아직 보유 종목이 없어요.` 처럼 지금 상태를 적는다 */
  title: string;
  /** 무엇을 하면 채워지는지 한 줄 */
  description: string;
  /** 회색 면 위에 놓이는 동작. 프로토타입은 `.chip.sel`(검정 캡슐)을 쓴다 */
  action?: ReactNode;
  /** 위아래 여백을 자리마다 정한다. 예: `py-7` */
  className?: string;
};

export function ListEmpty({
  title,
  description,
  action,
  className = '',
}: ListEmptyProps) {
  return (
    <SoftBox className={`px-5 text-center ${className}`}>
      <p className="text-body-1 font-medium text-text-primary">{title}</p>
      <p className="mt-1.5 text-body-2 text-pretty text-text-secondary">
        {description}
      </p>
      {action === undefined ? null : <div className="mt-3.5">{action}</div>}
    </SoftBox>
  );
}
