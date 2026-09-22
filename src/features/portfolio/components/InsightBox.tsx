import { type ReactNode } from 'react';

/**
 * 차트 아래 한 줄 — `종목 선택의 영향이 가장 컸어요.` (FINCH-333).
 *
 * ## 문장을 면 위에 올린 이유
 *
 * 전에는 막대 목록 바로 아래 맨 `<p>` 였다. 같은 흰 면 위에 같은 굵기로 서 있어서
 * **막대 목록의 넷째 줄처럼 읽혔다** — 이 문장은 위 셋을 *읽고 난 결론*인데 셋과
 * 같은 층에 있었다. 옅은 면으로 한 단 내리면 "위를 요약한 것" 이라는 관계가 배치로
 * 드러난다.
 *
 * ## 등락색을 쓰지 않는다
 *
 * 이 상자 안의 글자는 언제나 `--color-text-primary` 다. 바로 위에 등락색 막대와
 * 수치가 여섯 개 서 있는 자리라, 결론 줄까지 칠하면 **적색이 한 번 더 늘 뿐 어느
 * 것이 결론인지는 오히려 흐려진다.** 위계는 면으로 주고 색은 숫자에 남긴다.
 *
 * 부호를 말하지 않는 문장이라 색을 붙일 근거도 없다 — `resolveMainFactor` 는
 * 절댓값으로 고르므로 가장 크게 *깎은* 요인도 여기 들어온다.
 *
 * ## 아이콘을 달지 않는다
 *
 * 면색과 여백이 이미 이 줄을 다른 층으로 내려 뒀다. 전구나 ✦ 를 붙이면 표시가
 * 두 겹이 되고, `AiCard` 의 글리프와 섞여 **엔진이 쓴 문장을 AI 가 쓴 것으로
 * 읽히게 한다.** 이 문장은 `attributionInsight.ts` 가 argmax 로 고른 것이다.
 *
 * ## `SoftBox` 를 쓰지 않은 이유
 *
 * 면색·반경은 같지만 그쪽 머리 주석이 쓰임을 "그룹핑이 필요한 정보"(키-값 묶음)로
 * 못박아 두었고 짝인 `SoftBoxRow` 도 키-값 한 줄이다. 여기는 문장 하나다.
 * 여백(12px 14px)도 그쪽 16px 보다 좁다 — 한 줄짜리에 16px 을 주면 상자가 문장보다
 * 커 보인다.
 */

type InsightBoxProps = {
  children: ReactNode;
  className?: string;
};

export function InsightBox({ children, className = '' }: InsightBoxProps) {
  return (
    <p
      className={`rounded-sm bg-surface-soft px-3.5 py-3 text-body-2 text-pretty text-text-primary ${className}`}
    >
      {children}
    </p>
  );
}
