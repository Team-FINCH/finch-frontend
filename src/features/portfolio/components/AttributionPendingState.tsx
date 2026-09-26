import { useEffect, useState } from 'react';

import { usePrefersReducedMotion } from '@/shared/hooks/usePrefersReducedMotion';
import { type AiAttributionPeriod } from '@/shared/types/ai/attribution';

import { ATTRIBUTION_PERIODS } from '../lib/attributionInsight';

import { AnalysisTrace } from './AnalysisTrace';

/**
 * `수익률 분석` 탭이 값을 기다리는 동안의 화면 (FINCH-353).
 *
 * ## 자리표시자를 쌓지 않는다
 *
 * 처음에는 이 자리가 회색 사각형 셋이었고, 그다음에는 골격 + 검정 카드 + 점 세 개였다.
 * 둘 다 같은 지적을 받았다 — **만들다 만 화면처럼 보인다**(2026-09-26). 회색 덩어리는
 * 내용이 아니라 "아직 없음" 을 그린 것이고, 검정 카드는 아직 아무 말도 못 하는 자리에
 * 화면에서 가장 무거운 면을 올린 것이었다.
 *
 * 지금은 **작은 자국 하나와 문구 두 줄**뿐이다. 상자에 가두지 않고 빈 여백 위에
 * 그대로 놓는다. 기다리는 동안 화면이 무거워질 이유가 없다.
 *
 * ## 히어로 자리를 비워 둔다
 *
 * 수익률 수치와 분석 문장은 **같은 한 번의 응답**으로 온다. 수치만 먼저 오는 길이
 * 없으므로 히어로 자리에 자리표시자를 세워 봐야 채울 것이 없는 상자를 미리 그리는
 * 일이 된다. 값이 도착하면 히어로가 위에 생기면서 이 자리가 아래로 밀리는데, 그
 * 순간을 `CauseTab` 이 연출로 덮는다(«넘겨받기»).
 *
 * ## 문구는 두 줄이다
 *
 * 전에는 `FINCH 분석` · `수익률을 분석하고 있어요` · `어느 요인에서…` 로 같은 뜻을
 * 세 번 말했다. 지금은 **무엇을 하는지 한 줄**, **그래서 지금 뭘 보고 있는지 한 줄**
 * 이다. 아래 줄만 한 바퀴(3.2초)마다 바뀌어 자국의 한 바퀴와 짝이 맞는다.
 *
 * 바뀌는 문구는 응답 스키마에 실제로 있는 것들이다(`contributors` · `sectors` ·
 * `breakdown`). **진행 단계가 아니다** — 서버가 단계를 주지 않으므로 순환할 뿐이고,
 * 번호도 백분율도 붙이지 않는다. 같은 이유로 `거의 다 됐어요` 류도 쓰지 않는다.
 * 언제 끝나는지 모르면서 끝이 가깝다고 말하면 실제로 오래 걸릴 때 더 나쁘다
 * (FINCH-283 이 채팅에서 정한 것).
 */

/** 이 시간 안에 끝난 요청은 대기 화면을 아예 거치지 않는다. */
const REVEAL_DELAY_MS = 200;

/** 자국 한 바퀴와 같다. 문구가 바뀌는 순간이 자국이 다시 시작하는 순간이다. */
const MESSAGE_INTERVAL_MS = 3_200;

/** 보조 문구가 지연 안내로 갈리기까지. 채팅(`ChatTypingIndicator`)과 같은 값이다. */
const SLOW_HINT_DELAY_MS = 10_000;

/** 이 화면이 하는 일. 바뀌지 않는다. */
const HEADLINE = '수익이 움직인 이유를 찾고 있어요';

/** 지금 보고 있는 것. 한 바퀴마다 바뀐다. */
const MESSAGES = [
  '종목과 시장의 영향을 살펴보고 있어요',
  '어떤 종목의 영향이 컸는지 보고 있어요',
  '시장 흐름과 함께 확인하고 있어요',
] as const;

function periodLabel(period: AiAttributionPeriod): string {
  return (
    ATTRIBUTION_PERIODS.find((item) => item.value === period)?.label ??
    '이 기간'
  );
}

type AttributionPendingStateProps = {
  /** 지금 기다리는 기간. 오래 걸릴 때의 안내가 이 값으로 갈린다. */
  period: AiAttributionPeriod;
};

