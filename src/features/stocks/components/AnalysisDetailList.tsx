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
 * ## 제목이 없는 섹션은 접지 않는다
 *
 * `title` 은 `.nullish()` 이고 실제로 `null` 로 오는 갈래가 있다(목 `035720` 의
 * `attention`). 접는 줄에는 누를 이름이 있어야 하는데 **ia.md:447 이 "섹션 제목을
 * 화면이 짓지 않는다" 로 막아 둔 자리**라 키 이름을 한국어로 옮겨 넣을 수 없다.
 * 그래서 그 섹션만 펼친 채로 같은 목록 안에 둔다 — 순서
 * (`AI_ANALYSIS_SECTION_KEYS`)를 깨지 않으면서 없는 제목을 짓지도 않는다.
 *
 * ## Radix 를 쓰지 않는다
 *
 * `@radix-ui/react-accordion` 은 설치돼 있지 않다(있는 것은 `dialog`·`tabs` 둘).
 * 여는 줄이 하나뿐인 단순 disclosure 라 `aria-expanded` + `aria-controls` 로
 * 충분하고, 이것 하나 때문에 의존성을 늘리지 않는다.
 */

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
  key: AiAnalysisSectionKey;
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

function DetailRow({ section, caption }: Omit<AnalysisDetailEntry, 'key'>) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const title = section.title ?? null;

  // 제목이 없으면 누를 이름이 없다. 접지 않고 펼친 채 둔다 (위 주석).
  if (title === null) {
    return (
      <li className="border-b border-divider py-3.75 last:border-b-0">
        <DetailBody section={section} caption={caption} />
      </li>
    );
  }

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
            key={entry.key}
            section={entry.section}
            caption={entry.caption}
          />
        ))}
      </ul>
    </section>
  );
}
