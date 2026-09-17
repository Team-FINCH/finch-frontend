import { useState } from 'react';

import { type AiFinding } from '@/shared/types/ai/diagnosis';
import { type AiSection, type AiSegment } from '@/shared/types/ai/envelope';
import { AiGlyph } from '@/shared/ui/AiCard';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Card } from '@/shared/ui/Card';

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
 * ## 진단 자세히 보기
 *
 * 요약 전문과 **`findings` 전체**가 시트에 있다. 시트가 필요한 이유가 findings 다 —
 * `id` 6종 중 `correlation`·`liquidity`·`macro_exposure` 는 대응하는 시각화가 없어서,
 * `확인된 사항` 섹션을 없앨 때 이 시트가 없으면 화면에서 사라진다.
 *
 * ## 제목 앞에 AI 글리프를 둔다
 *
 * 이 카드가 화면에서 **유일하게 AI 가 쓴 내용**이라 표시가 필요하다. 검정 `AiCard`
 * 를 걷어내면서 그 셸이 달고 있던 글리프도 함께 사라졌고, 흰 카드 셋 중 어느 것이
 * AI 인지 제목 글자만으로는 드러나지 않았다.
 *
 * `AiCard` 가 export 하는 `AiGlyph` 를 그대로 쓴다. `design.md` §3 이 "화면마다 다른
 * AI 아이콘을 임의로 혼용하지 않는다", §8.4 가 "AI Glyph 위치/크기 통일" 이라고
 * 못박아서 이 카드용 아이콘을 새로 만들지 않는다. 브랜드 심볼을 마스크로 깔고
 * `currentColor` 로 칠하는 방식이라 흰 면에서도 그대로 보인다.
 *
 * **빈 상태 캐릭터(`.est>img`)를 쓰지 않는다.** 그쪽은 폭 120px·불투명도 0.16 으로
 * 깔리는 삽화라 제목 옆 아이콘 자리가 아니다.
 *
 * **피드백을 붙이지 않는다.** 프로토타입 실제 UI 에서 피드백이 붙는 자리는 셋뿐이고
 * 이 탭은 그중 하나가 아니다(`ia.md` §4 각주).
 */

const SEVERITY_LABEL = { high: '높음', medium: '보통', info: '참고' } as const;

/** 카드에 세우는 metric 개수. 셋 이상은 모바일 폭에서 줄이 무너진다. */
const ANCHOR_LIMIT = 2;

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
    <Card className="mt-8">
      <h2 className="flex items-center gap-1.75 text-section-title text-text-primary">
        <AiGlyph />
        FINCH 진단
      </h2>

      {anchors.length > 0 && (
        <dl className="mt-4 flex gap-8">
          {anchors.map((anchor) => (
            <div
              key={anchor.value}
              className="flex min-w-0 flex-col-reverse gap-0.5"
            >
              <dt className="truncate text-caption text-text-muted">
                {anchor.label}
              </dt>
              <dd className="text-title-3 font-bold text-text-primary tabular-nums">
                {anchor.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <p className="mt-4 text-body-2 text-pretty text-text-secondary">
        {summary?.text ?? '진단 결과를 준비하지 못했어요.'}
      </p>

      {hasDetail && (
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          className="mt-4 text-body-2 font-medium text-text-secondary"
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
    </Card>
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

    const label = labelFromPrecedingText(segments[index - 1]);
    if (label === null) {
      continue;
    }
    anchors.push({ label, value: segment.value });
  }

  return anchors;
}

/** 앞 조각이 `text` 가 아니거나 쓸 말이 남지 않으면 `null` 이다. */
function labelFromPrecedingText(segment: AiSegment | undefined): string | null {
  if (segment === undefined || segment.type !== 'text') {
    return null;
  }

  const lastClause = segment.value
    .split(/[.!?]\s*|\n/)
    .at(-1)
    ?.trim();
  if (lastClause === undefined || lastClause === '') {
    return null;
  }

  // 조사로 끝나는 절이 대부분이다 (`비중이 `·`낙폭은 `). 조사만 떼고 말은 그대로 둔다.
  const trimmed = lastClause.replace(/(이|가|은|는|을|를|의|도|와|과)$/u, '');
  return trimmed === '' ? null : trimmed;
}
