import { showToast } from '@/shared/hooks/useToastStore';
import {
  isInsufficientDataErrorCode,
  readAiErrorCode,
  readAiErrorMessage,
} from '@/shared/lib/aiErrorRetry';
import {
  formatKstMonthDay,
  formatKstMonthDayTime,
} from '@/shared/lib/formatDate';
import {
  AI_ANALYSIS_SECTION_KEYS,
  type AiAnalysisSection,
  type AiAnalysisSectionKey,
} from '@/shared/types/ai/analysis';
import { type AiCitation } from '@/shared/types/ai/envelope';
import { AiCard } from '@/shared/ui/AiCard';
import { AiFeedbackRow } from '@/shared/ui/AiFeedbackRow';
import { AiSegmentText } from '@/shared/ui/AiSegmentText';
import { AiStatus } from '@/shared/ui/AiStatus';
import { Skeleton } from '@/shared/ui/Skeleton';

import { useStockAnalysis } from '../api/useStockAnalysis';

/**
 * AI 분석 탭 (프로토타입 `isDtAi` 블록, ia.md §4 슬롯 3번).
 *
 * ## 본문을 그린다 — 무엇을 근거로 어떻게
 *
 * 섹션 다섯(`current`·`changes`·`attention`·`risks`·`nextEvents`)의 키 구성이
 * `ai/docs/openapi.json` 으로 확정됐다(이슈 #15 닫힘, contracts C57~C59). 스키마와
 * 그 근거는 `shared/types/ai/analysis.ts` 에 있다.
 *
 * **개인화 섹션 `myImpact`·`thesisCheck` 는 뺐다**(GitLab 이슈 #92). AI 가 종목
 * 분석을 보유·논지에 무관한 종목 단위 정보로 바꾸면서 그 둘이 응답에서 아예
 * 빠진다 — 매 요청마다 LLM 을 태우고 Guardrail 에 자주 걸려 화면이 늦고 비어
 * 보였다. 나머지 다섯은 아침 배치가 미리 만들어 즉시 나온다.
 *
 * 지키는 규약 넷이다.
 * - **섹션 제목을 화면이 짓지 않고 응답의 `title` 을 그대로 쓴다**(ia.md:447).
 *   `title` 이 없으면 **제목을 그리지 않는다.** 키 이름을 한국어로
 *   옮겨 제목으로 쓰면 AI 가 제목을 바꿀 때 화면이 못 따라간다
 * - **`null` 섹션은 자리를 비운다**(ia.md:452). 접힌 카드도 "정보 없음" 박스도
 *   만들지 않는다
 * - **문장은 `text` 하나로 렌더된다.** `segments` 는 이어 붙이면 `text` 와 정확히
 *   일치하므로(C55) 둘 다 그리면 같은 문장이 두 번 나온다. 수치 강조가 필요할 때만
 *   `segments` 를 순회하고, 조각이 없으면 `text` 를 그대로 쓴다
 * - **표시 순서는 화면이 정한다** — 응답이 객체라 순서가 없다(ia.md §4).
 *   순서는 `AI_ANALYSIS_SECTION_KEYS` 한 곳에 있다
 *
 * ## 왜 검정 카드에 `current` 하나만 넣나
 *
 * design.md §8.3 `AIDetail` 이 **"상세 분석 전체를 하나의 Dark Card에 넣지 않는다"**
 * 와 "기본 Background 위 Flat Section" 을 못박았다. 프로토타입도 AI 탭 맨 위에
 * 검정 카드 하나를 두고 그 아래를 평면 섹션으로 쌓는다. `current` 가 그 자리인
 * 근거는 ia.md §4 가 이 섹션에 기획서의 차별점("현재 가격이 왜 비싸거나 싼지")을
 * 걸어 둔 것이다. `current` 가 없으면 검정 카드는 공통 AI 헤더(§8.4)와 기준 시각만
 * 담는다.
 *
 * **지표 표를 만들지 않는다**(ia.md §4 ★). PER·PBR 을 숫자로 나열하는 순간
 * 기획서가 피하려던 화면이 그대로 나온다. 숫자 강조는 `segments` 로만 한다.
 *
 * ## 만들지 않은 것
 *
 * `cached`·`cachedAt` 은 항상 `false`/`null` 이라 **캐시 배지를 만들지 않는다.**
 * `nextEvents.events` 도 지금 항상 빈 배열이라(contracts C56) 전용 UI 를 만들지
 * 않았다 — 그 자리를 그리려면 목이 계약보다 관대해져야 한다. 값이 실제로 실려 오면
 * 스키마는 이미 받고 있으니 여기만 고친다.
 *
 * `thesisCheck` 가 `null` 일 때의 논지 입력 유도(`ThesisPromptBlock`)는 **뺐다**
 * (GitLab 이슈 #92). 개인화 섹션 제거로 `thesisCheck` 가 항상 `null` 이 되면서
 * 보유 종목마다 그 카드가 뜨게 됐었다 — 논지 기록 유도는 위키 화면과 채팅이 맡는다.
 *
 * ## 근거는 목록이 아니라 캡션 한 줄이다
 *
 * design.md §9 "근거 표기" 가 "뱃지를 쓰지 않는다 … 종류를 나열만 하고 개별 출처로
 * 링크하지 않는다 … `AIDetail` 에서도 같다" 로 못박았고 프로토타입도 캡션 한 줄이다.
 * 그래서 이 화면은 `shared/ui/AiCitationList` 를 쓰지 않는다. `ia.md` §4 표의
 * "`type` 을 **뱃지로 구분한다**" 는 이 판정으로 뒤집혀 같은 MR 에서 캡션으로 고쳤다.
 * 포트폴리오 두 탭은 아직 뱃지 목록이라 `AiCitationList` 자체는 남겨 두었다.
 *
 * ## 실패 자리
 *
 * 재시도 버튼을 낼지는 **코드가 정한다** — `AiStatus` 가 `isRetryableAiErrorCode` 로
 * 판정하므로 여기서 따로 고르지 않는다 (ia.md §4).
 * **실패·데이터 부족 자리에는 피드백을 붙이지 않는다** (design.md §10 · ia.md §4).
 * 보유 종목·근거가 없어 분석이 성립하지 않는 경우는 `409 INSUFFICIENT_DATA` 로
 * 오므로(contracts C12) 이 갈래가 아니라 위의 에러 갈래에서 걸린다.
 */
