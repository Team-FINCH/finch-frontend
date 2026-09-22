import { useState } from 'react';

import { type AiFinding } from '@/shared/types/ai/diagnosis';
import { type AiSection, type AiSegment } from '@/shared/types/ai/envelope';
import { AiCard } from '@/shared/ui/AiCard';
import { BottomSheet } from '@/shared/ui/BottomSheet';

/**
 * FINCH 진단 카드 (FINCH-325).
 *
 * ## 문장 속 숫자를 밖으로 꺼낸다
 *
 * 전에는 회색 박스 안에 2~3문장이 통째로 들어가 보고서처럼 읽혔다. 핵심 수치가
 * 문장 가운데 묻혀 있어 훑어볼 수가 없었다.
 *
 * **그 수치는 이미 구조화돼 온다.** `summary.segments` 의 `type: 'metric'` 조각이
 * `{value: "62.4%", raw: 0.624, unit: "ratio"}` 로 실린다(AI 명세 §2.1 · contracts
 * C55). 그 조각을 앞 두 개만 골라 카드 상단에 큰 숫자로 세우고, 문장은 그 아래
 * 짧게 둔다.
 *
 * **`findings[].evidence` 를 읽지 않는다.** 같은 62.4% 가 거기에도 있지만 그 필드는
 * 스키마를 굳히지 않은 자유 형식이고(`z.looseObject({})`) "디버깅·평가용이라 화면이
 * 읽지 않는다" 고 `ai/diagnosis.ts` 가 못박아 뒀다. `segments` 는 정식 계약이다.
 *
 * ## 라벨은 어디서 오나
 *
 * `metric` 조각에는 라벨이 없다. **바로 앞 `text` 조각의 끝부분을 라벨로 쓴다** —
 * 조각을 이어 붙이면 원문과 정확히 일치하므로(C55) `metric` 앞의 텍스트가 곧 그
 * 숫자를 설명하는 말이다(`반도체 섹터 비중이 ` → `62.4%`). 조사·공백을 털어내는
 * 것 말고 프론트가 말을 새로 만들지 않는다.
 *
 * 앞 텍스트가 없거나 비면 그 조각은 건너뛴다. 라벨 없는 큰 숫자는 읽는 사람에게
 * 아무 말도 하지 않는다.
 *
 * ## 못 믿을 라벨은 버린다
 *
 * 이 방식은 **원문이 지표명으로 시작할 때만 맞는다.** 목 데이터가 그 한계를 그대로
 * 보여준다.
 *
 * ```
 * "반도체 두 종목이 전체의 " + 62.4%   → 라벨 "반도체 두 종목이 전체"  ✗ 문장의 주어
 * "…높아요. 최근 1년 최대 낙폭은 " + -22.14% → 라벨 "최근 1년 최대 낙폭"  ✓ 지표명
 * ```
 *
 * 둘 다 4단어라 단어 수로는 갈릴 수 없고 글자 수는 13 대 11 이다. 그 경계 하나에
 * 기대는 것이 얄팍해서 **조건을 둘 겹친다.**
 *
 * 1. 라벨이 `MAX_LABEL_LENGTH` 를 넘으면 버린다
 * 2. 서술의 **첫 조각**에서 나온 라벨은, 그 조각 안에 문장 경계(`.`)가 있을 때만
 *    받는다 — 경계가 없으면 그 문장의 **주어**를 라벨로 쓰는 셈이다
 *
 * 걸러진 수치는 사라지지 않는다. 아래 본문 문장에 그대로 있다. 큰 숫자로 세우지만
 * 않는 것이고, **하나도 못 믿으면 앵커 줄 자체가 없어진다** — 잘린 문장 조각이
 * 라벨 자리에 앉아 있는 것보다 낫다.
 *
 * TODO(계약): `segments[].label` 을 요청해 뒀다 —
 * `_inbox/요청-ai-진단-점수근거.md`. 서버가 지표명을 주면 이 추론이 전부 사라지고
 * 걸러 버린 수치도 앵커로 세울 수 있다.
 *
 * ## 진단 자세히 보기
 *
 * 요약 전문과 **`findings` 전체**가 시트에 있다. 시트가 필요한 이유가 findings 다 —
 * `id` 6종 중 `correlation`·`liquidity`·`macro_exposure` 는 대응하는 시각화가 없어서,
 * `확인된 사항` 섹션을 없앨 때 이 시트가 없으면 화면에서 사라진다.
 *
 * ## 다시 `AiCard` 다 (2026-09-22)
 *
 * 이 카드가 화면에서 **유일하게 AI 가 쓴 내용**이라 표시가 필요하다. 한동안은 흰
 * `Card` 에 `AiGlyph` 만 얹어 그 표시를 했는데, 같은 앱 안에서 AI 박스가 두 모양
 * (홈·주문·종목 상세는 차콜 면, 여기만 흰 면)으로 갈려서 **면색이 AI 표식 노릇을
 * 하지 못했다.** QA 피드백으로 AI 면을 하나로 모으며 이 카드도 셸로 돌아왔다.
 *
 * **검정을 걷어냈던 이유는 사라지지 않았다.** 아래가 그때 적힌 것이다 — "흰 배경 위
 * 검정 덩어리는 어떤 위계를 주더라도 가장 먼저 눈에 들어와서, 사용자가 자기 수익률보다
 * AI 문장을 먼저 읽었다". 그래서 두 가지를 지킨다.
 *
 * 1. **자리를 되돌리지 않는다.** 이 카드는 탭 맨 아래 그대로다. 실제로 그 문제를
 *    푼 것은 면색이 아니라 순서였다
 * 2. **면이 한 단계 밝아졌다** — `--color-ai-surface` 가 `#24272C` 에서 `#343A42` 로
 *    올라가 순검정만큼 덩어리지지 않는다 (`styles/index.css` 주석)
 *
 * 제목은 `labelAs="h2"` 로 살린다. 같은 탭의 형제 섹션들이 `h2` 라 이 카드만 제목이
 * 없으면 훑어 읽는 순서에서 빠진다. 아이콘을 새로 만들지 않는 것은 그대로다 —
 * `design.md` §3 "화면마다 다른 AI 아이콘을 임의로 혼용하지 않는다" · §8.4 "AI Glyph
 * 위치/크기 통일" 이고, 셸이 그 글리프를 직접 단다.
 *
 * **피드백을 붙이지 않는다.** 프로토타입 실제 UI 에서 피드백이 붙는 자리는 셋뿐이고
 * 이 탭은 그중 하나가 아니다(`ia.md` §4 각주).
 */

