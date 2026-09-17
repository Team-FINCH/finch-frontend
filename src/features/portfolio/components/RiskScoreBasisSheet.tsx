import { formatPercent } from '@/shared/lib/formatNumber';
import { type AiIndicators } from '@/shared/types/ai/diagnosis';
import { BottomSheet } from '@/shared/ui/BottomSheet';

/**
 * `위험 점수 기준` 시트 (FINCH-325).
 *
 * ## 왜 필요한가
 *
 * 화면이 `57 / 100` 을 가장 큰 글자로 내놓으면서 **그 숫자가 어디서 왔는지는 한
 * 글자도 말하지 않았다.** 점수를 크게 올린 것이 이 티켓이므로 근거를 볼 길도 같이
 * 만든다 — 프로토타입이 화면에 적어 둔 "등급은 정해진 계산 규칙으로 나오고,
 * FINCH는 이유만 설명해요" 가 점수에도 적용된다.
 *
 * ## 두 묶음으로 나눈 것이 이 시트의 내용이다
 *
 * `indicators` 열두 키 중 **점수에 들어가는 것은 다섯뿐이다**
 * (`ai/docs/engine-formulas.md` §3.6). 전에 화면에 펼쳐져 있던 `위험 지표` 6행은
 * 그 다섯과 **겹치지도 일치하지도 않았다** — `top1Weight`·`top3Weight`·
 * `maxDrawdown1y` 는 점수에 들어가지 않고, 반대로 점수의 두 축인 `hhi` 와
 * `diversificationRatio` 는 화면에 아예 없었다.
 *
 * 그래서 목록을 둘로 가른다. 사용자가 "43%인데 왜 57점이지" 를 물을 때 답이 되는
 * 것은 이 구분이다 — 43%는 `top1Weight` 이고 점수가 보는 것은 `hhi` 다.
 *
 * ## 적지 않은 것 둘
 *
 * **가중치 숫자(30·25·20·15·10)를 적지 않는다.** 엔진 상수이고 프론트가 베껴 두면
 * 엔진이 바꿀 때 화면만 조용히 거짓말을 한다 — `PortfolioStateSection` 이 "프론트가
 * 임계값을 새로 정하면 `ia.md` §4 를 어긴다" 고 적어 둔 것과 같은 이유다. 대신
 * **가중 순서로 줄을 세우고** 그 사실을 한 줄로 밝힌다. 순서도 엔진에서 온 정보라
 * 아래 `TODO(계약)` 로 남긴다.
 *
 * **등급 구간(35·65)을 적지 않는다.** 이쪽은 스테일 위험보다 더 나쁜 문제가 있다 —
 * 엔진이 등급 경계에 **±3점 히스테리시스**를 걸어 두었다(§3.6 "경계 안정화").
 * `moderate → high` 는 68점 이상이어야 올라간다. 그래서 `65점 이상 높음` 이라고
 * 적으면 66점이면서 `보통` 인 화면이 실제로 나오고, **사용자가 보는 화면이 우리가
 * 적어 둔 기준을 반증한다.** 높낮이의 방향만 말하고 경계는 등급 이름에 맡긴다.
 *
 * TODO(계약): 점수 구성과 가중을 응답이 주면 이 파일의 하드코딩이 사라진다.
 * `indicators` 옆에 `score_breakdown: [{key, weight, contribution}]` 같은 필드를
 * 요청해 두었다 — `_inbox/요청-ai-진단-점수근거.md`. 회신이 오면 `SCORE_COMPONENTS`
 * 를 지우고 응답을 그대로 그린다.
 */

/**
 * 점수에 들어가는 다섯 (`engine-formulas.md` §3.6). **배열 순서가 가중 순서다** —
 * 종목 집중도 30 · 섹터 집중도 25 · 변동성 20 · 분산 실패 15 · 현금 완충 10.
 *
 * 라벨에 지표 이름을 그대로 쓰지 않는다. `HHI` 는 허핀달-허시먼 지수의 약자이고
 * 사용자 어휘가 아니라, **무엇을 재는지**를 이름으로 쓰고 값만 그대로 보여준다.
 */
const SCORE_COMPONENTS = [
  {
    key: 'hhi',
    label: '종목 집중도',
    note: '한 종목에 얼마나 쏠렸는지',
  },
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
  {
    key: 'cashRatio',
    label: '현금 비중',
    note: '대응할 현금 여력이 있는지',
  },
] as const;

type RiskScoreBasisSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  indicators: AiIndicators;
};

export function RiskScoreBasisSheet({
  open,
  onOpenChange,
  indicators,
}: RiskScoreBasisSheetProps) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="위험 점수 기준">
      <p className="text-body-2 text-pretty text-text-secondary">
        점수가 높을수록 위험이 큰 상태예요. 아래 다섯 가지를 합쳐 계산하고, 위에
        있는 것이 점수에 더 크게 반영돼요.
      </p>

      <dl className="mt-5 flex flex-col gap-3.5">
        {SCORE_COMPONENTS.map((component) => (
          <div key={component.key}>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-body-2 font-medium text-text-primary">
                {component.label}
              </dt>
              <dd className="text-body-1 font-medium text-text-primary tabular-nums">
                {formatIndicator(component.key, indicators)}
              </dd>
            </div>
            <p className="mt-0.5 text-caption text-text-muted">
              {component.note}
            </p>
          </div>
        ))}
      </dl>

      <h3 className="mt-7 text-body-2 font-semibold text-text-primary">
        점수에 들어가지 않는 지표
      </h3>
      <p className="mt-1 text-caption text-pretty text-text-muted">
        함께 보면 도움이 되지만 점수에는 반영되지 않아요.
      </p>

      <dl className="mt-3.5 flex flex-col gap-2.5">
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
          `RiskScoreHero` 의 등급과 같은 3단이라 같은 어휘를 쓴다.
        */}
        {indicators.rateSensitivity !== null && (
          <ReferenceRow
            label="금리 민감도"
            text={rateSensitivityLabel(indicators.rateSensitivity)}
          />
        )}
      </dl>

      <p className="mt-7 text-caption text-pretty text-text-muted">
        모두 규칙 엔진이 계산한 값이에요. FINCH는 그 숫자의 뜻만 설명하고,
        점수를 직접 정하지 않아요.
      </p>
    </BottomSheet>
  );
}

function ReferenceRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-body-2 text-text-secondary">{label}</dt>
      <dd className="text-body-2 font-medium text-text-primary tabular-nums">
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
function formatIndicator(
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