export function AttributionPendingState({
  period,
}: AttributionPendingStateProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [revealed, setRevealed] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  /**
   * 안내를 켜도 되는 기간. **불리언이 아닌 이유** — 기다리는 도중에 기간을 바꾸면
   * 요청이 새로 나가므로 10초도 다시 세어야 한다. 불리언으로 들면 한 번 켜진 뒤로는
   * 어떤 기간을 골라도 곧바로 안내가 따라붙는다.
   */
  const [slowPeriod, setSlowPeriod] = useState<AiAttributionPeriod | null>(
    null,
  );

  /**
   * `1d` 는 아침 배치가 미리 만들어 둔 값이라 오래 걸릴 이유가 없다. 거기에
   * "지금 계산하고 있어요" 를 띄우면 사실이 아니다 (`usePortfolioAttribution`).
   */
  const slow = slowPeriod === period && period !== '1d';

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setRevealed(true);
    }, REVEAL_DELAY_MS);
    return () => {
      window.clearTimeout(timerId);
    };
  }, []);

  useEffect(() => {
    // 기간이 바뀌면 정리 함수가 이전 타이머를 걷어내고 처음부터 다시 센다.
    const timerId = window.setTimeout(() => {
      setSlowPeriod(period);
    }, SLOW_HINT_DELAY_MS);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [period]);

  useEffect(() => {
    // 움직임을 줄이기로 한 사람에게는 타이머 자체를 돌리지 않는다. 전환만 꺼도
    // 문구가 3.2초마다 순간이동한다 — `usePrefersReducedMotion` 주석 참고.
    if (reducedMotion || !revealed) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setMessageIndex((index) => (index + 1) % MESSAGES.length);
    }, MESSAGE_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [reducedMotion, revealed]);

  if (!revealed) {
    return null;
  }

  const caption = slow
    ? `${periodLabel(period)} 구간은 지금 처음 계산하고 있어요`
    : MESSAGES[messageIndex];

  return (
    <div className="animate-[diag-fade_480ms_var(--ease-standard)_both] motion-reduce:animate-none">
      {/*
        성공 화면과 **같은 제목이어야 한다** — 값이 들어와도 이 줄만은 제자리에
        남아서, 기다리던 화면과 결과 화면이 한 화면이라는 것을 잇는다. 문구를 고칠
        때는 `CauseTab` 의 같은 `h2` 도 함께 고친다.

        질문형인 것은 FINCH-351 이 정한 것이다(`분류 이름이라 무엇을 알게
        되는지 말하지 않는다`). 아래 `수익이 움직인 이유를 찾고 있어요` 는 그
        질문에 대한 답을 지금 만들고 있다는 뜻이라 두 줄이 이어진다.
      */}
      <h2 className="mt-8 text-section-title text-text-primary">
        이 수익률은 어디에서 왔을까요?
      </h2>

      {/*
        상자를 씌우지 않는다. 여백 위에 자국과 문구만 놓는다 — 위 «자리표시자» 참고.

        `min-h` + 가운데 정렬로 **빈자리를 위아래로 나눠 갖는다.** 내용만 높이로 두면
        덩어리가 제목에 붙어 위로 쏠리고 아래에만 긴 공백이 남아, 화면이 잘린 것처럼
        보인다. 256px 은 값이 도착했을 때 이 자리에 들어찰 내용(2차 탭 + 패널 첫 화면)
        과 비슷한 높이라 넘겨받는 순간의 이동도 작다.

        좌우 여백은 좁은 기기에서 문구가 두 줄로 접히지 않게 한 값이다.
      */}
      <div
        role="status"
        className="flex min-h-64 flex-col items-center justify-center px-2 text-center"
      >
        <AnalysisTrace />

        <p className="mt-6 text-body-1 font-semibold text-text-primary">
          {HEADLINE}
        </p>

        {/*
          `key` 가 바뀌면 노드가 새로 만들어져 페이드가 다시 탄다. 움직임을 줄이면
          `messageIndex` 가 0 에서 멈추므로 이 노드도 다시 만들어지지 않는다.

          `min-h` 는 문구 길이가 달라도 아래 여백이 흔들리지 않게 한 줄 높이를
          잡아 둔 것이다.
        */}
        <p
          key={caption}
          className="mt-1.5 min-h-5 animate-[diag-fade_420ms_var(--ease-standard)_both] text-label text-pretty break-keep text-text-muted motion-reduce:animate-none"
        >
          {caption}
        </p>
      </div>
    </div>
  );
}
