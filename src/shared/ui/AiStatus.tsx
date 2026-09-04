import { type ReactNode } from 'react';

import { isRetryableAiErrorCode } from '@/shared/lib/aiErrorRetry';

/**
 * AI 슬롯의 실패·데이터 부족 상태 (design.md §10 States).
 *
 * **AiCard 를 쓰지 않는다.** design.md §10 이 두 상태 모두 "Dark AI Card 사용 금지"
 * 라고 적었다. 검정 면은 AI 가 답을 내놓은 자리를 뜻하는데 여기는 답이 없는 자리다.
 * 기본 배경 위 가운데 정렬 상태 UI 로 둔다. "Red Warning Box 금지" 도 그래서
 * --color-danger 를 쓰지 않는다.
 *
 * 프로토타입 `.aist` 실측 —
 * `display:flex; flex-direction:column; align-items:center; text-align:center;
 *  padding:58px 24px 20px`.
 * 화면마다 padding 을 인라인으로 줄여 쓰는 자리가 있어(주문 34/24/16, 시트 24/12/12)
 * 기본값만 두고 나머지는 `className` 으로 덮게 했다.
 *
 * 재시도 버튼을 낼지는 `code` 가 정한다 (ia.md §4). 화면이 직접 고르게 두면
 * 슬롯마다 판단이 갈리고, `INSUFFICIENT_DATA` 에 재시도가 붙는 사고가 난다.
 *
 * **피드백은 이 컴포넌트가 만들지 않는다.** design.md §10 은 실패 자리에
 * "Feedback 노출 금지" 라고 적었고 ia.md §4 는 반대로 실패 자리에도 피드백을 붙이되
 * 재시도 가능하면 접어 두고 불가하면 크게 노출한다고 적었다. 두 문서가 갈린다.
 * 지금은 어느 쪽도 셸에 굳히지 않고 `children` 슬롯만 열어 둔다.
 * 피드백 컴포넌트가 생기면 그때 배치 규칙을 정한다.
 */
type AiStatusProps = {
  /**
   * 응답의 에러 `code`. 이 값으로 재시도 버튼과 글리프가 갈린다.
   * `INSUFFICIENT_DATA` 처럼 재시도가 무의미한 코드에서는 버튼을 만들지 않는다.
   */
  code?: string;
  /** 제목 한 줄. 예 `분석을 불러오지 못했어요` */
  title: string;
  /**
   * 설명. 데이터 부족일 때는 **그 슬롯의 실제 활성 조건**을 적는다 (design.md §10).
   * 모든 슬롯에 같은 숫자 조건을 하드코딩하지 않는다.
   */
  description: ReactNode;
  /** 재시도 동작. `code` 가 재시도 가능할 때만 버튼이 나온다. */
  onRetry?: () => void;
  /** 상태 아래에 덧붙일 것(피드백 등). 위 주석 참고. */
  children?: ReactNode;
  className?: string;
};

export function AiStatus({
  code,
  title,
  description,
  onRetry,
  children,
  className = '',
}: AiStatusProps) {
  const retryable = isRetryableAiErrorCode(code) && onRetry !== undefined;

  return (
    <div
      className={`flex flex-col items-center px-6 pt-14.5 pb-5 text-center ${className}`}
    >
      {/* 원반 안의 글리프. 색만으로 두 상태를 가르지 않으려고 모양을 나눴다 —
          재시도 가능은 회전 화살표(↻), 데이터 부족은 빈 원(◌)이다.
          프로토타입이 두 자리에서 쓴 문자를 그대로 옮겼다. 뜻은 제목이 말하므로
          보조 기술에는 숨긴다. */}
      <span
        aria-hidden="true"
        className="mb-4 flex size-9.5 items-center justify-center rounded-full bg-ai-status-icon-surface text-ai-status-title font-medium text-text-muted"
      >
        {retryable ? '↻' : '◌'}
      </span>

      <b className="text-ai-status-title tracking-[-.01em] text-text-primary">
        {title}
      </b>
      <p className="mt-2 text-label text-pretty text-text-secondary">
        {description}
      </p>

      {retryable && (
        // 프로토타입 `.aist>button` 은 높이 38px 이고 design.md §11 Compact Secondary
        // Button 도 34~40px 이다. 그런데 같은 문서 §12 는 터치 영역 최소 44px 을 요구한다.
        // 보이는 높이는 실측값 38px 로 두고 눌리는 영역만 위아래로 3px 씩 넓혀 44px 을
        // 만든다. 높이를 44px 로 올리면 레이아웃이 실측값에서 벗어난다.
        <button
          type="button"
          onClick={onRetry}
          className="relative mt-5 h-9.5 min-w-26 rounded-sm border border-border-strong bg-surface px-4.5 text-label text-text-primary before:absolute before:inset-x-0 before:-inset-y-0.75 before:content-['']"
        >
          다시 시도
        </button>
      )}

      {children}
    </div>
  );
}
