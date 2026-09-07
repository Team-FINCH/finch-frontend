import { type AiCitation } from '@/shared/types/ai/envelope';

/** `citations[].type` 뱃지 라벨 (ia.md §4 "근거 표시"). 모르는 값은 그대로 보여준다. */
const CITATION_TYPE_LABEL: Record<string, string> = {
  filing: '공시',
  financial: '재무제표',
  news: '뉴스',
  price: '시세',
  macro: '거시지표',
  engine: '자체 계산',
  wiki: '내 논지',
};

type AiCitationListProps = {
  citations: AiCitation[];
  className?: string;
};

/**
 * 근거 목록 (ia.md §4 "★ 근거 표시"). "이 목록이 없으면 AI 답변과 유튜브 추천이
 * 화면에서 구별되지 않는다"는 원칙이라 접어두거나 생략하지 않는다.
 *
 * 각주 팝오버·발췌 접기는 만들지 않는다 — 이 티켓은 목록 표시까지가 범위다.
 * `engine`·`wiki` 는 외부 링크가 없어(`url: null`) 다른 항목과 다르게 눌리지
 * 않는 텍스트로만 둔다. `relevance` 는 정렬에만 쓰고 화면에 숫자로 내지 않는다.
 *
 * 여러 AI 슬롯(진단·수익률 분석, 이후 종목 분석·채팅)이 같은 모양을 쓰므로 두
 * 곳 이상에서 쓰이게 되면 `shared/ui`로 올리는 것을 고려한다(ia.md §5 "컴포넌트를
 * 두 번 만들지 않는다").
 */
export function AiCitationList({
  citations,
  className = '',
}: AiCitationListProps) {
  if (citations.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {citations.map((citation) => {
        const label = CITATION_TYPE_LABEL[citation.type] ?? citation.type;
        const body = (
          <>
            <span className="inline-flex h-5 flex-none items-center rounded-xs bg-surface-soft px-1.5 text-caption font-medium text-text-secondary">
              {label}
            </span>
            <span className="min-w-0 flex-1 truncate text-caption text-text-secondary">
              {citation.title}
            </span>
          </>
        );

        if (citation.url === null) {
          return (
            <div key={citation.id} className="flex items-center gap-2">
              {body}
            </div>
          );
        }

        return (
          <a
            key={citation.id}
            href={citation.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2"
          >
            {body}
          </a>
        );
      })}
    </div>
  );
}
