import { type AiFinding, type AiIndicators } from '@/shared/types/ai/diagnosis';
import { type AiSegment } from '@/shared/types/ai/envelope';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';

import { RISK_GRADE } from '../lib/riskGrade';

/**
 * `FINCH 진단` 모달 — AI 진단 카드의 `진단 자세히 보기` 가 여는 자리
 * (FINCH-341).
 *
 * ## 읽는 순서가 이 파일의 내용이다
 *
 * ```
 * FINCH 진단                 ← 28/700 (--text-title-1)
 * N가지 주의 신호가 …         ← 16/1.5 한 줄 요약. 개수는 findings.length
 * ─────────────────────────
 * 최근 1년 최대 낙폭 │ 현금 비중  ← 라벨 13 / 값 22/700
 * ─────────────────────────
 * 종목 집중도가 높아요  [높음]  ← 18/700 + 상태 뱃지
 * 가장 비중이 큰 종목 하나가 41.68%예요.   ← 15, 수치만 700
 * ─────────────────────────
 * 섹터 집중도가 …      [주의]
 * …
 *
 * ⓘ 진단 결과는 정해진 계산 기준으로 …   ← 13 muted
 * [ 닫기 ]
 * ```
 *
 * 전에는 이 안이 **AI 요약 문장 한 덩이 + 항목 목록 + 면책 단락**이었고 셋이 거의
 * 같은 굵기·크기라 무엇을 먼저 읽을지 표시가 없었다. 위계를 28 → 22 → 18 → 15 의
 * 네 단으로 세우고, 굵기는 700(제목·수치) / 600(뱃지) / 400~500(본문) 셋만 쓴다.
 *
 * ## 값을 새로 계산하지 않는다
 *
 * 화면에 나가는 숫자는 전부 응답에 실려 온 것 그대로다 — `indicators` 의 필드이거나
 * `findings[].segments` 의 조각이다. **프론트가 AI 문장을 다시 쓰지 않는다**
 * (`ia.md` §4). 문장은 그대로 두고 그 안의 `metric` 조각만 굵게 칠한다.
 *
 * ## 핵심 수치 두 칸에 무엇을 놓을 수 있나
 *
 * **`indicators.top1Weight` 를 여기 쓰지 않는다.** 그 값(0.4168 → 42%)은 아래
 * 종목 집중도 목록의 1위(원장 계산, 38%)와 다른 숫자다. 화면의 "최대 종목 비중"
 * 을 원장 계산 하나로 모은 것이 FINCH-334 이고, 엔진 값은 계산 기준 시트에만
 * 남기기로 했다(`lib/concentration.ts` 주석의 표). 여기에 큰 글씨로 42% 를 세우면
 * 그 결정을 정면으로 되돌린다.
 *
 * **섹터별 비중(`반도체 62.4%`)은 응답에 없다.** `indicators` 에 있는 것은
 * `sectorHhi`(허핀달 지수)와 `sectorCount`(업종 수)뿐이고 업종 이름과 그 비중을
 * 주는 필드가 없다. 그 숫자는 AI 문장 안에만 있어서, 뽑아 쓰려면 문장을 파싱해야
 * 한다 — `pickMetricAnchors` 가 정확히 그 방식이었고 라벨 자리에 `였고 그중 종목
 * 선택` 같은 토막이 앉아 FINCH-334 에서 걷어냈다.
 *
 * 그래서 남는 것은 **이 탭의 다른 숫자와 겹치지 않는 엔진 지표 둘**이다.
 *
 * | 칸 | 필드 | 왜 |
 * | --- | --- | --- |
 * | 최근 1년 최대 낙폭 | `maxDrawdown1y` | 이 탭 본문에 숫자로 없다(검정 카드의 보조 줄과 같은 값·같은 표기) |
 * | 현금 비중 | `cashRatio` | 이 탭 어디에도 없다. 진단 모달에서 새로 알게 되는 값이다 |
 *
 * 지표 3열이 이미 쓰는 `annualizedVolatility`·`sectorCount` 는 넣지 않았다 —
 * 같은 화면에서 같은 숫자를 두 번 크게 말하는 것이 이번에 고치는 문제다.
 *
 * 값이 `null` 인 칸은 접고, 둘 다 없으면 줄 자체가 빠진다. `—` 로 채우지 않는다 —
 * 없는 값이 0 에 가까운 값으로 읽힌다(`DiagnosisAiCard` 의 같은 규칙).
 *
 * ## 표기 규칙은 기존 것을 그대로 따른다
 *
 * - **낙폭은 소수 한 자리**다. 검정 카드의 보조 줄과 같은 식이라 두 자리에서 같은
 *   문자열이 나온다. 부호는 `−`(U+2212) — 하이픈보다 폭이 넓어 숫자와 높이가 맞는다
 * - **비중은 정수**다 (FINCH-334). 화면의 모든 비중이 정수라야 AI 문장 속
 *   `41.68%` 가 섞여 들어와도 그것이 우리가 쓴 값이 아님이 드러난다
 *
 * ## 뱃지 색
 *
 * 회색 하나였던 것을 `RISK_GRADE` 의 색으로 가른다. **새 색을 만들지 않았다** —
 * 그 표는 이미 종목 집중도 머리의 등급 글자가 쓰고 있고, 면색은 같은 색을
 * `color-mix` 로 흰 면에 12% 섞어 만든다(`DivergingBar` 와 같은 방식).
 *
 * `high` 는 `#E25555` 다. 12% 로 깔면 경고 배너가 아니라 아주 옅은 살구색 면이고,
 * 글자만 그 색이라 강도는 뱃지 한 칸에 머문다. `info`(참고)는 `RISK_GRADE` 에서
 * 중립이라 색이 붙지 않는다 — **셋 다 칠하면 셋 다 구분되지 않는다.**
 *
 * 색만으로 상태를 말하지 않는다. 라벨 글자가 그대로 남는다(`design.md` §12).
 */

