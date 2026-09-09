import { type ReactNode } from 'react';

/**
 * 빈 상태 (design.md §10 Empty · §13 Empty State).
 * 알림함 · 관심 목록 · 진단 콜드 스타트 · 나의 투자 기준 · 404 가 같은 모양을 쓴다.
 *
 * 치수는 프로토타입 `.est` 실측이다 — 가운데 정렬 · 여백 위 56px 좌우 24px
 * 아래 40px · 캐릭터 120px · 제목까지 20px · 설명까지 8px · 동작 버튼까지 24px.
 *
 * 글자 위계도 `.est` 를 따른다 — 제목 `b` 17px/23px/600 `--t2`,
 * 설명 `p` 15px/22px 이고 폭을 270px 로 묶는다. 제목을 `text-title-3`(18px/600)로
 * 두면 섹션 제목과 같은 크기가 돼 화면 전체를 채우는 빈 상태가 섹션처럼 읽힌다.
 *
 * 설명 색만 프로토타입과 다르다. `.est>p` 는 `--t3` 인데 우리는
 * `--color-text-secondary` 를 쓴다 — `--color-text-muted`(=`--t3`)는 흰 배경 대비
 * 3.90 으로 작은 글씨 AA 에 미달이고, 빈 상태 설명은 읽어야 하는 문장이다
 * (토큰 파일 `--color-text-muted` 주석). 위계는 크기·굵기가 만든다.
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
   * 프로토타입 `.est>img` 가 폭 120px · 불투명도 0.16 으로 그렇게 쓴다.
   * 캐릭터 이미지 자체는 프로토타입 번들 안에만 있어 우리 레포에 없다 — 시안 요청이다.
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
      className={`flex flex-col items-center px-6 pt-14 pb-10 text-center ${className}`}
    >
      {illustration === undefined ? null : (
        <div
          aria-hidden="true"
          className="w-30 flex-none opacity-[0.16] [&>*]:h-auto [&>*]:w-full"
        >
          {illustration}
        </div>
      )}
      <p
        className={`text-[17px] leading-[23px] font-semibold text-text-secondary ${
          illustration === undefined ? '' : 'mt-5'
        }`}
      >
        {title}
      </p>
      {description === undefined ? null : (
        <p className="mt-2 max-w-[270px] text-body-2 text-pretty break-keep text-text-secondary">
          {description}
        </p>
      )}
      {action === undefined ? null : <div className="mt-6">{action}</div>}
    </div>
  );
}
