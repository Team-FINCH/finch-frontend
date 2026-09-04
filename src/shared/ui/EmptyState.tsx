import { type ReactNode } from 'react';

/**
 * 빈 상태 (design.md §10 Empty · §13 Empty State).
 * 알림함 · 관심 목록 · 진단 콜드 스타트 · 나의 투자 기준 · 404 가 같은 모양을 쓴다.
 *
 * 치수는 프로토타입의 빈 상태 마크업에서 읽었다 —
 * 가운데 정렬 · 위아래 여백 70~80px · 캐릭터 132px · 제목까지 16px · 설명까지 8px ·
 * 동작 버튼까지 24px.
 *
 * **`데이터가 없습니다`를 쓰지 않는다** (design.md §13).
 * 지금 무엇이 없는지와 무엇을 하면 채워지는지를 한 문장씩 적는다.
 */

type EmptyStateProps = {
  /** `아직 관심 종목이 없어요.` 처럼 지금 상태를 적는다 */
  title: string;
  /** 무엇을 하면 채워지는지 한 줄 */
  description?: ReactNode;
  /** `Button` · `LinkButton` 을 넣는다. 없으면 자리를 만들지 않는다 */
  action?: ReactNode;
  /**
   * 캐릭터 일러스트 자리. **에셋은 아직 붙이지 않았다.**
   * `design.md` §3 이 제품 UI 에서 상세 캐릭터를 제한하고 마케팅·온보딩 용도로만 두므로,
   * 여기 들어가는 것은 브랜드 마크(새 실루엣)를 워터마크처럼 흐리게 깐 것이다 —
   * 프로토타입이 폭 132px · 불투명도 0.16 으로 그렇게 쓴다.
   * 넘기지 않으면 자리 자체를 만들지 않는다. 빈 네모가 남는 것보다 낫다.
   */
  illustration?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  illustration,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center px-5 py-17.5 text-center ${className}`}
    >
      {illustration === undefined ? null : (
        <div
          aria-hidden="true"
          className="w-33 flex-none opacity-[0.16] [&>*]:h-auto [&>*]:w-full"
        >
          {illustration}
        </div>
      )}
      <p className="mt-4 text-title-3 text-text-primary">{title}</p>
      {description === undefined ? null : (
        <p className="mt-2 text-body-2 text-pretty text-text-secondary">
          {description}
        </p>
      )}
      {action === undefined ? null : <div className="mt-6">{action}</div>}
    </div>
  );
}
