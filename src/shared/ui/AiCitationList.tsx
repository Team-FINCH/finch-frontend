import { useState } from 'react';

import { formatKstDate } from '@/shared/lib/formatDate';
import { type AiCitation } from '@/shared/types/ai/envelope';

/**
 * AI 근거 목록 (ia.md §4 "★ 근거 표시").
 *
 * **원칙은 접거나 생략하지 않는다** — "이 목록이 없으면 AI 답변과 유튜브 추천이
 * 화면에서 구별되지 않는다" (ia.md §4). 빈 배열이면 슬롯을 실패로 다루지 않고 이
 * 영역만 감춘다.
 *
 * **채팅은 예외다** (`collapsible`, 2026-09-17 사용자 결정, FINCH-315). 채팅
 * 말풍선에서는 목록이 다섯 줄까지 늘어나 본문보다 길어지는 문제가 있었고, `ia.md`
 * §4 의 "접어두거나 생략하지 않는다" 를 사용자가 알고도 채팅에 한해 접기로 정했다.
 * `ia.md` 는 이 결정과 별개로 팀 문서 쪽 반영 여부가 정해지지 않아 고치지 않았다 —
 * 그래서 그 문서와 이 주석이 채팅에 한해 서로 다른 말을 하는 것처럼 보일 수 있다.
 * `collapsible` 이 꺼져 있는 나머지 두 호출부(포트폴리오의 두 시트
 * `AnalysisEvidenceSheet`·`AnalysisInfoSheet`)는 이 예외와 무관하게 원칙 그대로
 * 전부 펼쳐 그린다.
 *
 * **`features/stocks` 와 `features/portfolio` 에 따로 있던 두 벌을 여기로 올렸다**
 * (frontConvention §2 "두 feature 가 같은 것을 필요로 하면 shared 로 올린다").
 * 로직은 하나로 합치고, 갈라져 있던 겉모양은 props 로 화면별로 남겼다 —
 * 종목 상세는 제목 "근거" 와 발행처 줄이 있는 두 줄 판, 포트폴리오 두 탭은 제목
 * 없는 한 줄 판이다. **이 props 는 임시다.** design.md §9 "근거 표기" 와
 * 프로토타입은 뱃지 목록이 아니라 캡션 한 줄("… 기준 · 공시 · 뉴스 · 자체계산")
 * 이라 두 판 모두 그와 어긋나 있고, 그 판정은 프로토타입 대조표 3차(종목 상세)
 * 몫이다. 거기서 캡션 한 줄로 바뀌면 이 분기는 사라진다.
 *
 * 규약 셋을 지킨다.
 * - `type` 을 뱃지로 구분한다 (7종: filing·financial·news·price·macro·engine·wiki).
 *   라벨은 ia.md §4 표를 따른다 — `financial` 은 "재무제표", `wiki` 는 "내 논지"
 * - **`url` 이 없으면 눌리게 만들지 않는다.** `engine`·`wiki` 가 그렇다 —
 *   `engine` 은 외부 근거가 아니라 자체 계산이고 `wiki` 는 사용자 자신의 기록이라
 *   외부 출처처럼 보이면 안 된다
 * - `relevance` 는 **정렬에만 쓰고 숫자로 노출하지 않는다**
 *
 * hover 툴팁 미리보기·각주 팝오버·발췌 접기는 만들지 않는다 — 모바일에 hover 가
 * 없다 (ia.md §4).
 *
 * **같은 문서를 한 줄로 묶는다** (`groupByDocument`). 이것이 위의 "접거나 생략하지
 * 않는다" 를 어기는 것이 아니다. 그 규약이 막는 것은 **목록 자체를 감추는 것**이다 —
 * "이 목록이 없으면 AI 답변과 유튜브 추천이 화면에서 구별되지 않는다"(ia.md §4) 는
 * 근거를 볼 수 있어야 한다는 말이지, 한 문서를 청크 수만큼 반복해 적어야 한다는
 * 말이 아니다. AI 는 문서를 통째로 주지 않고 검색된 청크 단위로 준다. 실제 응답에서
 * `citations` 6건 중 5건이 같은 반기보고서의 다른 청크였고, 사용자에게는 근거가
 * 여섯 가지인 것이 아니라 같은 줄이 다섯 번 반복된 고장으로 읽힌다. 묶은 뒤에도
 * 근거는 하나도 사라지지 않는다 — 문서도 링크도 그대로 있고 줄만 겹치지 않는다.
 * 서버에 합쳐 달라고 하지 않은 이유는 `citations[].id` 를
 * `AiThesisEvidence.citationId` 가 가리키기 때문이다(`types/ai/analysis.ts`
 * ·`attribution.ts`). 합치면 그 참조가 끊어진다. 그래서 계약은 그대로 두고 표시만
 * 정리한다.
 *
 * **발행일(`publishedAt`)을 그린다** (FINCH-361). 같은 문서가 아니라도 제목이
 * 글자까지 같을 수 있다 — 조회공시 답변은 제목이 양식이라 같은 회사가 여러 번 내도
 * 같고, 접수번호가 달라 `url` 도 다르니 `groupByDocument` 가 묶지 않는다(묶으면 근거가
 * 사라진다). 두 줄 판은 둘째 줄을 `발행처 · 발행일`, 한 줄 판은 제목 오른쪽에 날짜를
 * 붙인다. 날짜는 잘리지 않게 `flex-none` 이고 제목·발행처가 대신 줄어든다. `null` 이면
 * 구분자까지 감춘다.
 *
 * 여백은 컴포넌트가 갖지 않는다. 앞 요소와의 간격이 화면마다 달라 호출부가
 * `className` 으로 정한다.
 */
