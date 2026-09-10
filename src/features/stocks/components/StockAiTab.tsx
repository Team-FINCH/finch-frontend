import { useNavigate } from 'react-router-dom';

import { isHttpError } from '@/shared/api';
import { ROUTES } from '@/shared/config/routes';
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
import { AI_SERVICE_ERROR_CODES } from '@/shared/types/errorCodes';
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
 * 섹션 일곱(`current`·`changes`·`attention`·`risks`·`myImpact`·`thesisCheck`·
 * `nextEvents`)의 키 구성이 `ai/docs/openapi.json` 으로 확정됐다(이슈 #15 닫힘,
 * contracts C57~C59). 스키마와 그 근거는 `shared/types/ai/analysis.ts` 에 있다.
 *
 * 지키는 규약 넷이다.
 * - **섹션 제목을 화면이 짓지 않고 응답의 `title` 을 그대로 쓴다**(ia.md:447).
 *   `title` 이 없으면 **제목을 그리지 않는다.** 키 이름(`myImpact` 등)을 한국어로
 *   옮겨 제목으로 쓰면 AI 가 제목을 바꿀 때 화면이 못 따라간다
 * - **`null` 섹션은 자리를 비운다**(ia.md:452). 접힌 카드도 "정보 없음" 박스도
 *   만들지 않는다 — 미보유 종목에서 개인화 섹션 둘이 빠지는 것이 정상 상태다
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
 * `thesisCheck.supporting`·`challenging` 과 `nextEvents.events` 도 지금 항상 빈
 * 배열이라(contracts C56) 전용 UI 를 만들지 않았다 — 그 자리를 그리려면 목이 계약보다
 * 관대해져야 한다. 값이 실제로 실려 오면 스키마는 이미 받고 있으니 여기만 고친다.
 *
 * `thesisCheck` 가 `null` 일 때의 논지 입력 유도는 **만들었다** (`ThesisPromptBlock`).
 * 보유 여부가 있어야 세는 자리라 `owned` 를 받는다 — 아래 그 주석 참고.
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
  /** AI 탭이 열려 있을 때만 부른다 — 안 그러면 차트만 보는 사람에게 AI 요금이 나간다. */
  isActive: boolean;
  /**
   * 보유 중인가 (`GET /stocks/{stockCode}` 의 `holding !== null`).
   * **논지 없음 유도를 띄울지가 여기서 갈린다** — 프로토타입 `d.needThesis` 가
   * `owned && !thesis` 다(새 디코드 L3712). `thesisCheck` 가 `null` 인 것만으로는
   * 미보유와 구별되지 않아 응답만으로는 셀 수 없다.
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
 * 나의 투자 기준 — 논지가 있을 때 (프로토타입 `d.hasThesis`, 새 디코드 L1958–L1971).
 *
 * 평면 섹션과 다르게 **흰 카드 하나**다 — 기록 날짜 · 논지 원문 · 구분선 ·
 * 점검 문장 넷을 담고 그 아래 `기록 확인하기` 행이 위키 탭으로 보낸다.
 * 원문·날짜는 `thesisCheck.thesis`(`text`·`recordedAt`)로 온다 — 스키마가 이미
 * 받고 있었는데 그리지 않고 있었다.
 *
 * `.card.d` 실측 — 흰 면 · 1px 테두리 · 반경 12 · 안쪽 여백 **16**.
 * `shared/ui/Card` 는 안쪽 여백이 20 이라 그대로 쓰면 실측에서 벗어나고
 * `className` 으로 덮으면 같은 특이도의 `p-*` 둘이 겹쳐 어느 쪽이 이길지 정해지지
 * 않는다. 그래서 이 자리만 손으로 적었다.
 *
 * 도착지는 `ia.md` L186 이 확정으로 적은 `/portfolio?tab=wiki` 다. 탭 값은
 * `features/portfolio` 가 갖지만 feature 끼리 import 가 막혀 있어(컨벤션 §2)
 * 문자열로 적는다.
 */