const SEVERITY_LABEL = { high: '높음', medium: '보통', info: '참고' } as const;

/** 카드에 세우는 metric 개수. 셋 이상은 모바일 폭에서 줄이 무너진다. */
const ANCHOR_LIMIT = 2;

/**
 * 라벨로 받아 줄 최대 글자 수. 지표명은 이 안에 들어오고(`최근 1년 최대 낙폭` 11자)
 * 문장의 주어절은 넘는다(`반도체 두 종목이 전체` 13자). **경계가 좁다는 것을 알고
 * 쓰는 값이라** 위 주석의 두 번째 조건을 함께 둔다.
 */
const MAX_LABEL_LENGTH = 12;

type FinchInsightCardProps = {
  /** 문장 생성이 막히면 `null` 이고 지표는 그대로 나간다 */
  summary: AiSection | null;
  findings: AiFinding[];
};

export function FinchInsightCard({ summary, findings }: FinchInsightCardProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  const anchors = pickMetricAnchors(summary?.segments ?? []);
  const hasDetail = summary !== null || findings.length > 0;

  return (
    <AiCard label="FINCH 진단" labelAs="h2" className="mt-8">
      {anchors.length > 0 && (
        <dl className="mt-4 flex gap-8">
          {anchors.map((anchor) => (
            <div
              key={anchor.value}
              className="flex min-w-0 flex-col-reverse gap-0.5"
            >
              <dt className="truncate text-caption text-ai-text-muted">
                {anchor.label}
              </dt>
              <dd className="text-title-3 font-bold text-ai-text-primary tabular-nums">
                {anchor.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <p className="mt-4 text-body-2 text-pretty text-ai-text-secondary">
        {summary?.text ?? '진단 결과를 준비하지 못했어요.'}
      </p>

      {hasDetail && (
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          className="mt-4 text-body-2 font-medium text-ai-text-secondary"
        >
          진단 자세히 보기 ›
        </button>
      )}

      {hasDetail && (
        <BottomSheet
          open={detailOpen}
          onOpenChange={setDetailOpen}
          title="FINCH 진단"
        >
          {summary !== null && (
            <p className="text-body-1 text-pretty text-text-primary">
              {summary.text}
            </p>
          )}

          {findings.length > 0 && (
            <div className="mt-6 flex flex-col divide-y divide-border">
              {findings.map((finding) => (
                <div key={finding.id} className="py-3.5 first:pt-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 flex-none items-center rounded-xs bg-surface-soft px-1.5 text-caption font-medium text-text-secondary">
                      {SEVERITY_LABEL[finding.severity]}
                    </span>
                    <span className="min-w-0 text-body-1 font-semibold text-text-primary">
                      {finding.title}
                    </span>
                  </div>
                  {finding.text !== null && (
                    <p className="mt-1.5 text-body-2 text-pretty text-text-secondary">
                      {finding.text}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="mt-6 text-caption text-pretty text-text-muted">
            등급과 점수는 정해진 계산 규칙으로 나오고, FINCH는 그 이유만
            설명해요.
          </p>
        </BottomSheet>
      )}
    </AiCard>
  );
}

type MetricAnchor = { label: string; value: string };

/**
 * `segments` 에서 앞선 `metric` 조각 둘을 라벨과 함께 뽑는다.
 *
 * 라벨은 **바로 앞 `text` 조각의 마지막 절**이다. 문장을 마침표로 끊고 마지막
 * 토막을 쓴 뒤 꼬리 조사를 떼어낸다 — `반도체 섹터 비중이 ` → `반도체 섹터 비중`.
 * `raw` 를 다시 포맷하지 않고 서버가 준 `value` 문자열을 그대로 쓴다. 반올림
 * 자릿수를 프론트가 새로 정하면 문장 안의 같은 숫자와 어긋난다.
 */
function pickMetricAnchors(segments: readonly AiSegment[]): MetricAnchor[] {
  const anchors: MetricAnchor[] = [];

  for (const [index, segment] of segments.entries()) {
    if (anchors.length >= ANCHOR_LIMIT) {
      break;
    }
    if (segment.type !== 'metric' || segment.value === '') {
      continue;
    }

    const label = labelFromPrecedingText(segments[index - 1], index - 1 === 0);
    if (label === null) {
      continue;
    }
    anchors.push({ label, value: segment.value });
  }

  return anchors;
}

/**
 * 앞 조각에서 라벨을 뽑는다. 쓸 수 없으면 `null` 이고, 그러면 그 수치는 큰 숫자로
 * 세우지 않고 본문 문장에만 남는다 — 판정 근거는 위 파일 머리 주석 "못 믿을 라벨은
 * 버린다" 에 있다.
 *
 * `isNarrativeStart` 는 이 조각이 서술의 첫 조각인지다.
 */
function labelFromPrecedingText(
  segment: AiSegment | undefined,
  isNarrativeStart: boolean,
): string | null {
  if (segment === undefined || segment.type !== 'text') {
    return null;
  }

  const clauses = segment.value.split(/[.!?]\s*|\n/);

  // 서술의 첫 조각에 문장 경계가 없으면, 잘라 낸 절이 곧 그 문장의 주어다.
  if (isNarrativeStart && clauses.length <= 1) {
    return null;
  }

  const lastClause = clauses.at(-1)?.trim();
  if (lastClause === undefined || lastClause === '') {
    return null;
  }

  // 조사로 끝나는 절이 대부분이다 (`비중이 `·`낙폭은 `). 조사만 떼고 말은 그대로 둔다.
  const trimmed = lastClause.replace(/(이|가|은|는|을|를|의|도|와|과)$/u, '');
  if (trimmed === '' || trimmed.length > MAX_LABEL_LENGTH) {
    return null;
  }
  return trimmed;
}
