import { Link, useNavigate } from 'react-router-dom';

import { ROUTES } from '@/shared/config/routes';
import { AiCard } from '@/shared/ui/AiCard';
import { Skeleton } from '@/shared/ui/Skeleton';

import { useHomeBriefing } from '../api/useHomeBriefing';
import { briefingCategoryLabel } from '../lib/briefingCategoryLabel';

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
};

export function BriefingSection({ hasNoStocks }: BriefingSectionProps) {
  const navigate = useNavigate();
  const briefing = useHomeBriefing();

  // briefEmpty — 보유·관심 종목이 둘 다 없는 콜드 스타트. 브리핑 자체를 부르지
  // 않아도 이 카드가 그 이유를 설명한다.
  if (hasNoStocks) {
    return (
      <Link
        to={ROUTES.search}
        className="mb-5 flex w-full items-center gap-2.75 rounded-ai border border-ai-border bg-ai-surface px-4 py-3.5 text-left"
      >
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
  const categories = Array.from(new Set(items.map((item) => item.category)))
    .slice(0, 2)
    .map(briefingCategoryLabel)
    .join(' · ');

  return (
    <AiCard
      className="mb-5"
      label="AI 브리핑"
      headline={`오늘 확인할 소식이 ${items.length}건 있어요.`}
      caption={categories}
      onClick={() => navigate(ROUTES.briefing)}
    />
  );
}