type StockAiTabProps = {
  stockCode: string;
  /**
   * 종목명 (`GET /stocks/{stockCode}` 의 `stockName`).
   *
   * **이 탭 안에서는 더 안 쓴다.** 채팅으로 논지 기록을 유도하던 `ThesisPromptBlock`
   * 이 이 값을 실어 보냈는데 그 블록을 뺐다(GitLab 이슈 #92). 타입에 남긴 이유는
   * `pages/StockDetailPage.tsx` 가 여전히 이 값을 넘기기 때문이다 — 그 파일은 이
   * 작업 범위 밖이다.
   */
  stockName: string;
  /** AI 탭이 열려 있을 때만 부른다 — 안 그러면 차트만 보는 사람에게 AI 요금이 나간다. */
  isActive: boolean;
  /**
   * 보유 중인가 (`GET /stocks/{stockCode}` 의 `holding !== null`).
   *
   * **이 탭 안에서는 더 안 쓴다.** 논지 없음 유도(`ThesisPromptBlock`)가 미보유와
   * 갈리려고 이 값을 받았는데 그 블록을 뺐다(GitLab 이슈 #92). 타입에 남긴 이유는
   * 위 `stockName` 과 같다.
   */
  owned: boolean;
};

/**
 * 검정 카드 아래의 평면 섹션 하나 (design.md §8.3 — "기본 Background 위 Flat Section",
 * "모든 Section을 Card로 만들지 않는다", "Section 간 충분한 여백").
 *
 * 위계는 프로토타입 실측이다 — 제목 `.sht`(**18px/700 `--t1`**, 아래 14px) ·
 * 본문 `.b1`(**16px/24 `--t1`**) · 섹션 사이 40px (새 디코드 L1934·L1052·L1088).
 * 전에는 제목을 14px/600 회색, 본문을 15px 회색으로 뒀는데 그것은 섹션 제목이
 * 아니라 필드 라벨의 위계라 두 단계 낮았다.
 */
function AnalysisSectionBlock({
  section,
  caption,
}: {
  section: AiAnalysisSection;
  caption?: string;
}) {
  const title = section.title ?? null;

  return (
    <section className="mt-10">
      {title === null ? null : (
        <h3 className="mb-3.5 text-section-title text-text-primary">{title}</h3>
      )}
      <p className="text-body-1 leading-6 text-pretty text-text-primary">
        <AiSegmentText segments={section.segments} text={section.text} />
      </p>
      {caption === undefined ? null : (
        <p className="mt-4 text-caption text-text-muted">{caption}</p>
      )}
    </section>
  );
}

