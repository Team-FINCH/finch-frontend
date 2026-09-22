import { useId, useState } from 'react';

import { stripCitationMarkers } from '@/shared/lib/citationMarkers';
import {
  type AiAnalysisSection,
  type AiAnalysisSectionKey,
} from '@/shared/types/ai/analysis';
import { AiSegmentText } from '@/shared/ui/AiSegmentText';

/**
 * 결론 카드 아래의 상세 분석 — 제목 줄만 늘어놓고 본문은 접는다
 * (FINCH-332).
 *
 * ## 평면 섹션 넷을 왜 접었나
 *
 * 전에는 `changes`·`attention`·`risks`·`nextEvents` 가 `제목 + 문단` 평면 섹션으로
 * **전부 펼쳐진 채** 36px 간격을 두고 세로로 쌓였다. 섹션마다 글이 같은 무게로
 * 서 있어서 위의 검정 카드(결론)와 아래 넷이 위계로 갈리지 않았고, 375px 에서
 * 첫 화면에 결론과 다음 섹션의 첫 문단이 함께 들어와 어디를 먼저 읽을지가
 * 화면에서 읽히지 않았다.
 *
 * 접으면 첫 화면이 **결론 하나 + 제목 넷**이 된다. 정보량은 그대로고 순서만
 * `결론 → 훑기 → 고른 것만 읽기` 로 바뀐다.
 *
 * ## 전부 접힌 채로 시작한다
 *
 * 하나를 미리 펼쳐 두면 그 섹션이 "가장 중요한 것" 이라는 뜻이 되는데, **응답에
 * 그런 순위가 없다.** `AnalysisSections` 는 섹션별 중요도·점수를 주지 않고
 * 표시 순서조차 화면이 정한 것이다(`AI_ANALYSIS_SECTION_KEYS`). 화면이 임의로
 * 하나를 펼치면 AI 가 하지 않은 판단을 화면이 하는 것이 된다.
 *
 * ## 미리보기는 `text` 를 잘라 두지 않고 CSS 로 자른다
 *
 * `slice()` 로 앞 N 자를 떼면 단어 가운데가 잘리고, 글자 폭이 서체·자간에 따라
 * 달라져 320px 과 430px 에서 같은 줄 수가 나오지 않는다. `truncate` 는 실제로
 * 넘치는 만큼만 말줄임하므로 폭이 바뀌어도 늘 한 줄이다.
 *
 * **`stripCitationMarkers` 를 통과시킨다.** `text` 원문에는 `[^cit_1]` 같은 각주가
 * 섞여 있고(mocks/handlers/ai.ts 픽스처) 그것을 지우는 일은 지금까지
 * `AiSegmentText` 안에서만 일어났다. 미리보기는 그 컴포넌트를 거치지 않으므로
 * 여기서 같은 함수를 직접 부른다 — 안 부르면 접힌 줄에만 각주가 새어 나온다.
 *
 * ## 뱃지도 상태색도 달지 않는다
 *
 * design.md §9 가 "뱃지를 쓰지 않는다", ia.md §4 가 "지표 표를 만들지 않는다" 로
 * 못박았다. 섹션마다 `긍정`·`주의` 같은 상태를 달려면 그 판정을 어딘가에서
 * 가져와야 하는데 **응답에 그 값이 없다.** 본문 텍스트에서 추정해 붙이면 AI 가
 * 내리지 않은 투자 판단을 화면이 지어내는 것이 된다. 구분은 제목 굵기 · 미리보기
 * 회색 · 줄 사이 구분선으로만 한다.
 *
 * ## 제목이 비면 문서가 적어 둔 서버 값으로 메운다
 *
 * `title` 은 스키마상 `.nullish()` 다 — 이 경로가 `response_model_exclude_unset`
 * 이라 설정되지 않은 필드가 키째로 빠질 수 있다(analysis.ts 주석). 그래서 목이
 * `035720` 하나에 `attention.title = null` 픽스처를 심어 두었다.
 *
 * **현실에는 없는 상태다.** ia.md §4 의 섹션 표가 다섯 제목을 열거하고 "위 제목은
 * **서버가 실제로 보내는 값**이다" 로 못박았고(AI 커밋 `58f9bba` 로 `SECTION_TITLES`
 * 가 화면 문구에 맞춰졌다), 같은 표의 "`null` 이 되는 조건" 칸은 `attention` 에
 * **"요청에서 뺐을 때만"** 이라고 적는다. 제목만 비는 갈래가 아니다.
 *
 * 그 없는 상태를 화면에 정직하게 그렸더니 **제목 달린 줄 셋 사이에 이름 없는 줄
 * 하나**가 섰다(2026-09-22 사용자 피드백 — "저거는 카테고리 없어? 왜 나왔는지
 * 모르겠어"). 이름 없는 칸은 사용자에게 "왜 여기 있는지" 를 설명할 길이 없다.
 *
 * 그래서 **ia.md 표의 값을 폴백으로 둔다.** 이것은 ia.md:447 이 막은 "화면이 제목을
 * 짓는 것" 이 아니다 — 그 금지의 이유는 "키 이름을 한국어로 옮겨 제목으로 쓰면 AI 가
 * 제목을 바꿀 때 화면이 못 따라간다" 이고, 여기서는 **응답의 `title` 이 언제나
 * 먼저 이긴다.** 폴백은 서버가 보내지 않기로 한 적 없는 값이 사고로 빠졌을 때만
 * 쓰이고, 값도 내가 지은 것이 아니라 문서가 서버 값으로 적어 둔 문자열이다.
 *
 * **`AI_ANALYSIS_SECTION_KEYS` 전부를 덮는 `Record` 라 제목이 없는 줄이 생기지
 * 않는다.** 섹션이 늘면 타입이 라벨을 요구한다. 그래서 이름 없는 줄을 위한 갈래를
 * 따로 두지 않는다.
 *
 * ## Radix 를 쓰지 않는다
 *
 * `@radix-ui/react-accordion` 은 설치돼 있지 않다(있는 것은 `dialog`·`tabs` 둘).
 * 여는 줄이 하나뿐인 단순 disclosure 라 `aria-expanded` + `aria-controls` 로
 * 충분하고, 이것 하나 때문에 의존성을 늘리지 않는다.
 */

