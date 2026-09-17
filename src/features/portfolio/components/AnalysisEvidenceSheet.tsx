import { formatPercent } from '@/shared/lib/formatNumber';
import { type AiIndicators } from '@/shared/types/ai/diagnosis';
import { type AiCitation } from '@/shared/types/ai/envelope';
import { AiCitationList } from '@/shared/ui/AiCitationList';
import { BottomSheet } from '@/shared/ui/BottomSheet';

/**
 * `분석 근거` 시트 — 계산 기준 · 지표 값 · 근거 · 면책 (FINCH-325).
 *
 * ## 시트를 하나로 합쳤다
 *
 * 열리는 입구가 둘이다 — Hero 의 KPI 3열, 그리고 본문 맨 아래
 * `근거 N개 · 계산 기준 보기`. **같은 내용을 두 시트로 나누지 않는다.** KPI 를 눌러
 * 들어온 사용자가 궁금한 것("이 등급이 왜 나왔나")과 근거를 눌러 들어온 사용자가
 * 궁금한 것("이 숫자를 어디서 가져왔나")의 답이 같은 표 안에 있다.
 *
 * ## 지표를 두 묶음으로 가른다
 *
 * `indicators` 열두 키 중 **점수에 들어가는 것은 다섯뿐이다**
 * (`ai/docs/engine-formulas.md` §3.6). 전에 화면에 펼쳐져 있던 `위험 지표` 6행은 그
 * 다섯과 겹치지도 일치하지도 않았다 — `top1Weight`·`top3Weight`·`maxDrawdown1y` 는
 * 점수에 들어가지 않고, 반대로 점수의 두 축인 `hhi` 와 `diversificationRatio` 는
 * 화면에 아예 없었다.
 *
 * 사용자가 실제로 묻는 "1위 종목이 42%인데 왜 57점이지" 의 답이 이 구분이다 —
 * 42%는 `top1Weight` 이고 점수가 보는 값은 `hhi` 다.
 *
 * ## 적지 않은 것 둘
 *
 * **가중치 숫자(30·25·20·15·10)를 적지 않는다.** 엔진 상수라 프론트가 베껴 두면
 * 엔진이 바꿀 때 화면만 조용히 거짓말을 한다. 대신 **가중 순서로 줄을 세우고** 그
 * 사실만 한 줄로 밝힌다.
 *
 * **등급 구간(35·65)을 적지 않는다.** 엔진이 경계에 **±3점 히스테리시스**를 걸어
 * 뒀다(§3.6 "경계 안정화") — `moderate → high` 는 68점 이상이어야 올라간다. 그래서
 * `65점 이상 높음` 이라고 적으면 66점이면서 `보통` 인 화면이 실제로 나오고,
 * **사용자가 보는 화면이 우리가 적어 둔 기준을 반증한다.**
 *
 * TODO(계약): 점수 구성과 가중을 응답이 주면 `SCORE_COMPONENTS` 가 사라진다.
 * `score_breakdown: [{key, weight}]` 를 요청해 뒀다 — `_inbox/요청-ai-진단-점수근거.md`.
 *
 * ## 면책은 여기서 끝난다
 *
 * 전에는 본문 맨 아래 한 단락으로 상시 노출됐다. 중요한 문구지만 매번 읽는 글이
 * 아니라 `design.md` §7.6 이 근거를 캡션 위계로 두는 것과 같은 취급을 한다 —
 * 본문에는 `근거 N개 · 계산 기준 보기` 한 줄만 남고 전문은 이 시트 맨 아래다.
 *
 * ## 스크롤 래퍼를 직접 둔다
 *
 * `BottomSheet` 는 `max-h-[80%]` 만 걸고 **`overflow-y` 를 강제하지 않는다** — 짧은
 * 시트까지 스크롤 영역을 두면 스크롤바 없는 영역만 생긴다는 이유가 그쪽 주석에
 * 적혀 있다. 이 시트는 구성 지표 다섯 + 참고 지표 넷 + 근거 + 면책이라 모바일
 * 높이의 80% 를 넘는다. 그래서 `ThesisRecordSheet` 와 같은 래퍼를 쓴다 —
 * `min-h-0 flex-1 overflow-y-auto`. 좌우 `-mx-0.5 px-0.5` 는 스크롤 영역 안에서
 * 포커스 링이 잘리지 않게 두는 여유다.
 */

/**
 * 점수에 들어가는 다섯 (`engine-formulas.md` §3.6). **배열 순서가 가중 순서다** —
 * 종목 집중도 30 · 섹터 집중도 25 · 변동성 20 · 분산 실패 15 · 현금 완충 10.
 *
 * 라벨에 지표 이름(`HHI`)을 그대로 쓰지 않는다. 사용자 어휘가 아니라 **무엇을
 * 재는지**를 이름으로 쓰고 값만 그대로 보여준다.
 */