function ThesisCheckBlock({ section }: { section: AiAnalysisSection }) {
  const navigate = useNavigate();
  const thesis = section.thesis ?? null;

  return (
    <section className="mt-10">
      {section.title === null || section.title === undefined ? null : (
        <h3 className="mb-3.5 text-section-title text-text-primary">
          {section.title}
        </h3>
      )}

      <div className="rounded-card border border-border bg-surface p-4">
        {thesis === null ? null : (
          <>
            <p className="text-caption text-text-muted">
              {formatKstMonthDay(thesis.recordedAt)} 기록
            </p>
            <p className="mt-1.75 text-body-1 leading-6 text-pretty whitespace-pre-line text-text-primary">
              {thesis.text}
            </p>
            <div className="my-3.5 h-px bg-border" />
          </>
        )}
        <p className="text-body-2 text-pretty text-text-secondary">
          <AiSegmentText segments={section.segments} text={section.text} />
        </p>
      </div>

      <button
        type="button"
        onClick={() => void navigate(`${ROUTES.portfolio}?tab=wiki`)}
        className="mt-3.5 flex h-12.5 w-full items-center gap-3 rounded-[13px] bg-surface-soft px-4 text-left active:bg-primary-soft"
      >
        <span className="min-w-0 flex-1 text-[15px] font-semibold text-text-primary">
          기록 확인하기
        </span>
        <span
          aria-hidden="true"
          className="flex-none text-[15px] text-text-muted"
        >
          ›
        </span>
      </button>
    </section>
  );
}

/**
 * 나의 투자 기준 — 논지가 **없을** 때의 유도 (프로토타입 `d.needThesis`,
 * 새 디코드 L1970–L1976). 보유 중인데 기록이 없을 때만 나온다.
 *
 * 제목·문장은 응답이 아니라 **시안 문구**다. `thesisCheck` 가 `null` 이라 서버
 * `title` 이 애초에 오지 않는 자리이고, "섹션 제목을 화면이 짓지 않는다"(ia.md:453)
 * 는 응답이 있는 섹션에 거는 규약이다. `SECTION_CAPTION` 과 같은 성격이다.
 *
 * 실측 — 제목 아래 10px · 본문 `.b1` 행간 24 `--t2` · 행 50px, 위 14px, 안쪽 16,
 * 반경 13, 면 `#F5F6F8` · 라벨 15px/600 `--t1` · `›` 15px `--t3`. 논지가 있을 때의
 * `기록 확인하기` 행과 같은 모양이라 클래스를 맞췄다.
 *
 * **도착지는 AI 채팅이다. 프로토타입의 기록 시트가 아니다.** 프로토타입은
 * `openRecordSheet` 로 입력 시트를 열지만(L1974) **프론트에는 논지를 새로 쓸 API 가
 * 없다** — `POST /wiki/theses` 는 AI 서비스가 대화 안에서 스스로 부르는 경로이고
 * 프론트가 가진 것은 열람·수정·사실 삭제 셋뿐이다(contracts C5·C80·P34).
 * 그래서 ia.md:456 이 "입력 폼이 아니라 AI 채팅으로 보내는 버튼" 으로 못박은 쪽을
 * 따른다. 시트를 만들면 저장할 곳이 없는 폼이 된다.
 */