/**
 * 제목이 빠졌을 때 쓰는 섹션 이름 (ia.md §4 "3번 슬롯 — 종목 분석은 섹션 7개다"
 * 표의 `화면 제목 (AI가 보낸 title 그대로)` 열).
 *
 * **평상시에는 한 글자도 쓰이지 않는다.** 응답의 `title` 이 늘 먼저다. 문자열을
 * 여기 적는 이유는 그 값을 화면이 고르기 위해서가 아니라, 서버가 보내기로 한 값이
 * 사고로 빠졌을 때 이름 없는 줄이 서지 않게 하기 위해서다. **서버가 문구를 바꾸면
 * 이 표가 아니라 응답이 이긴다.**
 *
 * `thesisCheck` 는 표에서 서버(`투자 논지 점검`)와 프로토타입(`나의 투자 기준`)이
 * 아직 갈리는 값인데(FINCH-219) 이 목록에 없다 — `myImpact` 와 함께 GitLab
 * 이슈 #92 로 응답에서 빠졌고 `AI_ANALYSIS_SECTION_KEYS` 도 다섯뿐이다.
 */
const SECTION_FALLBACK_TITLE: Record<AiAnalysisSectionKey, string> = {
  current: '현재 상황',
  changes: '최근 변화',
  attention: '시장이 주목하는 요인',
  risks: '확인해볼 위험',
  nextEvents: '앞으로 확인할 일정',
};