const SCORE_COMPONENTS = [
  { key: 'hhi', label: '종목 집중도', note: '한 종목에 얼마나 쏠렸는지' },
  {
    key: 'sectorHhi',
    label: '업종 집중도',
    note: '같은 업종에 얼마나 몰렸는지',
  },
  {
    key: 'annualizedVolatility',
    label: '변동성',
    note: '연 기준으로 얼마나 출렁였는지',
  },
  {
    key: 'diversificationRatio',
    label: '분산 효과',
    note: '나눠 담은 만큼 위험이 줄었는지',
  },
  { key: 'cashRatio', label: '현금 비중', note: '대응할 현금 여력이 있는지' },
] as const;

type AnalysisEvidenceSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indicators: AiIndicators;
  citations: readonly AiCitation[];
  /** 봉투가 늘 실어 주는 면책 문구. 화면이 지어내지 않는다 */
  disclaimer: string;
};

export function AnalysisEvidenceSheet({
  open,
  onOpenChange,
  indicators,
  citations,
  disclaimer,
}: AnalysisEvidenceSheetProps) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="분석 근거">
      <div className="scroll-touch -mx-0.5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-0.5">
        <h3 className="text-body-2 font-semibold text-text-primary">
          위험 점수 계산 기준
        </h3>
        <p className="mt-1 text-caption text-pretty text-text-muted">
          아래 다섯 가지를 합쳐 계산해요. 위에 있는 것이 점수에 더 크게
          반영돼요.
        </p>

        <dl className="mt-3.5 flex flex-col gap-3">
          {SCORE_COMPONENTS.map((component) => (
            <div key={component.key}>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="min-w-0 truncate text-body-2 font-medium text-text-primary">
                  {component.label}
                </dt>
                <dd className="flex-none text-body-2 font-medium text-text-primary tabular-nums">
                  {formatComponent(component.key, indicators)}
                </dd>
              </div>
              <p className="mt-0.5 text-caption text-text-muted">
                {component.note}
              </p>
            </div>
          ))}
        </dl>

        <h3 className="mt-6 text-body-2 font-semibold text-text-primary">
          점수에 들어가지 않는 지표
        </h3>
        <dl className="mt-2.5 flex flex-col gap-2">
          <ReferenceRow
            label="1위 종목 비중"
            text={percent(indicators.top1Weight)}
          />
          <ReferenceRow
            label="상위 3종목 비중"
            text={percent(indicators.top3Weight)}
          />
          <ReferenceRow
            label="최근 1년 최대 낙폭"
            text={percent(indicators.maxDrawdown1y)}
          />
          {/*
          금리 민감도는 비율이 아니라 문자열이다(`high` 등). **열거값을 그대로
          내보내지 않는다** — `design.md` §13 이 시스템 용어 노출을 막는다.
        */}
          {indicators.rateSensitivity !== null && (
            <ReferenceRow
              label="금리 민감도"
              text={rateSensitivityLabel(indicators.rateSensitivity)}
            />
          )}
        </dl>

        {/* 같은 문서의 청크를 한 줄로 묶는 로직이 이 컴포넌트 안에 이미 있다. */}
        <AiCitationList
          citations={citations}
          title="참고한 자료"
          className="mt-6"
        />

        <p className="mt-6 text-caption text-pretty text-text-muted">
          {disclaimer}
        </p>
      </div>
    </BottomSheet>
  );
}

function ReferenceRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="min-w-0 truncate text-body-2 text-text-secondary">
        {label}
      </dt>
      <dd className="flex-none text-body-2 font-medium text-text-primary tabular-nums">
        {text}
      </dd>
    </div>
  );
}

/**
 * 구성요소 다섯은 **단위가 세 갈래다.** 전부 `%` 로 찍으면 지수와 배수가 비율로
 * 읽힌다 — `diversificationRatio: 1.18` 을 `118%` 로 적으면 현금 비중 38% 와 같은
 * 계열처럼 보인다.
 *
 * - `annualizedVolatility` · `cashRatio` — 0~1 비율이라 `%` 다
 * - `hhi` · `sectorHhi` — 허핀달 지수. 비중이 아니라 **지수**라 소수 둘로 적는다
 * - `diversificationRatio` — 비율이 아니라 **배수**라 `배` 를 붙인다
 */
function formatComponent(
  key: (typeof SCORE_COMPONENTS)[number]['key'],
  indicators: AiIndicators,
): string {
  const value = indicators[key];
  if (value === null) {
    return '—';
  }
  if (key === 'annualizedVolatility' || key === 'cashRatio') {
    return formatPercent(value, 0);
  }
  if (key === 'diversificationRatio') {
    return `${value.toFixed(2)}배`;
  }
  return value.toFixed(2);
}

/** 계산되지 않은 지표는 0 이 아니라 `null` 이라 `—` 로 비운다. */
function percent(ratio: number | null): string {
  return ratio === null ? '—' : formatPercent(ratio, 0);
}

function rateSensitivityLabel(rateSensitivity: string): string {
  const known: Record<string, string> = {
    low: '낮음',
    moderate: '보통',
    high: '높음',
  };
  return known[rateSensitivity] ?? rateSensitivity;
}
