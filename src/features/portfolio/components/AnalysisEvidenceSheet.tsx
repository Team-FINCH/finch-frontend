import { formatPercent } from '@/shared/lib/formatNumber';
import { type AiIndicators } from '@/shared/types/ai/diagnosis';
import { type AiCitation } from '@/shared/types/ai/envelope';
import { AiCitationList } from '@/shared/ui/AiCitationList';
import { BottomSheet } from '@/shared/ui/BottomSheet';

/**
 * `위험 점수는 이렇게 계산해요` 시트 — 점수 구성 · 참고 지표 · 근거 · 면책
 * (FINCH-325).
 *
 * 열리는 입구가 둘이다 — Hero 의 KPI 3열, 그리고 본문 맨 아래
 * `근거 N개 · 계산 기준 보기`. **같은 내용을 두 시트로 나누지 않는다.** KPI 를 눌러
 * 들어온 사용자의 질문("이 등급이 왜 나왔나")과 근거를 눌러 들어온 사용자의
 * 질문("이 숫자를 어디서 가져왔나")의 답이 같은 표 안에 있다.
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
 * ## 가중치는 있다. 숫자는 적지 않는다
 *
 * 나열 순서가 아니라 **실제 가중이다** — `risk.py` `_SCORE_COMPONENTS` 가
 * 30·25·20·15·10 을 들고 있고 합이 100 인 것을 테스트가 검증한다. 그래서 반영
 * 크기를 말하는 문장을 유지하되 **양 끝만 이름으로 부른다**(종목 집중도가 가장
 * 크게 · 현금 비중이 가장 작게). 숫자를 베껴 두면 엔진이 가중을 바꿀 때 화면만
 * 조용히 거짓말을 한다.
 *
 * **등급 구간(35·65)도 적지 않는다.** 엔진이 경계에 ±3점 히스테리시스를 걸어
 * 뒀다(§3.6) — `moderate → high` 는 68점 이상이어야 올라간다. `65점 이상 높음` 이라
 * 적으면 66점이면서 `보통` 인 화면이 실제로 나와, **사용자가 보는 화면이 우리가
 * 적어 둔 기준을 반증한다.**
 *
 * TODO(계약): `score_breakdown: [{key, weight}]` 과 `n_eff` 를 요청해 뒀다 —
 * `_inbox/요청-ai-진단-점수근거.md`. 오면 `SCORE_COMPONENTS` 의 순서 의존이 사라지고
 * 허핀달 지수를 유효 종목 수로 바꿔 적을 수 있다.
 *
 * ## 면책은 여기서 끝난다
 *
 * 전에는 본문 맨 아래 한 단락으로 상시 노출됐다. 중요한 문구지만 매번 읽는 글이
 * 아니라 `design.md` §7.6 이 근거를 캡션 위계로 두는 것과 같은 취급을 한다.
 *
 * ## 스크롤 래퍼를 직접 둔다
 *
 * `BottomSheet` 는 `max-h-[80%]` 만 걸고 **`overflow-y` 를 강제하지 않는다** — 짧은
 * 시트까지 스크롤 영역을 두면 스크롤바 없는 영역만 생긴다는 이유가 그쪽 주석에
 * 적혀 있다. `ThesisRecordSheet` 와 같은 래퍼를 쓴다.
 */

/**
 * 점수에 들어가는 다섯 (`engine-formulas.md` §3.6). **배열 순서가 가중 순서다** —
 * 종목 집중도 30 · 섹터 집중도 25 · 변동성 20 · 분산 실패 15 · 현금 완충 10.
 *
 * `note` 는 **지표의 정의**다. "얼마나 쏠렸는지" 같은 구어체를 쓰지 않는다 —
 * 지표명은 정확하게 두고 설명은 한 줄로 끝낸다.
 */
