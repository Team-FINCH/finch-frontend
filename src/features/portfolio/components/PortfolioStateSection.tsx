import { type AiFinding, type AiIndicators } from '@/shared/types/ai/diagnosis';

/**
 * "포트폴리오 상태" — 지표 3개(집중도 · 업종 집중 · 변동성)에 등급 라벨 · 막대 · 설명 한 줄
 * (프로토타입 `metrics`, proto L2239–L2258 · L3999–L4007 · `design.md` §7.9).
 *
 * ## 등급을 어디서 받나
 *
 * 프로토타입은 `grade(p)` 로 **프론트가 임계값을 직접 판정한다**(proto L3386,
 * 45%·30% 경계). 그 자리를 우리는 서버 판정으로 채운다 — `findings[]` 가 규칙
 * 엔진이 걸어 둔 항목이고 `severity` 가 그 정도다(`ai/diagnosis.ts` "지표는 Risk
 * Engine 이, 문장은 LLM 이 만든다"). 프론트가 임계값을 새로 정하면 `ia.md` §4
 * "프론트는 AI 응답을 조립하지 않는다" 를 어긴다.
 *
 * **걸리지 않은 지표는 `양호` 다.** `findings[]` 에는 걸린 항목만 담기므로
 * 배열에 없다는 것이 곧 규칙 엔진이 짚지 않았다는 뜻이다. 프로토타입이 화면에
 * 적어 둔 "등급은 정해진 계산 규칙으로 나오고, FINCH는 이유만 설명해요." 가
 * 우리 계약에서도 그대로 참이다.
 *
 * ## 두 번째 행은 `분산` 이 아니라 `업종 집중` 이다 (FINCH-318)
 *
 * 세 행 모두 **길수록 나쁨 · 등급이 높을수록 나쁨** 한 방향이다. 전에는 두 번째
 * 행만 반대였다 — 이름이 `분산`, 막대가 `1 - sectorHhi`(길수록 좋음)인데 등급은
 * `sector_concentration` 의 `severity`(높을수록 나쁨)를 그대로 받아서, 막대가 긴
 * 계좌일수록 등급이 나빠 보였다. 사용자가 어느 쪽을 믿어야 할지 알 수 없었다.
 *
 * **프로토타입이 틀렸던 것이 아니라 우리가 반쪽만 옮겼다.** 프로토타입은 같은 값
 * (`100 - 최대 업종 비중`)으로 막대를 그리고 **그 값에서** 등급까지 직접 냈다
 * (`grade(p)`, proto L3386). 우리는 막대만 프로토타입을 따르고 등급은 서버 판정으로
 * 바꿨는데, 서버 판정의 대상은 분산이 아니라 집중이라 극성이 뒤집혔다. 그래서 행
 * 이름과 막대를 등급 쪽 극성에 맞춘다 — `METRIC_GRADE` 어휘 하나로 세 행을 계속
 * 덮을 수 있고 `findings[].id` 와도 이름이 맞는다.
 *
 * ## 설명 한 줄
 *
 * `design.md` §7.9 "진단 값만 보여주지 않고 의미를 한 줄로 번역" 이 요구하는 줄이다.
 * **AI 문장이 아니라 지표 라벨이다** — `indicators` 의 숫자를 우리가 문장 꼴로 적는
 * 것이고, 서버 문장(`summary.text` · `findings[].text`)에 값을 끼워 넣지 않는다.
 * 집중도 문장은 프로토타입 원문 그대로다. 변동성은 프로토타입이 "시장 평균 수준"
 * 이라는 고정 문장을 쓰는데 우리가 확인할 수 없는 주장이라, 가진
 * 값(`annualizedVolatility`)을 그대로 옮긴다.
 *
 * **업종 집중만 숫자가 없는 줄이다.** `sectorHhi` 는 허핀달 지수라 비중이 아니고,
 * `35%` 처럼 적으면 "어느 업종이 35%" 로 읽힌다. 역수(`1/HHI`)를 유효 업종 수로
 * 옮기는 읽기가 있지만 응답이 업종 이름도 개수도 주지 않아 정수로 반올림하는 순간
 * 없는 정밀도가 생긴다. 전에 쓰던 `{N}종목에 나눠 담았어요` 는 업종이 아니라 종목
 * 수라 애초에 이 행의 대상이 아니었고, 그 숫자는 바로 아래 `종목 집중도` 섹션이
 * 종목별 비중까지 보여준다. 지수 값 자체는 `위험 지표` 의 `섹터 집중도(HHI)` 에 있다.
 *
 * 값이 `null` 인 지표는 막대와 설명을 함께 접는다 — `design.md` §7.9 "실제 Score가
 * 있을 때만 길이 사용" 이다. 0 으로 그리면 없는 값이 "0%" 로 읽힌다.
 */

/**
 * 등급 라벨과 색 (proto L4004–L4007).
 *
 * `severity` 3종에 "걸리지 않음" 을 더한 넷을 프로토타입 어휘에 그대로 얹었다.
 * 색은 프로토타입 실측값이다 — `design.md` §7.9 는 "Neutral Charcoal" 과
 * "Red / Orange 상태색 남발 금지" 를 적었지만 프로토타입이 등급색을 쓰고,
 * 프로토타입이 디자인의 진실이다(같은 MR 에서 `design.md` 를 고쳤다).
 * 토큰이 없어 값을 직접 적는다 — `WikiGuessCarousel` 의 `#8A6B3D` 과 같다.
 */