/**
 * 프로토타입 `.chev` — 문자 글리프가 아니라 두 변만 남긴 정사각을 돌린 것이다.
 * 접힘 45°(∨) · 펼침 -135°(∧).
 *
 * **`features/portfolio` 의 `ThesisChevron` 과 같은 모양인데 복사해 왔다.**
 * feature 끼리는 서로 import 하지 않는다(frontConvention · ESLint
 * `import-x/no-restricted-paths`). 셋째 자리가 생기면 그때 `shared/ui` 로 올린다 —
 * 지금 올리면 이 MR 이 남의 파트 파일을 함께 고치게 된다.
 */
function SectionChevron({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={[
        'size-2.25 flex-none border-r-[1.6px] border-b-[1.6px] border-text-muted',
        'transition-transform duration-(--motion-normal) ease-standard',
        open ? 'mt-0.5 rotate-[-135deg]' : '-mt-1 rotate-45',
      ].join(' ')}
    />
  );
}

export type AnalysisDetailEntry = {
  /** 섹션 키. 제목이 빠졌을 때 폴백을 고르는 데 쓴다 */
  sectionKey: AiAnalysisSectionKey;
  section: AiAnalysisSection;
  /** 섹션 아래 고정 캡션. 응답에 없는 시안 문구라 호출부가 갖는다 */
  caption?: string;
};

/**
 * 펼쳤을 때 보이는 본문. 접힌 동안에도 DOM 에 남지만 `hidden` 이라 보조기기가
 * 읽지 않는다 — 조건부 렌더로 빼면 `aria-controls` 가 없는 id 를 가리키게 된다.
 */
function DetailBody({
  section,
  caption,
}: {
  section: AiAnalysisSection;
  caption?: string;
}) {
  return (
    <>
      <p className="text-body-1 leading-6 text-pretty text-text-primary">
        <AiSegmentText segments={section.segments} text={section.text} />
      </p>
      {caption === undefined ? null : (
        <p className="mt-3 text-caption text-text-muted">{caption}</p>
      )}
    </>
  );
}

function DetailRow({ sectionKey, section, caption }: AnalysisDetailEntry) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  // 응답의 `title` 이 늘 먼저다. 폴백은 그것이 빠졌을 때만 선다 (위 주석).
  const title = section.title ?? SECTION_FALLBACK_TITLE[sectionKey];

  return (
    <li className="border-b border-divider last:border-b-0">
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((prev) => !prev)}
          className="flex w-full items-center gap-2.5 py-3.75 text-left"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-body-1 font-semibold tracking-[-0.01em] text-text-primary">
              {title}
            </span>
            {/*
              펼치면 같은 문장이 바로 아래 전문으로 나오므로 미리보기를 걷는다.
              남겨 두면 첫 줄이 두 번 읽힌다.
            */}
            {!open && (
              <span className="truncate text-caption text-text-muted">
                {stripCitationMarkers(section.text)}
              </span>
            )}
          </span>
          <span className="flex w-4 flex-none items-center justify-center">
            <SectionChevron open={open} />
          </span>
        </button>
      </h3>
      <div id={panelId} hidden={!open} className="pb-4">
        <DetailBody section={section} caption={caption} />
      </div>
    </li>
  );
}

/**
 * `자세히 보기` 묶음.
 *
 * **이 제목은 화면이 지었다.** ia.md:447 이 막은 것은 *분석 섹션의* 제목을 화면이
 * 짓는 것이고(그 자리는 응답 `title` 이 진다), 이것은 목록 묶음의 이름이라
 * 화면이 이미 짓고 있는 `분석 기준 및 안내`(`AnalysisSourceSheet`)와 같은 갈래다.
 *
 * 위 여백 36px 은 이 탭의 섹션 간격이다 (design.md §7.6 간격 체계 표).
 */
export function AnalysisDetailList({
  entries,
}: {
  entries: readonly AnalysisDetailEntry[];
}) {
  return (
    <section className="mt-9">
      <h2 className="text-section-title text-text-primary">자세히 보기</h2>
      <ul className="mt-1.5">
        {entries.map((entry) => (
          <DetailRow
            key={entry.sectionKey}
            sectionKey={entry.sectionKey}
            section={entry.section}
            caption={entry.caption}
          />
        ))}
      </ul>
    </section>
  );
}
