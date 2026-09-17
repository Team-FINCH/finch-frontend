import { type AiFinding } from '@/shared/types/ai/diagnosis';

/**
 * `확인된 사항` — 규칙 엔진이 임계값에 걸어 둔 항목 (FINCH-325).
 *
 * ## 지표 목록이 여기서 빠졌다
 *
 * 전에는 이 아래에 `위험 지표` 6행 + 금리 민감도가 펼쳐져 있었다. 문제는 길이가
 * 아니라 **같은 사실이 세 번 나오는 것**이었다 — 상위 종목 비중 43%가 AI 문장 ·
 * `포트폴리오 상태` 집중도 줄 · `1위 종목 비중` 에 각각 다른 말투와 다른
 * 반올림(43.2% / 43% / 43%)으로 적혔다.
 *
 * **지우지 않고 옮겼다.** 지표는 `RiskScoreBasisSheet` 가 점수 기준과 함께 보여준다 —
 * 그게 제자리다. 지표 여섯 중 `top1Weight`·`top3Weight`·`maxDrawdown1y` 는 점수에
 * 들어가지 않고 `hhi`·`diversificationRatio` 는 들어가는데, 그 구분을 말해 줄 수 있는
 * 자리가 점수 옆뿐이다. 여기 두면 목록이 그냥 숫자 나열로 남는다.
 *
 * ## `findings[]` 순서를 건드리지 않는다
 *
 * 배열 정렬 순서가 곧 중요도 순위다(`ai/diagnosis.ts`). 프론트가 `severity` 로
 * 다시 정렬하면 엔진이 같은 심각도 안에서 매긴 순서를 잃는다.
 *
 * `findings[].text` 는 **AI 가 쓴 문장이다.** 제목·심각도는 엔진 판정이고 그 둘이
 * 한 행에 같이 있다 — 이 탭에서 두 출처가 섞이는 유일한 자리다.
 */

const SEVERITY_LABEL = { high: '높음', medium: '보통', info: '참고' } as const;

type DiagnosisFindingSectionProps = {
  findings: AiFinding[];
};

export function DiagnosisFindingSection({
  findings,
}: DiagnosisFindingSectionProps) {
  return (
    <section className="mt-12">
      <h2 className="mb-3.5 text-section-title text-text-primary">
        확인된 사항
      </h2>

      {findings.length === 0 ? (
        <p className="py-3.5 text-body-1 text-text-secondary">
          특별히 짚어드릴 사항이 없어요.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {findings.map((finding) => (
            <div key={finding.id} className="py-3.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-5 flex-none items-center rounded-xs bg-surface-soft px-1.5 text-caption font-medium text-text-secondary">
                  {SEVERITY_LABEL[finding.severity]}
                </span>
                <span className="text-body-1 font-semibold text-text-primary">
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
    </section>
  );
}
