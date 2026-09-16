import { formatKrw, formatPercent } from '@/shared/lib/formatNumber';
import {
  type AiOrderPreviewContent,
  type AiOrderPreviewDelta,
  type AiOrderPreviewIndicators,
  type AiOrderPreviewWarning,
} from '@/shared/types/ai/orderPreview';

/**
 * 주문 전후로 보여줄 지표를 고른다 (ia.md §4 "4번 슬롯 — 주문 전 점검은 세 덩어리다").
 *
 * **열두 지표를 전부 노출하지 않는다.** ia.md 가 "`warnings[].metric` 이 지목한 것과
 * `delta` 가 큰 것만 고른다" 로 정했다. 기획서 §디자인 컨셉의 "글자 크고 명확하게,
 * 작은 보조정보 최소화" 가 모바일에서 짧게 보는 화면이라는 조건에서 온 요구다.
 *
 * **비율(0~1 소수)인 지표만 다룬다.** `beta`·`diversificationRatio` 는 비율이 아니라
 * 배수이고(`shared/types/ai/diagnosis.ts`) `rateSensitivity` 는 문자열이다. 한 줄짜리
 * 포매터로 섞어 그리면 배수 1.14 가 114% 로 나온다. 셋은 이 목록에 넣지 않는다.
 */
type RatioIndicatorKey =
  | 'hhi'
  | 'top1Weight'
  | 'top3Weight'
  | 'sectorHhi'
  | 'annualizedVolatility'
  | 'maxDrawdown1y'
  | 'cashRatio'
  | 'largeCapWeight'
  | 'topSectorWeight';

/**
 * 지표 이름.
 *
 * 여섯 개는 `DiagnosisTab`(AI 슬롯 5번)이 쓰는 이름을 그대로 옮겼다 — 같은 지표가
 * 화면마다 다른 이름으로 나오면 같은 값인지 알 수 없다. 나머지 셋(`hhi`·
 * `largeCapWeight`·`topSectorWeight`)은 그 화면에 없어서 같은 말투로 이어 붙였다.
 */
const INDICATOR_LABEL: Record<RatioIndicatorKey, string> = {
  hhi: '종목 집중도(HHI)',
  top1Weight: '1위 종목 비중',
  top3Weight: '상위 3종목 비중',
  sectorHhi: '섹터 집중도(HHI)',
  annualizedVolatility: '연환산 변동성',
  maxDrawdown1y: '최근 1년 최대 낙폭',
  cashRatio: '현금 비중',
  largeCapWeight: '대형주 비중',
  topSectorWeight: '1위 업종 비중',
};

/**
 * `warnings[].metric` 은 AI 원본 그대로 `snake_case` 다 (AI 명세 §7 예시 `top_sector_weight`).
 * 재포장은 `content` 안쪽 **키 이름**만 바꾸므로 값으로 실린 이 문자열은 변환되지 않는다.
 * 규칙으로 변환하지 않고 표로 잇는다 — `top1_weight`·`max_drawdown_1y` 처럼 숫자가 섞인
 * 이름은 변환 규칙만으로 정해지지 않는다(contracts T2).
 */
const METRIC_TO_INDICATOR_KEY: Record<string, RatioIndicatorKey> = {
  hhi: 'hhi',
  top1_weight: 'top1Weight',
  top3_weight: 'top3Weight',
  sector_hhi: 'sectorHhi',
  annualized_volatility: 'annualizedVolatility',
  max_drawdown_1y: 'maxDrawdown1y',
  cash_ratio: 'cashRatio',
  large_cap_weight: 'largeCapWeight',
  top_sector_weight: 'topSectorWeight',
};

/**
 * 한 줄에 보여줄 최대 개수. 프로토타입의 점검 카드가 두 줄(`예수금`·`포트폴리오 비중`)이고
 * design.md §7.7 도 구성에 지표 묶음을 하나로 적었다. 경고가 지목한 지표까지 들어올
 * 자리를 한 줄 남겨 셋으로 둔다.
 */
const MAX_INDICATOR_ROWS = 3;

/** `severity` 순 (ia.md §4). 열거값은 `info`·`medium`·`high` 다. */
const SEVERITY_RANK = { high: 3, medium: 2, info: 1 } as const;

export type OrderPreviewIndicatorRow = {
  key: RatioIndicatorKey;
  label: string;
  before: string;
  after: string;
  /**
   * 값이 그대로다. design.md §7.7 이 "`17% → 17%` 처럼 동일값 반복 금지" 로 적었고
   * 변화 없음은 `17% · 큰 변화 없음` 으로 말한다.
   */
  unchanged: boolean;
};

/**
 * 경고가 지목한 지표를 `severity` 내림차순으로 세운 뒤, `delta` 절댓값이 큰 것으로 채운다.
 *
 * `before`·`after` 한쪽이라도 `null` 인 지표는 빼놓는다 — 전후 비교가 이 줄의 전부라
 * 한쪽이 없으면 보여줄 것이 없다. 계산되지 않은 지표는 0 이 아니라 `null` 로 온다.
 */
