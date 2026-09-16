import { formatKstTime } from '@/shared/lib/formatDate';

/**
 * 계산 기준과 기준 시각 (FINCH-308).
 *
 * ## 큰 섹션에서 각주로 내렸다
 *
 * 전에는 `확인해볼 점` 이라는 섹션 제목 아래 `notes` 를 본문 크기로 그렸다.
 * 거기 담기는 것은 `일부 섹터 벤치마크를 대체 지표로 채웠어요` 같은 **계산 방법의
 * 단서**지 사용자가 확인해야 할 일이 아니다. 제목을 달면 종목별 기여와 같은 위계가
 * 되어 "확인해야 할 무언가가 있나" 하고 눈이 멈춘다.
 *
 * 그래서 제목을 없애고 캡션 크기 muted 글자로 내렸다. 화면 맨 아래, 기준 시각·
 * 고지와 한 덩어리로 묶는다 — 셋 다 "이 숫자를 어떻게 읽어야 하는가" 에 대한
 * 각주라서 자리가 같다.
 *
 * `notes` 는 엔진이 만든다(`AttributionResult.notes`). 하루 구간이라 다기간 링킹을
 * 건너뛴 경우, 매칭된 공시가 없는 경우에 붙는다. 없으면 빈 배열이다.
 */

type AnalysisMethodNoteProps = {
  /** 엔진이 계산 중 붙인 단서. 없으면 빈 배열이다 */
  notes: readonly string[];
  /** 원천별 기준 시각 중 고른 하나. 없으면 `null` */
  asOf: string | null;
  disclaimer: string;
};

export function AnalysisMethodNote({
  notes,
  asOf,
  disclaimer,
}: AnalysisMethodNoteProps) {
  return (
    // 위 구분선은 이 화면에서 유일한 divider 다. 각주가 콘텐츠가 아니라는 것을
    // 여백만으로 말하기 어려운 자리라 여기만 선을 쓴다.
    <div className="mt-12 flex flex-col gap-1.5 border-t border-border pt-5">
      {notes.map((note) => (
        <p key={note} className="text-caption text-pretty text-text-muted">
          {note}
        </p>
      ))}

      {/*
        기준 시각. AI 명세 §2.2 가 "UI 에 반드시 노출한다" 로 적었고 프로토타입도
        이 자리에 `{asOf} 기준` 을 둔다(proto L2353). 원천별로 값이 있는 것만
        고르는 것은 `StockAiTab` 과 같은 방식이다(contracts C54).
      */}
      <p className="text-caption leading-5 text-text-muted">
        {asOf === null ? null : `${formatKstTime(asOf)} 기준 · `}
        {disclaimer}
      </p>
    </div>
  );
}
