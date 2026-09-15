import type {
  AiBriefingEventType,
  AiBriefingItem,
} from '@/shared/types/ai/briefing';

/**
 * `eventType` → 한글 라벨 (AI 명세 §8 매핑, GitLab `#68` 회신).
 * `AI_BRIEFING_EVENT_TYPES` 의 값만 키로 둔다 — 모르는 값은 여기 없으므로
 * 아래 두 함수 모두 자연히 그 값을 무시한다.
 */
const BRIEFING_EVENT_LABELS: Record<AiBriefingEventType, string> = {
  macro: '정책',
  filing: '공시',
  earnings: '실적',
  dividend: '배당',
  product: '신제품',
};

/** 제목 아래 줄(`BRIEF_MIX`)에 나열하는 순서. AI 명세 §8 매핑 표의 순서다. */
const EVENT_TYPE_ORDER: readonly AiBriefingEventType[] = [
  'macro',
  'filing',
  'earnings',
  'dividend',
  'product',
];

function isKnownEventType(
  eventType: string | null | undefined,
): eventType is AiBriefingEventType {
  return eventType != null && Object.hasOwn(BRIEFING_EVENT_LABELS, eventType);
}

/**
 * 제목 아래 보조 한 줄 `정책 n · 공시 n · 실적 n` (프로토타입 `briefMix`).
 *
 * `eventType` 별로 세어 0 건인 종류는 뺀다. 하나도 없으면(전부 `null` 이거나
 * 모르는 값이면) `undefined` 를 돌려준다 — 호출부가 그 값이면 줄 자체를
 * 그리지 않는다.
 */
export function countBriefingEventTypes(
  items: readonly AiBriefingItem[],
): string | undefined {
  const counts = new Map<AiBriefingEventType, number>();

  for (const item of items) {
    if (!isKnownEventType(item.eventType)) {
      continue;
    }
    counts.set(item.eventType, (counts.get(item.eventType) ?? 0) + 1);
  }

  const parts = EVENT_TYPE_ORDER.filter((type) => counts.has(type)).map(
    (type) => `${BRIEFING_EVENT_LABELS[type]} ${counts.get(type)}`,
  );

  return parts.length === 0 ? undefined : parts.join(' · ');
}

/**
 * 명세엔 없지만 빈 문자열·공백만 있는 `publisher` 를 "없음" 으로 취급한다 —
 * 걸러내지 않으면 `label ?? publisher` 가 `''` 를 그대로 돌려주고, 호출부는
 * `=== undefined` 로만 없음을 판정하므로(`useBriefingStockFacts.ts:63`) 본문
 * 아래에 가운뎃점 없는 빈 줄만 남는다.
 */
function normalizePublisher(
  publisher: string | null | undefined,
): string | undefined {
  const trimmed = publisher?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * 본문 아래 보조 한 줄 `{종류} · {출처}` (프로토타입 `briefTop.meta`).
 *
 * 한쪽만 있으면 그 쪽만 보여주고, 둘 다 없으면 `undefined` 를 돌려준다 —
 * 가운뎃점만 남는 자리를 만들지 않는다(`BriefingSection.tsx:162` 가 같은
 * 함정을 적어 뒀다).
 */
export function briefingItemMeta(
  eventType: string | null | undefined,
  publisher: string | null | undefined,
): string | undefined {
  const label = isKnownEventType(eventType)
    ? BRIEFING_EVENT_LABELS[eventType]
    : undefined;
  const normalizedPublisher = normalizePublisher(publisher);

  if (label !== undefined && normalizedPublisher !== undefined) {
    return `${label} · ${normalizedPublisher}`;
  }
  return label ?? normalizedPublisher;
}