export function selectOrderPreviewIndicatorRows(
  content: Pick<
    AiOrderPreviewContent,
    'before' | 'after' | 'delta' | 'warnings'
  >,
): OrderPreviewIndicatorRow[] {
  const { before, after, delta, warnings } = content;

  const fromWarnings = sortOrderPreviewWarnings(warnings)
    .map((warning) => METRIC_TO_INDICATOR_KEY[warning.metric])
    .filter((key): key is RatioIndicatorKey => key !== undefined);

  const byDelta = (Object.keys(INDICATOR_LABEL) as RatioIndicatorKey[]).sort(
    (a, b) => absDelta(delta, b) - absDelta(delta, a),
  );

  const ordered = [...fromWarnings, ...byDelta];
  const rows: OrderPreviewIndicatorRow[] = [];

  for (const key of ordered) {
    if (rows.length >= MAX_INDICATOR_ROWS) {
      break;
    }
    if (rows.some((row) => row.key === key)) {
      continue;
    }
    const row = toRow(key, before, after);
    if (row !== null) {
      rows.push(row);
    }
  }

  return rows;
}

/**
 * 경고를 `severity` 내림차순으롤 세운다 (ia.md §4 "주요 리스크 → `warnings[]`, `severity` 순").
 *
 * 원본 배열을 건도록지 않고 복사한 뒤 정렬한다. **개수를 자르지 않는다** —
 * 포함된 것은 이 주문 때문에 새로 걸렸거나 등급이 올라간 항목만이고(AI 명세 §7),
 * 그 중 `high` 하나를 가리면 돈이 움직이는 경고가 안 보인다. 펼쳐놓고
 * 세를 세우는 것까지가 이 함수이 몫이다. 프로토타입의 `slice(0,2)` 는
 * 데모 데이터가 끝없은 것을 자른 것이고 계약의 `warnings` 는 걸린 것만 온다.
 */
export function sortOrderPreviewWarnings(
  warnings: readonly AiOrderPreviewWarning[],
): AiOrderPreviewWarning[] {
  return [...warnings].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
  );
}

/**
 * 헤드라인 (ia.md §4, GitLab #93). 서버가 만들던 프리셋 문장 대신 화면이 세 값으로
 * 만든다 — 같은 수치를 두 곳에서 표현하면 문구 정책이 갈린다.
 *
 * 우선순위는 예수금 부족 → 경고 → 안전이다. 예수금이 부족하면 그 사실이 가장 급하고
 * (카드 아래 별도 블록으로 한 번 더 나온다), 경고가 있으면 몇 개인지만 말한다 —
 * 개별 문장은 `sortedWarnings` 목록이 따로 보여준다.
 */
export function selectOrderPreviewHeadline(
  content: Pick<AiOrderPreviewContent, 'feasible' | 'shortfall' | 'warnings'>,
): string {
  const { feasible, shortfall, warnings } = content;

  if (!feasible && shortfall !== null) {
    return `현금이 ${formatKrw(shortfall)} 부족해요`;
  }
  if (warnings.length > 0) {
    return `${warnings.length}개 지표가 기준을 넘었어요`;
  }
  return '새로 높아진 위험은 없어요';
}

/**
 * 경고 한 줄 (GitLab #93). 서버가 만들던 `text` 대신 `title`·`before`·`after`·
 * `threshold` 로 화면이 만든다.
 *
 * 셋 다 `Ratio`(0~1 소수) 다 — 방향이 아니라 크기(집중도·비중)를 말하는 값이라
 * `formatPercent` 를 쓴다. `formatSignedPercent`·`formatSignedRate` 와 섞으면
 * 100 배로 나오거나 부호가 잘못 붙는다(contracts C18, `shared/lib/formatNumber.ts`).
 *
 * `before` 가 `null` 이면 이 주문에서 처음 걸린 항목이다(AI 명세 §7) — 화살표 없이
 * `after` 만 말한다.
 */
export function formatOrderPreviewWarningLine(
  warning: Pick<
    AiOrderPreviewWarning,
    'title' | 'before' | 'after' | 'threshold'
  >,
): string {
  const after = formatPercent(warning.after);
  const threshold = formatPercent(warning.threshold);

  if (warning.before === null) {
    return `${warning.title} ${after} (기준 ${threshold})`;
  }

  const before = formatPercent(warning.before);
  return `${warning.title} ${before} → ${after} (기준 ${threshold})`;
}

function absDelta(delta: AiOrderPreviewDelta, key: RatioIndicatorKey): number {
  const value = delta[key];
  return value === undefined || value === null ? 0 : Math.abs(value);
}

function toRow(
  key: RatioIndicatorKey,
  before: AiOrderPreviewIndicators,
  after: AiOrderPreviewIndicators,
): OrderPreviewIndicatorRow | null {
  const beforeValue = before[key];
  const afterValue = after[key];

  if (beforeValue === null || afterValue === null) {
    return null;
  }

  const beforeText = formatPercent(beforeValue);
  const afterText = formatPercent(afterValue);

  return {
    key,
    label: INDICATOR_LABEL[key],
    before: beforeText,
    after: afterText,
    // 보이는 문자열로 비교한다. 소수점 아래에서만 갈리는 차이는 화면에 같은 값으로
    // 나오므로, 원시 값으로 판정하면 `17% → 17%` 가 그대로 나간다.
    unchanged: beforeText === afterText,
  };
}