const CITATION_TYPE_LABEL: Record<string, string> = {
  filing: '공시',
  financial: '재무제표',
  news: '뉴스',
  price: '시세',
  macro: '거시지표',
  engine: '자체 계산',
  wiki: '내 논지',
};

/**
 * 발행일 표기. 올해 것은 `09.18`, 해를 넘긴 것은 `2025.09.18` 이다. 좁은 화면에서는
 * 연도가 자리를 먹지만, 연도를 항상 빼면 해를 넘긴 공시가 올해 것으로 읽힌다.
 */
function formatPublishedAt(isoString: string): string {
  const full = formatKstDate(isoString);
  const thisYear = formatKstDate(new Date().toISOString()).slice(0, 4);
  return full.startsWith(`${thisYear}.`) ? full.slice(5) : full;
}

/**
 * 문서 하나에 해당하는 줄. 같은 `url` 의 청크 여럿이 여기로 접힌다.
 */
type CitationGroup = {
  /** 화면에 그릴 대표 청크. 묶음 안에서 `relevance` 가 가장 높은 것이다. */
  head: AiCitation;
  /** 이 줄이 접은 청크 수. 묶이지 않은 줄은 `1` 이다. */
  size: number;
  /** 정렬 기준. 묶음의 `relevance` **최댓값**이다. */
  relevance: number;
};

/**
 * `url` 이 같은 청크를 한 줄로 묶고 묶음의 `relevance` 최댓값으로 내림차순 정렬한다.
 *
 * **`url` 이 `null` 인 `type` 은 묶지 않는다.** `engine`(자체 계산)·`wiki`(내 논지)가
 * 그렇다 — 묶을 키가 없고, 애초에 같은 외부 문서를 여러 번 인용한 경우가 아니다.
 * 제목으로 묶으면 서로 다른 계산 근거가 제목만 같다는 이유로 하나로 접힌다.
 *
 * 평균이 아니라 최댓값으로 정렬하는 이유는, 청크가 많이 잡힌 문서일수록 관련 없는
 * 청크가 딸려 와 평균을 끌어내리기 때문이다. 가장 관련 높은 대목이 어디에 있었는지가
 * 그 문서의 순위여야 한다.
 *
 * 동점이면 응답이 준 순서가 남는다 (`Array.prototype.sort` 는 안정 정렬이다).
 */
function groupByDocument(citations: readonly AiCitation[]): CitationGroup[] {
  const groups: CitationGroup[] = [];
  const byUrl = new Map<string, CitationGroup>();

  for (const citation of citations) {
    const existing =
      citation.url === null ? undefined : byUrl.get(citation.url);

    if (existing === undefined) {
      const group: CitationGroup = {
        head: citation,
        size: 1,
        relevance: citation.relevance,
      };
      groups.push(group);
      if (citation.url !== null) {
        byUrl.set(citation.url, group);
      }
      continue;
    }

    existing.size += 1;
    if (citation.relevance > existing.relevance) {
      existing.relevance = citation.relevance;
      existing.head = citation;
    }
  }

  return groups.sort((a, b) => b.relevance - a.relevance);
}

/**
 * 접었을 때 그대로 보이는 줄 수 (`collapsible`, 2026-09-17 사용자 결정). 채팅
 * 말풍선 하나에 맞춘 값이라 호출부가 고르게 두지 않았다 — 지금 이 값이 필요한
 * 자리가 채팅 하나뿐이라, 값을 더 만들면 아직 없는 쓰임을 미리 설계하는 것이 된다.
 * 다른 화면이 다른 값을 필요로 하면 그때 props 로 뺀다.
 */
