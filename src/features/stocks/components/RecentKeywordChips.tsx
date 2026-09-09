import { type RecentSearchKeyword } from '@/shared/types/stock';

/**
 * 최근 검색어 칩 (프로토타입 `showBrowse` 안의 "최근 검색어" 묶음).
 *
 * **이 목록에서 종목 상세로 곧장 갈 수 없다.** 저장되는 것이 종목이 아니라 문자열이라
 * `stockCode` 자리가 없다 (apiSpec §6.2, 이슈 #23 2번 회신). 누르면 검색을 다시
 * 실행하는 것이 전부다 — 그래서 `onPick` 이 검색어를 돌려준다.
 *
 * 실측값 — 칩 높이 28px · 반경 8px · 가로 스크롤(`overflow-x:auto`, 스크롤바 숨김) ·
 * 칩 사이 6px. 반경은 `--radius-tag`(8px) 다 — 거래정지 뱃지와 같은 값이라
 * FINCH-209 가 토큰으로 세웠다. `--radius-sm`(10px)은 프로토타입에서 읽은
 * 값이 아니라 칩 11px 과 태그 8px 의 가운데라 여기에 쓰지 않는다.
 *
 * 좌우로 화면 여백만큼 음수 마진을 줘서 스크롤이 화면 끝까지 닿게 한다
 * (`-mx-6.5 px-6.5`) — 안 그러면 마지막 칩이 여백 앞에서 잘린 것처럼 보인다.
 *
 * 프로토타입은 칩 테두리·면에 `#EFF1F4`·`#FAFBFC` 를 직접 박았다. 토큰에 없는 값이라
 * 가장 가까운 역할 토큰(`--color-border` · `--color-surface-soft`)으로 옮겼다.
 */
type RecentKeywordChipsProps = {
  keywords: readonly RecentSearchKeyword[];
  onPick: (keyword: string) => void;
  onRemove: (keywordId: number) => void;
};

export function RecentKeywordChips({
  keywords,
  onPick,
  onRemove,
}: RecentKeywordChipsProps) {
  return (
    <div className="-mx-6.5 [scrollbar-width:none] overflow-x-auto px-6.5 pb-0.5 [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max gap-1.5">
        {keywords.map((item) => (
          <li
            key={item.keywordId}
            className="flex h-7 flex-none items-center rounded-tag border border-border bg-surface-soft pl-[11px]"
          >
            <button
              type="button"
              onClick={() => onPick(item.keyword)}
              className="text-caption whitespace-nowrap text-text-secondary"
            >
              {item.keyword}
            </button>
            <button
              type="button"
              onClick={() => onRemove(item.keywordId)}
              aria-label={`최근 검색어 ${item.keyword} 삭제`}
              className="flex h-6.5 w-5.5 items-center justify-center text-[10px] leading-none text-text-muted"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