/**
 * 근거 캡션에 나열할 종류 이름과 그 순서 (ia.md §4 `type` 7종 표).
 *
 * **뱃지 목록이 아니라 캡션 한 줄이다** — design.md §9 "근거 표기" 가 "뱃지를 쓰지
 * 않는다. 응답 블록 최하단에 캡션 한 줄로 종류만 나열한다 … `AIDetail` 에서도
 * 같다" 로 못박았고 프로토타입도 캡션이다(새 디코드 L1994). 그래서 이 화면은
 * `AiCitationList` 를 쓰지 않는다. 개별 출처 제목·발행처·링크를 그리지 않으므로
 * 남는 것은 종류 이름뿐이고, 순서는 응답의 `relevance` 가 아니라 이 배열이 정한다 —
 * 종류 나열의 순서가 응답마다 달라지면 같은 줄이 매번 다르게 읽힌다.
 *
 * 라벨은 ia.md §4 표를 그대로 쓴다. 프로토타입 목이 박아 둔 `공시 · 뉴스 · 자체계산`
 * 은 그 목 데이터의 종류 셋을 편 것이라 문자열을 박지 않고 응답에서 편다.
 */
const CITATION_TYPE_ORDER = [
  ['filing', '공시'],
  ['financial', '재무제표'],
  ['news', '뉴스'],
  ['price', '시세'],
  ['macro', '거시지표'],
  ['engine', '자체 계산'],
  ['wiki', '내 논지'],
] as const;

function citationTypeLabels(citations: readonly AiCitation[]): string[] {
  const present = new Set(citations.map((citation) => citation.type));
  return CITATION_TYPE_ORDER.filter(([type]) => present.has(type)).map(
    ([, label]) => label,
  );
}

/**
 * 섹션별 고정 캡션. 프로토타입이 `확인해볼 위험` 아래에만 한 줄 두었다
 * (새 디코드 L1946). 제목과 달리 이 문장은 응답에 없는 **시안 문구**라 화면이 갖는다.
 */
const SECTION_CAPTION: Partial<Record<AiAnalysisSectionKey, string>> = {
  risks: '공시와 실적에서 확인한 내용이에요.',
};