const COLLAPSED_VISIBLE_COUNT = 1;

type AiCitationListProps = {
  citations: readonly AiCitation[];
  /** 목록 제목. 넘기면 `<section>` 으로 감싸고 제목을 그린다 (종목 상세 "근거"). */
  title?: string;
  /**
   * 제목 아래에 발행처(`publisher`, 없으면 `source`) 줄을 더해 두 줄로 그린다.
   * 두 줄 판은 한 줄 판보다 뱃지·글자가 한 단계 크다 (종목 상세 실측).
   */
  showPublisher?: boolean;
  /**
   * 상위 `COLLAPSED_VISIBLE_COUNT`건만 펼쳐 두고 나머지를 `더 보기` 뒤로 접는다
   * (2026-09-17 사용자 결정, FINCH-315). **채팅만 켠다** — 포트폴리오의
   * `AnalysisEvidenceSheet`·`AnalysisInfoSheet` 은 기본값 `false` 그대로 전부
   * 펼친다. 정렬
   * (`relevance` 최댓값 내림차순)은 접힘과 무관하게 그대로다 — 위쪽 항목만
   * 보여주는 것이라 별도 기준이 필요 없다.
   */
  collapsible?: boolean;
  className?: string;
};

export function AiCitationList({
  citations,
  title,
  showPublisher = false,
  collapsible = false,
  className = '',
}: AiCitationListProps) {
  // 한 번 펼치면 되접지 않는다 — "여는 동작은 누르는 것 하나" (사용자 결정).
  const [expanded, setExpanded] = useState(false);

  if (citations.length === 0) {
    return null;
  }

  // 같은 문서를 한 줄로 접고 묶음의 relevance 최댓값으로 내림차순 정렬한다.
  // 원본 배열은 건드리지 않는다.
  const groups = groupByDocument(citations);
  const hiddenCount = groups.length - COLLAPSED_VISIBLE_COUNT;
  const isCollapsed = collapsible && !expanded && hiddenCount > 0;
  const visibleGroups = isCollapsed
    ? groups.slice(0, COLLAPSED_VISIBLE_COUNT)
    : groups;

  const list = (
    <ul className={`flex flex-col ${showPublisher ? 'gap-2.5' : 'gap-2'}`}>
      {visibleGroups.map(({ head: citation }) => {
        const label = CITATION_TYPE_LABEL[citation.type] ?? citation.type;
        const publishedAt =
          citation.publishedAt === null
            ? null
            : formatPublishedAt(citation.publishedAt);
        const rowClass = showPublisher
          ? 'flex items-start gap-2.5'
          : 'flex items-center gap-2';
        const body = (
          <>
            <span
              className={
                showPublisher
                  ? 'inline-flex h-6 flex-none items-center rounded-sm bg-surface-soft px-2 text-caption font-medium text-text-secondary'
                  : 'inline-flex h-5 flex-none items-center rounded-xs bg-surface-soft px-1.5 text-caption font-medium text-text-secondary'
              }
            >
              {label}
            </span>
            {showPublisher ? (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-2 text-text-primary">
                  {citation.title}
                </span>
                <span className="flex text-caption text-text-muted">
                  <span className="min-w-0 truncate">
                    {citation.publisher ?? citation.source}
                  </span>
                  {publishedAt !== null && (
                    <span className="flex-none whitespace-pre">
                      {` · ${publishedAt}`}
                    </span>
                  )}
                </span>
              </span>
            ) : (
              <>
                <span className="min-w-0 flex-1 truncate text-caption text-text-secondary">
                  {citation.title}
                </span>
                {publishedAt !== null && (
                  <span className="flex-none text-caption text-text-muted">
                    {publishedAt}
                  </span>
                )}
              </>
            )}
          </>
        );

        return (
          <li key={citation.id}>
            {citation.url === null ? (
              <div className={rowClass}>{body}</div>
            ) : (
              <a
                href={citation.url}
                target="_blank"
                rel="noreferrer noopener"
                className={`${rowClass} rounded-12 active:bg-primary-soft`}
              >
                {body}
              </a>
            )}
          </li>
        );
      })}
      {isCollapsed && (
        <li>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-caption font-medium text-text-secondary underline underline-offset-2"
          >
            근거 {hiddenCount}건 더 보기
          </button>
        </li>
      )}
    </ul>
  );

  if (title === undefined) {
    return <div className={className}>{list}</div>;
  }

  return (
    <section className={className}>
      <h3 className="mb-3 text-label font-semibold text-text-secondary">
        {title}
      </h3>
      {list}
    </section>
  );
}
