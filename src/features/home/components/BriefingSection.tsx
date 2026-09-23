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
 *
 * **그 빈 상태에 설명 한 줄을 더했다** (FINCH-262). 보여줄지 말지의 판정은
 * 위 TODO 그대로 두고 문구만 고친 것이다 — 이유는 해당 분기 주석에 있다.
 *
 * ## 보조 줄을 걷어 카드를 92px 로 줄였다 (FINCH-333)
 *
 * `오늘 확인할 소식이 3건 있어요.` 아래 `오늘 3건` 이 또 있었다. **125px 차콜
 * 면이 말하는 사실이 "3건" 하나인데 그것을 두 번 말하고 있었다.**
 *
 * 원인이 있다. 프로토타입의 그 줄은 `오늘 3건 · 확인 필요 1건` 이고 뒤 조각이
 * 실제 정보였는데, 그 값의 출처가 브리핑 응답에 없어서(알림함의 종류별 미읽음
 * 개수 — GitLab #57 회신 대기) 우리가 뺐다. **남은 앞 조각이 헤드라인과 겹치는
 * 말이 됐다.**
 *
 * 그래서 보조 줄 자체를 없앴다. `확인 필요 {K}건` 이 생기면 그때 되살린다 —
 * 그때는 헤드라인이 말하지 않는 값이라 겹치지 않는다.
 *
 * 셰브런은 `AiCard` 가 헤드라인 줄 오른쪽 끝에 그린다(캡션이 없는 눌리는 카드).
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
    return <Skeleton className="mb-5 h-23 w-full rounded-ai" />;
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

  /*
    aiShort — 조회는 됐지만 오늘 내보낼 항목이 없다(`status:'empty'`). 위 머리
    주석의 TODO(계약) 참고.

    **설명 한 줄을 함께 둔다** (FINCH-262). 전에는 `아직 모을 소식이 없어요`
    한 줄이었는데, 홈 맨 위에서 이 블록을 처음 만난 사람은 **여기가 원래 무엇을
    하는 자리인지 알 수 없었다.** 결과만 말하고 정체를 밝히지 않는다.

    두 가지가 이 자리를 예외로 만들고 있었다.

    - `EmptyState` 가 적어 둔 규칙(design.md §13) — "`데이터가 없습니다`를 쓰지
      않는다. 지금 무엇이 없는지와 **무엇을 하면 채워지는지**를 한 문장씩 적는다".
      같은 브리핑의 전체 화면(`BriefingFullList`)은 이미 두 문장이다
    - 프로토타입의 다른 빈 상태 넷도 전부 두 줄이다 — 종목 분석 `공시와 뉴스가
      조금 더 쌓이면…`, 주문 점검 `매수 이유를 기록하면…`, 진단 `한 종목만
      담아도…`. 홈 브리핑의 `aiShort` 만 한 줄짜리였다

    바로 위 콜드 스타트 분기(`관심 종목을 담으면 소식을 모아드려요`)와 톤을 맞췄다.

    **"매일 아침" 이라고 적지 않는다.** AI 명세는 `일 1회 배치 생성` 까지만 정하고
    시각을 계약으로 두지 않았다(응답 예시의 `07:30` 은 예시다). 배치 시각이 바뀌면
    조용히 틀린 문장이 되므로 횟수만 적는다.
  */
  if (items.length === 0) {
    return (
      <div className="mb-5 flex items-start gap-2.75 border-b border-border py-3.5">
        <span
          aria-hidden="true"
          className="flex-none text-label leading-5.5 text-text-muted"
        >
          ◌
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-body-2 font-medium text-text-secondary">
            오늘 모인 소식이 없어요
          </span>
          <span className="text-caption text-pretty break-keep text-text-secondary">
            보유·관심 종목의 공시와 뉴스를 하루 한 번 모아드려요.
          </span>
        </span>
      </div>
    );
  }

  // briefHas — 정상. 카드 전체가 브리핑 전체 화면으로 이동한다(프로토타입 `goBriefing`).

  /*
    건수만 `--color-ai-accent` 로 칠한다 (FINCH-333).

    이 카드가 하는 일은 **소식함으로 보내는 것** 하나다. 문장 전체가 같은 흰색
    이면 누를 이유가 어디 있는지 표시가 없어서, 읽는 사람이 찾아야 할 값 하나만
    띄운다 — `design.md` §4·§15 가 그 색을 "핵심 결과에만 · 한 카드에 최대 2~3곳"
    으로 묶어 뒀고 하나면 그 안이다. 차콜 면 대비 7.07 이라 잘 읽힌다.

    **`--color-notify`(#D94A4A)를 쓰지 않는다.** 미확인 알림의 점·뱃지 전용이고
    (design.md §4·§7.11) 차콜 면 대비가 3 을 밑돌아 읽히지도 않는다.
  */
  const count = (
    <span className="font-bold text-ai-accent tabular-nums">
      {items.length}건
    </span>
  );

  return (
    <AiCard
      className="mb-5"
      label="AI 브리핑"
      headline={
        hasHoldings ? (
          <>오늘 확인할 소식이 {count} 있어요.</>
        ) : (
          <>관심 종목에서 오늘 확인할 소식이 {count} 있어요.</>
        )
      }
      onClick={() => navigate(ROUTES.briefing)}
    />
  );
}
