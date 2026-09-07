import { type ReactNode } from 'react';

/**
 * "최근 검색어" · "최근 본 종목" 처럼 오른쪽에 보조 동작이 붙는 작은 섹션 머리.
 *
 * 프로토타입 실측 — 라벨 13px 600 `--t3`, 오른쪽 동작도 13px `--t3`,
 * `align-items:baseline` 으로 두 글자의 밑선을 맞춘다.
 *
 * `shared/ui` 의 것과 다르다. 저쪽 `.sh`/`.sht` 는 18px 굵은 제목이고 이것은
 * 목록 위에 얹는 13px 라벨이다. 공통 컴포넌트로 올리지 않고 이 기능 안에 둔다
 * (새 공통 컴포넌트는 features 안에 만든다는 티켓 지시).
 */
type SearchSectionHeaderProps = {
  label: string;
  action?: ReactNode;
};

export function SearchSectionHeader({
  label,
  action,
}: SearchSectionHeaderProps) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <span className="text-caption font-semibold text-text-muted">
        {label}
      </span>
      {action}
    </div>
  );
}