export function StockAiTab({ stockCode, isActive }: StockAiTabProps) {
  const analysis = useStockAnalysis(stockCode, isActive);

  if (analysis.isPending) {
    return (
      <div className="mt-6">
        <AiCard label="AI 종목 분석" headline="공시와 뉴스를 확인하고 있어요.">
          {/* AiCard 는 onClick 이 없으면 <section> 으로 나온다. Skeleton 이 <div> 라
              <span> 안에 넣으면 HTML 이 깨진다 — 그래서 여기만 div 로 감싼다. */}
          <div className="mt-4">
            <Skeleton className="mb-2.5 h-3.5 w-[92%]" />
            <Skeleton className="mb-2.5 h-3.5 w-[76%]" />
            <Skeleton className="h-3.5 w-[86%]" />
          </div>
        </AiCard>
      </div>
    );
  }

  if (analysis.isError) {
    const error = analysis.error;
    const code = readAiErrorCode(error);

    /*
     * **데이터 부족은 실패가 아니다** (contracts C12 · design.md L1237-1255).
     * `409 INSUFFICIENT_DATA` 는 정상적인 거절이라 프로토타입도 실패(`aiFail`)와
     * 다른 갈래(`aiShort`)로 두고 제목·문장을 따로 적는다 (새 디코드 L1906–L1911).
     * 전에는 실패 갈래로 흘려보내 제목이 `분석을 불러오지 못했어요` 로 나왔다.
     * 문구는 프로토타입 실측 그대로다 — 여기서 서버 `message` 를 쓰지 않는 이유는
     * 이 자리의 문장이 "왜 실패했나" 가 아니라 "무엇이 쌓이면 켜지나" 이기 때문이다.
     */
    if (isInsufficientDataErrorCode(code)) {
      return (
        <AiStatus
          code={code}
          title="아직 분석할 정보가 충분하지 않아요"
          description={
            <>
              공시와 뉴스가 조금 더 쌓이면
              <br />
              FINCH가 분석해드릴게요.
            </>
          }
        />
      );
    }

    // 문구는 서버가 완성해 준 message 를 쓴다 (컨벤션 §5). 화면이 다시 짓지 않는다.
    const message = readAiErrorMessage(error, '잠시 후 다시 시도해 주세요.');

    return (
      <AiStatus
        code={code}
        title="분석을 불러오지 못했어요"
        description={message}
        onRetry={() => {
          // 실패 화면이 분석 화면으로 통째로 갈리므로 "다시 불러왔다" 는 것은
          // 보이지만, 다시 실패해도 같은 화면이 그대로라 눌린 것인지 알 수 없다.
          // 그래서 성공했을 때만 알린다 (이슈 #54 회신).
          void analysis.refetch().then((result) => {
            if (result.isSuccess) {
              showToast('분석을 다시 불러왔어요.');
            }
          });
        }}
      />
    );
  }

  const { content, requestId, dataAsOf, citations, disclaimer } = analysis.data;

  /**
   * 기준 시각. AI 명세 §2.2 가 "UI 에 반드시 노출한다" 로 적었다 —
   * 시세는 지연될 수 있어 생성 시각과 따로 관리한다. 다섯 원천 중 읽지 않은 것은
   * 키가 빠지는 것이 아니라 `null` 이라(contracts C54) 값이 있는 것만 고른다.
   *
   * **어느 원천이 잡혔는지를 함께 들고 다닌다.** 값 하나만 넘기면 호출부가 그것을
   * 시:분까지 그릴지 날짜까지만 그릴지 정할 수 없다. `filings` 는 날짜 단위 값이라
   * `2026-08-20T15:00:00Z` 로 오고 KST 로 옮기면 자정이다 — 시:분을 붙이면 화면에
   * `00:00 기준` 이 떠서 값이 맞는데도 고장으로 읽힌다. `price` 는 장중에 갱신되는
   * 값이라 시:분이 의미를 갖는다. 그래서 포맷을 원천별로 가른다.
   */
  const asOf =
    dataAsOf.filings !== null
      ? { at: dataAsOf.filings, precision: 'day' as const }
      : dataAsOf.price !== null
        ? { at: dataAsOf.price, precision: 'minute' as const }
        : null;

  /**
   * 온 섹션만 표시 순서대로 고른다. **다섯이 전부 없을 수 있다** — 그때는 아래
   * 안내로 접는다. 요청에서 뺀 섹션은 키째로 빠지고(`exclude_unset`), 근거가
   * 모이지 않으면 값이 `null` 이라(C58) 둘을 함께 걸러야 한다.
   */
  const present = AI_ANALYSIS_SECTION_KEYS.flatMap((key) => {
    const section = content.sections[key] ?? null;
    return section === null ? [] : [{ key, section }];
  });

  const current = content.sections.current ?? null;
  const flat = present.filter((entry) => entry.key !== 'current');

  const sourceLabels = citationTypeLabels(citations);
  const sourceLine = [
    ...(asOf === null
      ? []
      : [
          `${
            asOf.precision === 'day'
              ? formatKstMonthDay(asOf.at)
              : formatKstMonthDayTime(asOf.at)
          } 기준`,
        ]),
    ...sourceLabels,
  ].join(' · ');

  return (
    // 위 여백은 차트 탭과 같은 18px 이다 — `pages/StockDetailPage.tsx` 주석의
    // "탭 내용의 위 여백은 각 탭이 스스로 갖는다(프로토타입 18px)" 근거를
    // 이 탭도 따른다 (2026-09-17 사용자 결정). 전에 `mt-1`(4px)이었던 이유는
    // 남아 있지 않다. 아래 24px 은 프로토타입 실측이다 (새 디코드 L1994).
    <div className="mt-4.5 pb-6">
      <AiCard
        label="AI 종목 분석"
        headline={
          present.length === 0
            ? '분석 본문을 준비하고 있어요.'
            : (current?.title ?? undefined)
        }
      >
        {present.length === 0 ? (
          <span className="mt-3 block text-body-2 text-ai-text-secondary">
            이 종목의 분석 내용은 아직 연결되지 않았어요. 근거와 기준 시각은
            아래에서 확인할 수 있어요.
          </span>
        ) : current === null ? null : (
          <span className="mt-3 block text-body-2 leading-6 text-pretty text-ai-text-secondary">
            <AiSegmentText
              segments={current.segments}
              text={current.text}
              onDark
            />
          </span>
        )}
      </AiCard>

      {flat.map((entry) => (
        <AnalysisSectionBlock
          key={entry.key}
          section={entry.section}
          caption={SECTION_CAPTION[entry.key]}
        />
      ))}

      {/*
        근거 표기는 **뱃지 목록이 아니라 캡션 한 줄**이다 (design.md §9 ·
        프로토타입 `{{ asOf }} 기준 · 공시 · 뉴스 · 자체계산`, 새 디코드 L1994).
        기준 시각이 그 줄의 첫 항목이고 형식은 프로토타입과 같은 `월.일 시:분` 이다.
        아랫줄이 면책 문구다 — 프로토타입도 같은 `.cp` 안의 `<br>` 한 번이다.

        disclaimer 는 하드코딩하지 않고 응답 값을 그대로 쓴다 — 규제 문구가 바뀌면
        서버만 고치게 하기 위해서다 (envelope.ts 주석).
      */}
      <p className="mt-5 text-caption leading-5 text-text-muted">
        {sourceLine === '' ? null : (
          <>
            {sourceLine}
            <br />
          </>
        )}
        {disclaimer}
      </p>

      <AiFeedbackRow requestId={requestId} className="mt-5" />
    </div>
  );
}
