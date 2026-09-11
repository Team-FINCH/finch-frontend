import type { InboxItem, InboxItemKind } from '../model/types';

/**
 * 알림함 한 줄 (design.md §7.11 알림함).
 *
 * - 미확인은 작은 Dot. **`--notify`(design.md §"Notify" 색상표, `#D94A4A`)가 정확히
 *   이 자리를 가리키지만 아직 `styles/index.css` 에 토큰으로 없다** — 다른 워커가
 *   지금 토큰 값을 고치고 있어 새 토큰을 여기서 임의로 추가하지 않는다.
 *   TODO(계약): `--color-notify` 토큰이 생기면 `bg-danger` 를 그것으로 바꾼다.
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
          <span className="size-2 rounded-full bg-danger" />
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