const METRIC_GRADE = {
  none: { label: '양호', color: '#1B7F5A', barColor: '#3FA57C' },
  info: {
    label: '보통',
    color: 'var(--color-text-secondary)',
    barColor: '#9AA3AF',
  },
  medium: { label: '다소 높음', color: '#C2691C', barColor: '#D98A3D' },
  high: { label: '높음', color: '#C2691C', barColor: '#D98A3D' },
} as const;

/** 막대 바탕 (proto L2249). 대응 토큰이 없다 — `--color-skeleton` 은 쓰임이 다르다. */
const METRIC_BAR_TRACK = '#EDEFF2';

/**
 * 지표 3개가 각각 어느 `findings[].id` 를 등급으로 받는지 (`ai/diagnosis.ts`
 * `AI_FINDING_IDS`). 나머지 셋(`correlation`·`liquidity`·`macro_exposure`)은
 * 대응하는 지표가 프로토타입에 없어 아래 "확인된 사항" 에서만 나온다.
 */
const METRIC_FINDING_ID = {
  concentration: 'ticker_concentration',
  sectorConcentration: 'sector_concentration',
  volatility: 'volatility',
} as const;

type PortfolioStateSectionProps = {
  indicators: AiIndicators;
  findings: AiFinding[];
};

export function PortfolioStateSection({
  indicators,
  findings,
}: PortfolioStateSectionProps) {
  const { top1Weight, sectorHhi, annualizedVolatility } = indicators;

  return (
    <section className="mt-8">
      {/* 프로토타입이 이 두 섹션에서만 `.sht` 를 20px 로 덮어 쓴다 (proto L2240). */}
      <h2 className="mb-3.5 text-[20px] leading-7 font-bold tracking-[-0.02em] text-text-primary">
        포트폴리오 상태
      </h2>

      <div className="flex flex-col gap-7.5">
        <MetricRow
          label="집중도"
          grade={gradeOf(findings, METRIC_FINDING_ID.concentration)}
          barRatio={top1Weight}
          note={
            top1Weight === null
              ? null
              : `가장 큰 종목이 자산의 ${toPercent(top1Weight)}%를 차지해요.`
          }
        />
        <MetricRow
          label="업종 집중"
          grade={gradeOf(findings, METRIC_FINDING_ID.sectorConcentration)}
          // 허핀달 값을 그대로 채운다. 여집합(`1 - sectorHhi`)을 쓰면 막대만 반대
          // 방향이 된다 — 위 주석 "두 번째 행은 `분산` 이 아니라 `업종 집중` 이다".
          barRatio={sectorHhi}
          note={
            sectorHhi === null ? null : '같은 업종에 몰려 있으면 함께 움직여요.'
          }
        />
        <MetricRow
          label="변동성"
          grade={gradeOf(findings, METRIC_FINDING_ID.volatility)}
          // 프로토타입도 변동성에는 막대를 두지 않는다 (`hasBar:false`, proto L4003).
          barRatio={null}
          note={
            annualizedVolatility === null
              ? null
              : `연 기준 출렁임이 ${toPercent(annualizedVolatility)}% 수준이에요.`
          }
        />
      </div>

      <p className="mt-6.5 text-caption text-text-muted">
        등급은 정해진 계산 규칙으로 나오고, FINCH는 이유만 설명해요.
      </p>
    </section>
  );
}

type MetricRowProps = {
  label: string;
  grade: (typeof METRIC_GRADE)[keyof typeof METRIC_GRADE];
  /** 0~1 소수. `null` 이면 막대를 그리지 않는다 */
  barRatio: number | null;
  note: string | null;
};

function MetricRow({ label, grade, barRatio, note }: MetricRowProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[17px] font-bold tracking-[-0.01em] text-text-primary">
          {label}
        </span>
        <span className="text-[15px] font-bold" style={{ color: grade.color }}>
          {grade.label}
        </span>
      </div>

      {barRatio !== null && (
        <div
          className="mt-2.75 h-[5px] overflow-hidden rounded-full"
          style={{ background: METRIC_BAR_TRACK }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${clampPercent(barRatio)}%`,
              background: grade.barColor,
            }}
          />
        </div>
      )}

      {note !== null && (
        <p className="mt-2.75 text-caption text-text-muted">{note}</p>
      )}
    </div>
  );
}

/** 걸린 항목이 없으면 `양호` 다 — 규칙 엔진이 짚지 않았다는 뜻이다. */
function gradeOf(findings: AiFinding[], findingId: string) {
  const finding = findings.find((item) => item.id === findingId);
  return finding === undefined
    ? METRIC_GRADE.none
    : METRIC_GRADE[finding.severity];
}

/** 자릿수는 프로토타입과 같은 정수 % 다 (`toFixed(0)`, proto L4000-4002). */
function toPercent(ratio: number): number {
  return Math.round(ratio * 100);
}

/** 막대 길이는 0~100 을 넘지 않는다. 지표가 범위를 벗어나도 칸을 밀지 않는다. */
function clampPercent(ratio: number): number {
  return Math.min(100, Math.max(0, ratio * 100));
}
