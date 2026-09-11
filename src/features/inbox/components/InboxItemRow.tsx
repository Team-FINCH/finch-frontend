import type { InboxItem, InboxItemKind } from '../model/types';

/**
 * 알림함 한 줄 (design.md §7.11 알림함).
 *
 * - 미확인은 작은 Dot. 색은 `--color-notify`(design.md §4 "Notify" 색상표 `#D94A4A` ·
 *   §7.11 "미확인은 작은 --notify Dot")다. 토큰이 없던 시절 `bg-danger` 로 대신하고
 *   TODO 를 남겨 뒀었는데 토큰이 생겼다 — 헤더의 미확인 뱃지
 *   (`shared/ui/PageHeader`)가 같은 토큰을 쓰므로 점과 뱃지가 함께 움직인다.
 * - 유형 라벨은 Neutral, `확인 필요`(위키 확인 항목)만 약한 Attention 이다.
 *   색을 따로 주지 않고 글자 굵기로만 강조해 "강한 색을 주지 않는다" 규칙을 지킨다.
 * - Card 가 아니라 Flat List — 안쪽 여백만 있고 테두리·배경이 없다.
 *
 * **`title`·`summary` 는 서버가 완성해 준 문구를 그대로 그린다**(apiSpec §6.4).
 * 종목명을 덧붙이거나 문장을 다시 조립하지 않는다.
 */

const KIND_LABEL: Record<InboxItemKind, string> = {
  record: '기록',
  wiki: '확인',
  news: '소식',
};

/** `Intl.DateTimeFormat` 대신 날짜만 자른다. 알림함은 상대 시간 없이 날짜로 충분하다. */
function formatWhen(iso: string): string {
  return iso.slice(0, 10).replace(/-/g, '.');
}

type InboxItemRowProps = {
  item: InboxItem;
  onClick: (item: InboxItem) => void;
};

export function InboxItemRow({ item, onClick }: InboxItemRowProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className="flex w-full items-start gap-3 py-4 text-left"
    >
      <span
        className="flex w-2 flex-none justify-center pt-2"
        aria-hidden="true"
      >
        {item.unread ? (
          <span className="size-2 rounded-full bg-notify" />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1.25">
        <span className="flex items-center gap-1.75">
          <span className="inline-flex h-6 items-center rounded-sm bg-surface-soft px-2 text-caption font-medium text-text-secondary">
            {KIND_LABEL[item.kind]}
          </span>
          {item.kind === 'wiki' ? (
            <span className="text-caption font-semibold text-text-primary">
              확인 필요
            </span>
          ) : null}
          <span className="text-caption text-text-secondary">
            {formatWhen(item.createdAt)}
          </span>
        </span>
        <span className="text-body-1 font-medium text-text-primary">
          {item.title}
        </span>
        <span className="text-body-2 text-text-secondary">{item.summary}</span>
      </span>
      <span
        aria-hidden="true"
        className="flex-none pt-1 text-title-3 text-text-muted"
      >
        ›
      </span>
    </button>
  );
}
