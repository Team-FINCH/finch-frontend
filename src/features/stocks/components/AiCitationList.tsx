import { type AiCitation } from '@/shared/types/ai/envelope';

/**
 * AI 근거 목록 (ia.md §4 "★ 근거 표시").
 *
 * **접거나 생략하지 않는다** — "이 목록이 없으면 AI 답변과 유튜브 추천이 화면에서
 * 구별되지 않는다" (ia.md §4). 빈 배열이면 슬롯을 실패로 다루지 않고 이 영역만 감춘다.
 *
 * 규약 셋을 지킨다.
 * - `type` 을 뱃지로 구분한다 (7종: filing·financial·news·price·macro·engine·wiki)
 * - **`url` 이 없으면 눌리게 만들지 않는다.** `engine`·`wiki` 가 그렇다 —
 *   `engine` 은 외부 근거가 아니라 자체 계산이고 `wiki` 는 사용자 자신의 기록이라
 *   외부 출처처럼 보이면 안 된다
 * - `relevance` 는 **정렬에만 쓰고 숫자로 노출하지 않는다**
 *
 * hover 툴팁 미리보기를 만들지 않는다 — 모바일에 hover 가 없다 (ia.md §4).
 */
const CITATION_TYPE_LABEL: Record<string, string> = {
  filing: '공시',
  financial: '재무',
  news: '뉴스',
  price: '시세',
  macro: '거시',
  engine: '자체 계산',
  wiki: '내 기록',
};

type AiCitationListProps = {
  citations: readonly AiCitation[];
};

export function AiCitationList({ citations }: AiCitationListProps) {
  if (citations.length === 0) {
    return null;
  }

  // relevance 내림차순. 원본 배열을 건드리지 않으려고 복사한 뒤 정렬한다.
  const sorted = [...citations].sort((a, b) => b.relevance - a.relevance);

  return (
    <section className="mt-8">
      <h3 className="mb-3 text-label font-semibold text-text-secondary">
        근거
      </h3>
      <ul className="flex flex-col gap-2.5">
        {sorted.map((citation) => {
          const label = CITATION_TYPE_LABEL[citation.type] ?? citation.type;
          const body = (
            <>
              <span className="inline-flex h-6 flex-none items-center rounded-sm bg-surface-soft px-2 text-caption font-medium text-text-secondary">
                {label}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-2 text-text-primary">
                  {citation.title}
                </span>
                <span className="block truncate text-caption text-text-muted">
                  {citation.publisher ?? citation.source}
                </span>
              </span>
            </>
          );

          return (
            <li key={citation.id}>
              {citation.url === null ? (
                <div className="flex items-start gap-2.5">{body}</div>
              ) : (
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-start gap-2.5 rounded-12 active:bg-primary-soft"
                >
                  {body}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
