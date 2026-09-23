import { type AiFinding } from '@/shared/types/ai/diagnosis';

/**
 * 진단 등급의 라벨과 색. **AI 진단 탭의 단일 출처다** (FINCH-325).
 *
 * `findings[].severity` 3종에 "걸리지 않음"(`none`)을 더한 넷이다. `severity` 는
 * 규칙 엔진 판정이고 임계값은 `ai/docs/engine-formulas.md` §3.7 에 있다 — 프론트가
 * 다시 판정하지 않는다.
 *
 * ## 네 단계에 네 색을 준다
 *
 * 전에는 색이 셋이었다. `다소 높음` 과 `높음` 이 같은 주황이라(한때는 `다소 높음` 을
 * 중립으로 내려 `보통` 과 같아지기도 했다) **어휘 넷 중 두 쌍이 색으로 구분되지
 * 않았다.** 등급 이름을 네 단계로 두는 한 색도 네 단계여야 한다.
 *
 * 값은 지어내지 않고 **같은 화면이 이미 쓰는 스케일에서 가져왔다** — 종목 집중도
 * 스택 바의 수준 색이 `쏠림` `#E25555` · `다소 높음` `#E0912F` 다(`design.md` §7.9).
 * 같은 말(`다소 높음`)이 한 화면에서 두 색으로 보이면 두 스케일이 서로를 반증한다.
 *
 * | 등급 | 색 | 출처 |
 * | --- | --- | --- |
 * | `양호` | `#1B7F5A` | 프로토타입 등급색 (proto L4004–L4007) |
 * | `보통` | `--color-text-secondary` | 중립. 짚을 것이 없다는 뜻이라 색을 주지 않는다 |
 * | `다소 높음` | `#E0912F` | 종목 집중도 스케일의 같은 라벨 |
 * | `높음` | `#E25555` | 그 스케일에서 가장 나쁜 단계(`쏠림`)의 색 |
 *
 * ## 빨강이 상승색과 겹치는 것에 대해
 *
 * `--color-stock-up` 이 `#C93B3B` 라 이 앱에서 빨강은 **상승**이기도 하다. 그래도
 * 여기에 빨강을 쓰는 이유는, 바로 아래 스택 바가 이미 `#E25555` 를 위험 최고
 * 단계에 쓰고 있어서다 — 이 화면 안에서는 빨강이 등락색이 아니라 위험색이라는
 * 약속이 먼저 서 있다. `design.md` §7.9 이 "상태색은 등급 막대와 종목 집중도
 * 스택 바 안에서만 쓴다" 로 그 범위를 가둬 둔 것도 같은 취지다.
 *
 * **등락 표기에는 절대 쓰지 않는다.** 이 상수는 등급 라벨 전용이다.
 */
/**
 * `severity` 를 함께 든다 (FINCH-334). 호출부가 등급끼리 **견줘야** 하는
 * 자리가 생겼다 — 위험도 지표 3열이 셋 중 가장 나쁜 칸 하나만 굵게 한다.
 * 라벨 문자열로 견주면 문구를 고치는 날 판정이 조용히 깨진다.
 *
 * `color` 는 남겨 두지만 **쓰는 곳이 줄었다.** 지표 3열은 이제 상태 글자에 색을
 * 쓰지 않는다(빨강·파랑은 등락색이고 주황·초록을 더하면 상태색 체계가 새로
 * 생긴다 — `PortfolioRiskSummary` 주석). 남은 소비자는 종목 집중도 머리의
 * 등급 글자 하나다.
 */
export const RISK_GRADE = {
  none: { severity: 'none', label: '양호', color: '#1B7F5A' },
  info: {
    severity: 'info',
    label: '보통',
    color: 'var(--color-text-secondary)',
  },
  medium: { severity: 'medium', label: '다소 높음', color: '#E0912F' },
  high: { severity: 'high', label: '높음', color: '#E25555' },
} as const;

export type RiskGrade = (typeof RISK_GRADE)[keyof typeof RISK_GRADE];

/**
 * 지표 하나의 등급을 `findings[]` 에서 찾는다.
 *
 * **걸리지 않은 지표는 `양호` 다.** `findings[]` 에는 걸린 항목만 담기므로 배열에
 * 없다는 것이 곧 규칙 엔진이 짚지 않았다는 뜻이다.
 */
export function gradeOf(findings: AiFinding[], findingId: string): RiskGrade {
  const finding = findings.find((item) => item.id === findingId);
  return finding === undefined ? RISK_GRADE.none : RISK_GRADE[finding.severity];
}

/**
 * 지표 3개가 각각 어느 `findings[].id` 를 등급으로 받는지 (`ai/diagnosis.ts`
 * `AI_FINDING_IDS`). 나머지 셋(`correlation`·`liquidity`·`macro_exposure`)은
 * 대응하는 KPI 가 없어 진단 시트에서만 나온다.
 */
export const METRIC_FINDING_ID = {
  concentration: 'ticker_concentration',
  sectorConcentration: 'sector_concentration',
  volatility: 'volatility',
} as const;
