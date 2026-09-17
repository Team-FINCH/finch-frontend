import { useState } from 'react';

import {
  type AiIndicators,
  type AiRiskLevel,
} from '@/shared/types/ai/diagnosis';

import { RiskScoreBasisSheet } from './RiskScoreBasisSheet';

/**
 * AI 진단에서 가장 먼저 읽히는 자리 (FINCH-325).
 *
 * ## 이 값들은 원래 화면에 없었다
 *
 * `riskScore` 는 검정 `AiCard` 바닥 캡션(11px 흐린 회색)에 박혀 있었고 `riskLevel` 은
 * 응답에 오는데도 `DiagnosisTab` 이 구조분해에서 빼 **화면이 읽지 않았다.** 그래서
 * 사용자가 위험 등급을 보는 유일한 경로가 AI 문장 속 영어 단어(`moderate`)였다.
 *
 * 둘 다 규칙 엔진 판정이다. 화면에서 가장 큰 글자가 엔진이 만든 값이어야 한다 —
 * `CauseTab` 의 `PerformanceHero` 와 같은 원칙이고, 그쪽 주석의 "값 → 라벨 순서"
 * 도 그대로 따른다. 금융 화면이라 숫자가 설명보다 먼저 보여야 한다.
 *
 * ## 점수에 색을 얹지 않는다
 *
 * `design.md` §7.9 가 "상태색은 **등급 막대와 종목 집중도 스택 바 안에서만** 쓴다.
 * 그 밖으로 번지지 않는다" 고 못박았다. 36px 숫자를 주황으로 칠하면 이 화면에서
 * 가장 큰 상태색 덩어리가 되어 그 규칙이 무의미해진다.
 *
 * 그래서 **높낮이는 등급 이름이 말한다.** `57/100` 만 보고 좋은지 나쁜지 알 수 없는
 * 것이 맞고, 바로 옆 `보통` 이 그 답이다. 점수만 크게 두고 색으로 판정을 겹쳐
 * 말하지 않는다.
 *
 * ## 등급은 한국어로 옮긴다
 *
 * `low`·`moderate`·`high` 는 열거값이고 화면 문구가 아니다. `design.md` §13 Tone 의
 * "시스템/개발 용어를 사용자에게 노출하지 않음" 이 이 자리에 걸린다.
 *
 * 어휘를 `PortfolioStateSection` 의 등급(`양호`·`보통`·`다소 높음`·`높음`)과 맞추지
 * 않았다. 그쪽은 **지표 하나**가 임계값에 걸렸는지를 말하는 4단 눈금이고 이쪽은
 * **계좌 전체**의 3단 판정이라, 같은 말을 쓰면 두 눈금이 같은 것처럼 읽힌다.
 *
 * ## 기준을 볼 길을 함께 둔다
 *
 * 점수를 화면에서 가장 큰 글자로 올리면서 **근거를 볼 자리도 같이 만든다.** 숫자만
 * 크게 키우고 어디서 왔는지 말하지 않으면 전보다 나빠진다 — 전에는 작아서 안 보였고
 * 이제는 커서 묻게 된다. 내용은 `RiskScoreBasisSheet` 에 있다.
 *
 * 시트를 이 컴포넌트가 소유한다. 여는 자리가 점수 바로 아래라 상태를 위로 올릴
 * 이유가 없고, `DiagnosisTab` 은 순서만 정하는 파일로 남는다.
 */

/** 규칙 엔진의 3단 판정 (AI 명세 §5). LLM 이 정하는 값이 아니다. */
const RISK_LEVEL_LABEL: Record<AiRiskLevel, string> = {
  low: '낮음',
  moderate: '보통',
  high: '높음',
};

type RiskScoreHeroProps = {
  /** 기준 시트가 값을 그대로 보여준다. 점수를 프론트가 다시 계산하지는 않는다 */
  indicators: AiIndicators;
  /** 0~100 정수. 판정을 보류하면 `null` */
  riskScore: number | null;
  /** 판정을 보류하면 `null` */
  riskLevel: AiRiskLevel | null;
  /**
   * 변동성·상관을 계산하지 못한 사유 (AI 명세 §5). 정상이면 `null`.
   * 공통 거래일이 60일에 못 미치면 값이 담기고 **그때 점수·등급도 `null` 이 될 수
   * 있다** — 즉 이 셋은 함께 움직인다.
   */
  insufficientHistory: string | null;
};

export function RiskScoreHero({
  indicators,
  riskScore,
  riskLevel,
  insufficientHistory,
}: RiskScoreHeroProps) {
  const [basisOpen, setBasisOpen] = useState(false);
  const levelLabel = riskLevel === null ? null : RISK_LEVEL_LABEL[riskLevel];

  // 판정이 둘 다 보류면 이 자리에 쓸 것이 없다. 빈 머리를 그리지 않는다 —
  // 아래 `포트폴리오 상태` 가 지표별로 이미 말하고 있어 화면이 비지는 않는다.
  if (riskScore === null && levelLabel === null) {
    return null;
  }

  return (
    <section className="pt-6">
      {riskScore === null ? (
        <p className="text-title-1 text-text-primary">{levelLabel}</p>
      ) : (
        <p className="text-display text-text-primary tabular-nums">
          {riskScore}
          <span className="text-[20px] font-medium text-text-secondary">
            {' '}
            / 100
          </span>
        </p>
      )}

      <p className="mt-1 text-body-2 text-text-secondary">
        위험 점수{levelLabel === null ? '' : ` · ${levelLabel}`}
      </p>

      {/*
        계산이 막힌 사유는 **서버 문장을 그대로 내보내지 않는다.** `insufficient_history`
        의 형식이 명세에 "string" 으로만 적혀 있어 사용자용 한국어라는 보장이 없고,
        실제로 `only 23 common trading days` 같은 진단용 문구가 올 수 있다.
        그런 문장을 화면에 얹으면 `design.md` §13 "시스템/개발 용어 노출 금지" 를
        어긴다. 그래서 **값의 유무만 읽고 문구는 우리가 쓴다.**

        어느 지표가 비었는지는 아래 `포트폴리오 상태` 의 변동성 줄이 접히는 것으로
        이미 보이지만, 그것만으로는 "왜" 를 알 수 없어 한 줄을 남긴다.
      */}
      {insufficientHistory !== null && (
        <p className="mt-2 text-caption text-text-muted">
          거래 기록이 짧아 변동성 지표는 아직 비어 있어요.
        </p>
      )}

      <button
        type="button"
        onClick={() => setBasisOpen(true)}
        className="mt-3 text-body-2 font-medium text-text-secondary"
      >
        점수 기준 보기 ›
      </button>

      <RiskScoreBasisSheet
        open={basisOpen}
        onOpenChange={setBasisOpen}
        indicators={indicators}
      />
    </section>
  );
}
