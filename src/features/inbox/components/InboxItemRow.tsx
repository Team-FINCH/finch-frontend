import { formatInboxWhen } from '../lib/formatInboxWhen';
import type { InboxItem, InboxItemKind } from '../model/types';

/**
 * 알림함 한 줄 (design.md §7.11 알림함).
 *
 * - 미확인은 작은 Dot. 색은 `--color-notify`(design.md §4 "Notify" 색상표 `#D94A4A` ·
 *   §7.11 "미확인은 작은 --notify Dot")다. 토큰이 없던 시절 `bg-danger` 로 대신하고
 *   TODO 를 남겨 뒀었는데 토큰이 생겼다 — 헤더의 미확인 뱃지
 *   (`shared/ui/PageHeader`)가 같은 토큰을 쓰므로 점과 뱃지가 함께 움직인다.
 * - 유형 태그는 종류마다 색이 다르다. 아래 `KIND_TAG_CLASS` 주석을 본다.
 * - 첫 줄은 **태그와 날짜 둘뿐이다.** `wiki` 항목에 `확인 필요` 를 덧붙이던 것을
 *   지웠다 — 프로토타입에 없고, 태그가 이미 `확인` 이라 같은 말이 두 번 나왔다.
 *   design.md §7.11 의 "`확인 필요`만 약한 Attention" 은 이제 태그 자신이 받는다
 *   (`.tag.a` 앰버). 그 뜻을 풀어 쓰는 자리는 아래 `summary` 줄인데 그 문구는
 *   서버가 준다.
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

/**
 * 유형 태그의 면색·글자색. **프로토타입 실측값이다** — `.tag.d`(기록) · `.tag.a`(확인) ·
 * `.tag.n`(소식)이고 알림함 항목은 `m.tag` 로 각각 `d`·`a`·`n` 을 받는다.
 * 셋이 전부 회색이던 것을 프로토타입대로 갈랐다.
 *
 * ```
 * .tag.d{background:#EEF4FE;color:#2563EB}   기록  파랑
 * .tag.a{background:#FEF3E0;color:#B4790E}   확인  앰버
 * .tag.n{background:#EEF0F3;color:#4A5361}   소식  회색
 * ```
 *
 * **어두운 면 위의 값(`.dark .tag.*`)을 쓰지 않는다.** 그쪽은
 * `rgba(107,166,255,.16)` 처럼 투명도를 얹은 값이라 흰 면에 올리면 거의 보이지 않는다.
 * 우리는 라이트 한 벌만 쓴다(`styles/index.css` 머리 안내 — dark 분기 블록이 없다).
 *
 * **design.md §7.11 "`기록 / 확인 / 소식`마다 강한 색을 주지 않는다" 와 어긋나지
 * 않는다.** 면색 셋이 전부 흰 바탕에서 한 톤 뜬 정도의 옅은 색이고, 글자색만 종류를
 * 가른다 — 문서가 막는 것은 태그가 화면의 시선을 가져가는 강한 색이다.
 *
 * **토큰으로 올리지 않고 지역 상수로 둔다.** 이유가 둘이다. 이 세 값을 쓰는 자리가
 * 알림함 한 곳뿐이다 — 다른 화면의 태그(`shared/ui/StockRow`,
 * `features/stocks/components/StockDetailHeader`)는 프로토타입에서도 회색 계열
 * 한 가지(`--color-surface-soft`)라 갈래가 필요 없다. 그리고 `styles/index.css` 는
 * 지금 다른 브랜치가 자라게 하는 공용 파일이라, 여기서 토큰을 더하면 머지할 때
 * 한쪽이 다른 쪽을 지운다. **같은 태그가 다른 화면에도 생기면 그때 토큰으로 올린다.**
 */
const KIND_TAG_CLASS: Record<InboxItemKind, string> = {
  record: 'bg-[#EEF4FE] text-[#2563EB]',
  wiki: 'bg-[#FEF3E0] text-[#B4790E]',
  news: 'bg-[#EEF0F3] text-[#4A5361]',
};

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
          {/* 반경은 --radius-tag(8px) 다. 프로토타입 `.tag` 실측값이고
              전에 쓰던 rounded-sm 은 10px 이라 2px 더 둥글었다. */}
          <span
            className={`inline-flex h-6 items-center rounded-tag px-2 text-caption font-medium ${KIND_TAG_CLASS[item.kind]}`}
          >
            {KIND_LABEL[item.kind]}
          </span>
          <span className="text-caption text-text-secondary">
            {formatInboxWhen(item.createdAt)}
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
