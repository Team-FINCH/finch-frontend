/**
 * 브리핑 `items[].category` 한글 라벨 (AI 명세 §8, `shared/types/ai/briefing.ts`
 * `AI_BRIEFING_CATEGORIES`). 열거값은 확정 5종이지만 **화면 표기 문구는 명세가
 * 정해 주지 않아 이 파일이 짓는다** — 값이 틀렸으면 바꿀 자리를 여기 하나로 모은다.
 */
const CATEGORY_LABEL: Record<string, string> = {
  holding_move: '보유 종목 동향',
  earnings: '실적',
  filing: '공시',
  macro_event: '시장 일정',
  portfolio_shift: '포트폴리오 변화',
};

export function briefingCategoryLabel(category: string): string {
  return CATEGORY_LABEL[category] ?? category;
}