/** `findings[]` 에 실제로 실려 오는 값 셋. `none`(걸린 항목 없음)은 여기 오지 않는다. */
const SEVERITY_LABEL: Record<AiFinding['severity'], string> = {
  info: '참고',
  medium: '주의',
  high: '높음',
};

/** 뱃지 면색. 글자색과 같은 색을 흰 면에 이 비율로 섞는다. */
const BADGE_SURFACE_MIX = '12%';

type DiagnosisDetailModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  findings: AiFinding[];
  indicators: AiIndicators;
};

export function DiagnosisDetailModal({
  open,
  onOpenChange,
  findings,
  indicators,
}: DiagnosisDetailModalProps) {
  const drawdown = indicators.maxDrawdown1y;
  const cashRatio = indicators.cashRatio;
  const hasMetrics = drawdown !== null || cashRatio !== null;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="FINCH 진단"
      titleClassName="text-title-1 text-text-primary"
    >
      {/* 한 줄 요약. **AI 문장이 아니라 우리가 개수를 세어 쓴 문장이다** — 그래서
          문구를 정할 수 있다. 전에는 이 자리에 AI 요약 전문이 들어가 있었는데,
          바로 아래 항목들이 같은 말을 한 번 더 해서 모달을 열자마자 같은 사실을
          두 번 읽게 됐다. */}
      <p className="mt-2 text-body-1 text-pretty break-keep text-text-secondary">
        {findings.length > 0
          ? `포트폴리오에서 ${findings.length}가지 주의 신호가 발견됐어요.`
          : '지금 눈에 띄는 주의 신호는 없어요.'}
      </p>

      {hasMetrics && (
        /* 핵심 수치. 칸을 카드로 만들지 않고 위아래 1px 선으로만 띠를 만든다 —
           모달 안에 상자가 늘면 위계가 아니라 상자가 리듬을 만든다(진단 탭
           전체가 같은 규칙이다, `DiagnosisTab` "면은 하나뿐이다"). */
        <dl className="mt-6 flex border-y border-border py-4">
          {drawdown !== null && (
            <Metric
              label="최근 1년 최대 낙폭"
              value={`−${Math.abs(drawdown * 100).toFixed(1)}%`}
            />
          )}
          {cashRatio !== null && (
            <Metric
              label="현금 비중"
              value={`${Math.round(cashRatio * 100)}%`}
              /* 두 칸일 때만 사이에 세로선이 선다. 한 칸이면 왼쪽 선이 허공에
                 그어진다. */
              divided={drawdown !== null}
            />
          )}
        </dl>
      )}

      {findings.length > 0 && (
        <ul className="mt-2">
          {findings.map((finding) => (
            <li
              key={finding.id}
              className="border-b border-border py-5 last:border-b-0 last:pb-0"
            >
              {/* 제목과 뱃지가 같은 줄이다. 전에는 뱃지가 제목 **앞**에 있어
                  제목이 뱃지 폭만큼 밀렸고, 항목마다 밀린 정도가 달라 제목들의
                  왼쪽 끝이 들쭉날쭉했다. */}
              <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 text-section-title text-pretty break-keep text-text-primary">
                  {finding.title}
                </h3>
                <SeverityBadge severity={finding.severity} />
              </div>

              {finding.text !== null && (
                <p className="mt-1.5 text-body-2 text-pretty break-keep text-text-secondary">
                  <MetricSentence
                    text={finding.text}
                    segments={finding.segments}
                  />
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* 안내. 본문보다 한 단 낮다 — 크기도 색도 내리고 위로 28px 띄워 본문과
          갈라 둔다. **문구를 줄이되 "FINCH 는 이유만 설명한다" 는 뺄 수 없다.**
          점수를 누가 냈는지에 대한 고지라 모달에서 사라지면 남는 자리가 없다. */}
      <p className="mt-7 flex items-start gap-1.5 text-caption text-pretty break-keep text-text-muted">
        <InfoGlyph />
        <span>
          진단 결과는 정해진 계산 기준으로 나오고, FINCH는 그 이유만 설명해요.
        </span>
      </p>

      <div className="mt-7">
        <Button onClick={() => onOpenChange(false)}>닫기</Button>
      </div>
    </Modal>
  );
}

/**
 * 핵심 수치 한 칸. `dt`/`dd` 라 라벨과 값의 관계가 마크업에 남는다.
 *
 * 값이 라벨보다 크고 굵다 — 이 모달에서 가장 먼저 보여야 하는 것이 숫자다.
 * 22px(`--text-title-2`)이라 28px 제목보다는 한 단 아래다. 제목과 같은 크기로
 * 올리면 위계가 다시 평평해진다.
 */
function Metric({
  label,
  value,
  divided = false,
}: {
  label: string;
  value: string;
  divided?: boolean;
}) {
  return (
    <div
      className={`min-w-0 flex-1 ${divided ? 'border-l border-border pl-4' : ''}`}
    >
      <dt className="truncate text-caption text-text-muted">{label}</dt>
      <dd className="mt-1 text-title-2 text-text-primary tabular-nums">
        {value}
      </dd>
    </div>
  );
}

/**
 * 상태 뱃지. 글자색은 `RISK_GRADE` 의 색이고 면색은 같은 색을 흰 면에 섞은 것이다.
 *
 * 높이 26px · 좌우 9px · 반경 8px. `flex-none` 이라 제목이 길어져도 뱃지가
 * 찌그러지지 않는다 — 줄어드는 쪽은 제목이다(`min-w-0`).
 */
function SeverityBadge({ severity }: { severity: AiFinding['severity'] }) {
  const grade = RISK_GRADE[severity];

  return (
    <span
      className="inline-flex h-6.5 flex-none items-center rounded-tag px-2.25 text-caption font-semibold"
      style={{
        color: grade.color,
        background: `color-mix(in srgb, ${grade.color} ${BADGE_SURFACE_MIX}, white)`,
      }}
    >
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

/**
 * 문장 한 덩이. **`metric` 조각만 굵게** 칠하고 나머지는 그대로 둔다.
 *
 * 검정 카드의 `AccentedSentence` 와 다른 점은 둘이다 — 여기는 흰 면이라 금색
 * (`--ai-accent`)을 쓸 수 없고(`design.md` "Dark Surface 안에서만"), 첫 조각
 * 하나가 아니라 **수치 조각 전부**를 굵게 한다. 저쪽은 카드에 강조가 하나여야
 * 하는 자리고, 이쪽은 "문장에 묻힌 숫자를 꺼내는" 것이 목적이다.
 *
 * 색을 바꾸지 않고 굵기만 올린다. 흰 면에서 숫자에 색을 주면 등락색(적·청)과
 * 겹쳐 오르내림으로 읽힌다(`frontConvention` §11).
 *
 * `segments` 가 `null` 이거나 비었으면 `text` 를 그대로 그린다 — 이어 붙이면
 * `text` 와 일치한다는 보장(C55)의 반대 방향 폴백이다.
 */
function MetricSentence({
  text,
  segments,
}: {
  text: string;
  segments: AiSegment[] | null;
}) {
  if (segments === null || segments.length === 0) {
    return <>{text}</>;
  }

  return (
    <>
      {segments.map((segment, index) =>
        segment.type === 'metric' ? (
          <span
            key={index}
            className="font-bold text-text-primary tabular-nums"
          >
            {segment.value}
          </span>
        ) : (
          <span key={index}>{segment.value}</span>
        ),
      )}
    </>
  );
}

/** 안내 줄 앞의 작은 ⓘ. 글자색을 물려받고 글줄 첫 줄에 맞춰 선다. */
function InfoGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="mt-0.5 size-3.5 flex-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
    >
      <circle cx="8" cy="8" r="6.4" />
      <path d="M8 7.2v4" strokeLinecap="round" />
      <path d="M8 4.9v.1" strokeLinecap="round" />
    </svg>
  );
}
