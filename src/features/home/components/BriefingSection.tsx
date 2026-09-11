import { Link, useNavigate } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';
import { AiCard, AiGlyph } from '@/shared/ui/AiCard';
import { Skeleton } from '@/shared/ui/Skeleton';

import { useHomeBriefing } from '../api/useHomeBriefing';

/**
 * 홈의 AI 브리핑 블록 (AI 슬롯 1번, ia.md §4 "1 | 데일리 브리핑 | 홈 | 자산 요약
 * 아래 첫 블록"). 프로토타입 `briefEmpty`·`aiFail`·`aiShort`·`briefHas` 네 상태를
 * 그대로 옮겼다.
 *
 * **피드백(👍👎)을 붙이지 않는다.** ia.md §4 "피드백 슬롯 배치 규칙"의 표는 6곳
 * 전부를 적었지만, 같은 절이 "프로토타입의 실제 UI는 셋뿐"(종목 상세 AI 탭 ·
 * AI 채팅 · 수익률 원인 분석 시트)이라고 못박고 회신 대기 중이다. 셋 안에 브리핑이
 * 없어 이 슬롯에는 피드백을 두지 않는다.
 *
 * **`items.length === 0`(상태 `empty`) 처리가 두 문서와 다르게 적혀 있다.**
 * `shared/types/ai/briefing.ts` 의 스키마 주석은 "영역을 숨긴다"고 적었지만, 이
 * 프로토타입의 `aiShort` 상태는 "아직 모을 소식이 없어요" 한 줄을 보여준다.
 * TODO(계약): 프로토타입(마크업의 최종 근거)을 따라 지금은 후자로 만든다 —
 * 어느 쪽이 맞는지는 팀 확인이 필요하다.
 */
type BriefingSectionProps = {
  hasNoStocks: boolean;
  /**
   * 보유 종목이 하나라도 있는지. 헤드라인이 여기서 갈린다 — 프로토타입 `briefMain`
   * 이 보유가 없을 때만 `관심 종목에서` 로 소식의 출처를 밝힌다.
   */
  hasHoldings: boolean;
};

export function BriefingSection({
  hasNoStocks,
  hasHoldings,
}: BriefingSectionProps) {
  const navigate = useNavigate();
  const briefing = useHomeBriefing();

  // briefEmpty — 보유·관심 종목이 둘 다 없는 콜드 스타트. 훅은 조건부로 부를 수
  // 없으므로 여기 닿았을 때 요청은 이미 나간 뒤다. **게이트를 넣지 마라. 부르는
  // 것이 맞다.** 계약이 콜드 스타트 응답을 따로 정해 뒀다 —
  // `shared/types/ai/briefing.ts` 의 `status: 'empty'` 가 "보유 종목이 없거나
  // 내보낼 항목이 없다. `items` 가 빈 배열이고 오류가 아니다" 이므로, 불러야 그
  // 신호를 받는다. 이 카드는 응답을 기다리지 않고 먼저 그 이유를 설명할 뿐이다.
  if (hasNoStocks) {
    return (
      <Link
        to={ROUTES.search}
        className="mb-5 flex w-full items-center gap-2.75 rounded-ai border border-ai-border bg-ai-surface px-4 py-3.5 text-left text-ai-text-primary"
      >
        <AiGlyph />
        <span className="min-w-0 flex-1 text-body-2 font-medium text-ai-text-primary">
          관심 종목을 담으면 소식을 모아드려요
        </span>
        <span
          aria-hidden="true"
          className="flex-none text-body-2 text-ai-text-muted"
        >
          ›
        </span>
      </Link>
    );
  }

  if (briefing.isPending) {
    return <Skeleton className="mb-5 h-21 w-full rounded-ai" />;
  }

  // aiFail — 조회 실패. 재시도만 준다(design.md §10, ia.md §4 "에러 자리의 피드백").
  if (briefing.isError) {
    return (
      <div className="mb-5 flex items-center gap-2.75 border-b border-border py-3.5">
        <span
          aria-hidden="true"
          className="flex-none text-label text-text-muted"
        >
          ↻
        </span>
        <span className="min-w-0 flex-1 text-body-2 font-medium text-text-secondary">
          브리핑을 불러오지 못했어요
        </span>
        <button
          type="button"
          onClick={() => briefing.refetch()}
          className="flex-none text-label font-medium text-text-primary underline underline-offset-3"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const { items } = briefing.data.content;

  // aiShort — 조회는 됐지만 오늘 내보낼 항목이 없다(`status:'empty'`). 위 머리
  // 주석의 TODO(계약) 참고.
  if (items.length === 0) {
    return (
      <div className="mb-5 flex items-center gap-2.75 border-b border-border py-3.5">
        <span
          aria-hidden="true"
          className="flex-none text-label text-text-muted"
        >
          ◌
        </span>
        <span className="text-body-2 font-medium text-text-secondary">
          아직 모을 소식이 없어요
        </span>
      </div>
    );
  }

  // briefHas — 정상. 카드 전체가 브리핑 전체 화면으로 이동한다(프로토타입 `goBriefing`).

  return (
    <AiCard
      className="mb-5"
      label="AI 브리핑"
      headline={
        hasHoldings
          ? `오늘 확인할 소식이 ${items.length}건 있어요.`
          : `관심 종목에서 오늘 확인할 소식이 ${items.length}건 있어요.`
      }
      /*
        보조 줄은 `오늘 {N}건` 이다 (프로토타입 `briefMetaLine`). 전에는
        `items[].category` 를 이어 붙여 `보유 종목 동향 · 실적` 처럼 그렸는데
        프로토타입에 없는 모양이었다.

        **`확인 필요 {K}건` 은 넣지 않는다.** 프로토타입은 `확인 필요 1건` 을
        상수로 박아 뒀고, 실제 값은 알림함의 종류별 미읽음 개수라 브리핑 응답에
        출처가 없다 — GitLab #57 회신 뒤에 붙인다. 자리만 비워 두면 `·` 만
        덩그러니 남으므로 조각 자체를 넣지 않는다.
      */
      caption={`오늘 ${items.length}건`}
      onClick={() => navigate(ROUTES.briefing)}
    />
  );
}
