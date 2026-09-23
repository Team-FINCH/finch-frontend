import { type Holding } from '@/shared/types/portfolio';

/**
 * 보유 평가금액에서 종목별 비중을 낸다 (FINCH-334).
 *
 * ## 왜 `ConcentrationCard` 밖으로 꺼냈나
 *
 * 같은 값을 **두 자리가 쓰게 됐다** — 종목 집중도 섹션의 스택 바·목록과, 위험도
 * 지표 3열의 `집중도` 보조값이다. 컴포넌트 안에 두면 위험도 쪽이 자기 계산을
 * 하나 더 갖게 되고, 그것이 정확히 지금 고치는 문제의 원인이다(아래).
 *
 * ## 화면의 "최대 종목 비중" 은 이 값 하나다 (FINCH-334)
 *
 * 전에는 한 화면에서 세 숫자가 같은 사실을 달리 말했다.
 *
 * | 자리 | 값 | 출처 |
 * | --- | --- | --- |
 * | 지표 3열 `집중도` | `42%` | 엔진 `indicators.top1Weight` (0.4168 반올림) |
 * | 종목 집중도 1위 | `38%` | 이 함수 — 원장 평가금액 |
 * | AI 문장 | `41.68%` | 엔진 `top1Weight` 원값 |
 *
 * **둘은 엔진 값, 하나는 원장 값이다.** 엔진 값이 다수라고 그쪽으로 맞추지
 * 않았다 — 스택 바의 칸 길이와 목록의 종목별 비중이 전부 이 원장 계산이라,
 * 지표만 엔진 값을 쓰면 **사용자가 화면에서 눈으로 검증할 수 있는 숫자와
 * 지표가 어긋난다.** 1위 칸이 화면 폭의 38% 를 차지하는데 위에 42% 라고 적혀
 * 있으면 어느 쪽도 믿을 수 없다.
 *
 * 그래서 지표 3열이 이 값을 받는다. 엔진 `top1Weight` 는 `AnalysisEvidenceSheet`
 * (계산 기준 시트)에 그대로 남는다 — 거기는 "점수를 무엇으로 계산했나" 를 적는
 * 자리라 엔진 값이 맞다.
 *
 * **AI 문장 속 `41.68%` 는 고치지 못한다.** 프론트가 AI 응답의 문장을 다시
 * 쓰지 않는다는 선(`ia.md` §4)을 넘는 일이다. 두 값이 벌어지는 근본 원인은
 * 엔진 스냅샷과 원장 스냅샷의 시점 차이라 **AI 파트 확인이 필요하다.**
 *
 * ## 반올림은 표시할 때만 한다
 *
 * 이 함수는 소수를 그대로 돌려준다. 스택 바의 칸 너비가 반올림된 값이면 합이
 * 100 을 벗어나고, 목록의 정수 % 는 호출부가 `Math.round` 로 만든다.
 */

export type ConcentrationSlice = {
  stockCode: string;
  stockName: string;
  /** 0~100. 반올림하지 않은 값이다 */
  percent: number;
};

export type Concentration = {
  /** 비중 내림차순 */
  slices: readonly ConcentrationSlice[];
  /** 1위 비중(0~100). 보유가 없거나 평가금액이 전부 없으면 `null` */
  top1Percent: number | null;
};

const EMPTY: Concentration = { slices: [], top1Percent: null };

export function resolveConcentration(
  holdings: readonly Holding[],
): Concentration {
  // 평가금액이 `null` 인 종목은 뺀다 — 시세를 못 받은 종목을 0 으로 넣으면
  // 나머지 종목의 비중이 실제보다 커진다.
  const priced = holdings.filter(
    (holding) => holding.evaluationAmount !== null,
  );
  const total = priced.reduce(
    (sum, holding) => sum + (holding.evaluationAmount ?? 0),
    0,
  );

  if (total === 0) {
    return EMPTY;
  }

  const slices = priced
    .map((holding) => ({
      stockCode: holding.stockCode,
      stockName: holding.stockName,
      percent: ((holding.evaluationAmount ?? 0) / total) * 100,
    }))
    .sort((a, b) => b.percent - a.percent);

  return { slices, top1Percent: slices[0]?.percent ?? null };
}

/**
 * 스택 바와 목록의 명도 계단 (FINCH-334).
 *
 * **색상(hue)이 아니라 명도로 순위를 말한다.** 전에는 종목마다 다른 틴트
 * (파랑·주황·초록…)를 해시로 배정했는데, 그 다섯 쌍에 적색·청색 계열이 섞여 있어
 * 등락색과 눈으로 겹쳤고 무엇보다 **색이 순위를 말해 주지 않았다** — 3위가 가장
 * 진해 보이는 날이 생긴다.
 *
 * 1위가 가장 진하고 아래로 갈수록 옅어진다. 네 번째부터는 마지막 값을 반복하지
 * 않고 한 단계씩 더 연하게 섞어, 종목이 많아도 위아래 칸이 붙어 보이지 않는다.
 */
const SHADE_STEPS = [
  'var(--color-text-primary)',
  '#8B95A1',
  'var(--color-border-strong)',
] as const;

/** 4위부터 쓰는 바닥색. `--color-border-strong` 보다 옅고 흰 면과는 갈린다. */
const SHADE_TAIL = '#E9ECEF';

export function shadeAt(index: number): string {
  return SHADE_STEPS[index] ?? SHADE_TAIL;
}