function ThesisPromptBlock({ stockCode }: { stockCode: string }) {
  const navigate = useNavigate();

  return (
    <section className="mt-10">
      <h3 className="mb-2.5 text-section-title text-text-primary">
        나의 투자 기준
      </h3>
      <p className="text-body-1 leading-6 text-pretty text-text-secondary">
        매수 이유를 기록해두면
        <br />
        다음 판단에서 다시 꺼내볼 수 있어요.
      </p>
      <button
        type="button"
        onClick={() =>
          void navigate(
            `${ROUTES.chat}?screen=stock_detail&ticker=${stockCode}`,
          )
        }
        className="mt-3.5 flex h-12.5 w-full items-center gap-3 rounded-[13px] bg-surface-soft px-4 text-left active:bg-primary-soft"
      >
        <span className="min-w-0 flex-1 text-[15px] font-semibold text-text-primary">
          ＋ 매수 이유 기록하기
        </span>
        <span
          aria-hidden="true"
          className="flex-none text-[15px] text-text-muted"
        >
          ›
        </span>
      </button>
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

export function StockAiTab({ stockCode, isActive, owned }: StockAiTabProps) {
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
    const code = isHttpError(error) ? error.code : undefined;

    /*
     * **데이터 부족은 실패가 아니다** (contracts C12 · design.md L1237-1255).
     * `409 INSUFFICIENT_DATA` 는 정상적인 거절이라 프로토타입도 실패(`aiFail`)와
     * 다른 갈래(`aiShort`)로 두고 제목·문장을 따로 적는다 (새 디코드 L1906–L1911).
     * 전에는 실패 갈래로 흘려보내 제목이 `분석을 불러오지 못했어요` 로 나왔다.
     * 문구는 프로토타입 실측 그대로다 — 여기서 서버 `message` 를 쓰지 않는 이유는
     * 이 자리의 문장이 "왜 실패했나" 가 아니라 "무엇이 쌓이면 켜지나" 이기 때문이다.
     */
    if (code === AI_SERVICE_ERROR_CODES.INSUFFICIENT_DATA) {
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
    const message = isHttpError(error)
      ? error.message
      : '잠시 후 다시 시도해 주세요.';

    return (
      <AiStatus
        code={code ?? undefined}
        title="분석을 불러오지 못했어요"
        description={message}
        onRetry={() => void analysis.refetch()}
      />
    );
  }

  const { content, requestId, dataAsOf, citations, disclaimer } = analysis.data;

  /**
   * 기준 시각. AI 명세 §2.2 가 "UI 에 반드시 노출한다" 로 적었다 —
   * 시세는 지연될 수 있어 생성 시각과 따로 관리한다. 다섯 원천 중 읽지 않은 것은
   * 키가 빠지는 것이 아니라 `null` 이라(contracts C54) 값이 있는 것만 고른다.
   */
  const asOfLabel = dataAsOf.filings ?? dataAsOf.price ?? null;

  /**
   * 온 섹션만 표시 순서대로 고른다. **일곱이 전부 없을 수 있다** — 그때는 아래
   * 안내로 접는다. 요청에서 뺀 섹션은 키째로 빠지고(`exclude_unset`) 개인화가
   * 꺼지거나 미보유면 값이 `null` 이라(C58) 둘을 함께 걸러야 한다.
   */
  const present = AI_ANALYSIS_SECTION_KEYS.flatMap((key) => {
    const section = content.sections[key] ?? null;
    return section === null ? [] : [{ key, section }];
  });

  const current = content.sections.current ?? null;
  const flat = present.filter((entry) => entry.key !== 'current');

  /**
   * 보유 중인데 논지가 없으면 그 자리에 유도를 둔다 (프로토타입 `d.needThesis`).
   * `thesisCheck` 는 기록된 활성 논지가 없을 때 `null` 이고(ia.md §4 표) 미보유일
   * 때도 `null` 이라(C58) 응답만으로는 둘을 못 가른다 — 보유 여부는 상세 응답에서
   * 온다. `null` 섹션을 빈 상자로 채우는 것과 다르다(ia.md:452): 그 규약은 "정보
   * 없음" 박스를 금지하는 것이고 이 자리는 다음 행동을 주는 유도다.
   */
  const needThesis = owned && (content.sections.thesisCheck ?? null) === null;
  const sourceLabels = citationTypeLabels(citations);
  const sourceLine = [
    ...(asOfLabel === null ? [] : [`${formatKstMonthDayTime(asOfLabel)} 기준`]),
    ...sourceLabels,
  ].join(' · ');

  return (
    // 위 4px · 아래 24px 은 프로토타입 실측이다 (새 디코드 L1926·L1994).
    <div className="mt-1 pb-6">
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

      {flat.map((entry) =>
        entry.key === 'thesisCheck' && entry.section.thesis != null ? (
          <ThesisCheckBlock key={entry.key} section={entry.section} />
        ) : (
          <AnalysisSectionBlock
            key={entry.key}
            section={entry.section}
            caption={SECTION_CAPTION[entry.key]}
          />
        ),
      )}

      {needThesis && <ThesisPromptBlock stockCode={stockCode} />}

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