const SCORE_COMPONENTS = [
  { key: 'hhi', label: '종목 집중도', note: '특정 종목에 자산이 집중된 정도' },
  {
    key: 'sectorHhi',
    label: '업종 집중도',
    note: '특정 업종에 자산이 집중된 정도',
  },
  {
    key: 'annualizedVolatility',
    label: '변동성',
    note: '최근 1년간 수익률의 변동 수준',
  },
  {
    key: 'diversificationRatio',
    label: '분산 효과',
    note: '자산 간 분산으로 위험이 완화된 정도',
  },
  {
    key: 'cashRatio',
    label: '현금 비중',
    note: '전체 자산 중 현금성 자산의 비중',
  },
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
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="위험 점수는 이렇게 계산해요"
    >
      <div className="scroll-touch -mx-0.5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-0.5">
        <p className="text-body-2 text-pretty text-text-secondary">
          포트폴리오의 집중도, 업종 분산, 변동성, 분산 효과, 현금 비중을 종합해
          위험 수준을 계산해요.
        </p>
        {/*
          반영 크기를 말하는 문장. **실제 가중이 있어서 남긴다** — 위 파일 머리 주석
          "가중치는 있다. 숫자는 적지 않는다" 참고.
        */}
        <p className="mt-1.5 text-caption text-pretty text-text-muted">
          종목 집중도가 가장 크게, 현금 비중이 가장 작게 반영돼요.
        </p>

        <SectionLabel className="mt-6">위험 점수 구성</SectionLabel>
        <dl className="mt-1 flex flex-col divide-y divide-border">
          {SCORE_COMPONENTS.map((component) => (
            <div key={component.key} className="py-3">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="min-w-0 truncate text-body-2 font-medium text-text-primary">
                  {component.label}
                </dt>
                <dd className="flex-none text-body-2 font-semibold text-text-primary tabular-nums">
                  {formatComponent(component.key, indicators)}
                </dd>
              </div>
              <p className="mt-0.5 text-caption text-pretty text-text-muted">
                {component.note}
              </p>
            </div>
          ))}
        </dl>

        <SectionLabel className="mt-7">참고 지표</SectionLabel>
        <p className="mt-1 text-caption text-pretty text-text-muted">
          위험 점수에는 반영하지 않지만 포트폴리오를 이해할 때 함께 참고해요.
        </p>

        <dl className="mt-2.5 flex flex-col gap-2.5">
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
          className="mt-7"
        />

        <p className="mt-7 text-caption text-pretty text-text-muted">
          {disclaimer}
        </p>
      </div>
    </BottomSheet>
  );
}

/**
 * 묶음 이름. 본문보다 **작은** 캡션 위계로 둔다 — 시트 안에서 제목이 본문보다 크면
 * 덩어리마다 새 화면이 시작하는 것처럼 읽힌다. 크기가 아니라 색과 자간으로
 * 구분한다(`AiCard` 의 기능 라벨과 같은 방식).
 */
function SectionLabel({
  children,
  className = '',
}: {
  children: string;
  className?: string;
}) {
  return (
    <h3
      className={`text-caption font-semibold tracking-[.02em] text-text-secondary ${className}`}
    >
      {children}
    </h3>
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
 * - `diversificationRatio` — 비율이 아니라 **배수**라 `배` 를 붙인다
 * - `hhi` · `sectorHhi` — 허핀달 지수다. **`지수` 를 앞에 붙인다** ↓
 *
 * ## 허핀달에 `지수` 를 붙이는 이유
 *
 * `hhi = Σ ŵᵢ²`, `sectorHhi = Σⱼ (Σ_{i∈j} ŵᵢ)²` 로 **비중의 제곱합**이다(§3.1,
 * 현금을 빼고 재정규화한 비중을 쓴다). 비중이 아니므로 100 을 곱하면 안 되고, 맨
 * 숫자 `0.34` 로 두면 옆 행의 `28%`·`1.18배` 와 나란히 서면서 단위가 빠진 비율처럼
 * 읽힌다.
 *
 * **등급(`높음`)을 값 자리에 쓰지 않았다.** `findings[].severity` 가 있지만 임계값이
 * 이 값이 아니라 **다른 지표**에 걸려 있다(§3.7) — `ticker_concentration` 은 `top1`,
 * `sector_concentration` 은 단일 섹터 비중이 기준이다. `종목 집중도 0.34` 옆에
 * `높음` 을 붙이면 `top1`(42%) 의 판정을 허핀달에 얹는 것이 된다. 나머지 셋
 * (변동성·분산 효과·현금 비중)은 같은 값을 재지만, 다섯 중 셋만 등급을 달면 표가
 * 들쭉날쭉해진다.
 *
 * 엔진 문서는 더 나은 답을 이미 적어 뒀다 — "HHI 0.28은 사용자에게 아무 의미가
 * 없지만 '사실상 3.6종목에 나눠 담은 것과 같다'는 즉시 이해된다. LLM 프롬프트에는
 * HHI가 아니라 `N_eff`를 넣는다"(§3.1). 그 `N_eff = 1/HHI` 가 **응답 필드에 없어**
 * 프론트가 나눠 만들어야 하는데 지표 파생은 화면이 할 일이 아니다. 요청해 뒀고
 * 오면 이 함수만 고치면 된다.
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
  return `지수 ${value.toFixed(2)}`;
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
