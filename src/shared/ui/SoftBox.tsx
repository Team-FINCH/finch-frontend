import { type ComponentProps, type ReactNode } from 'react';

/**
 * Soft Box (design.md §6 "Light Surface는 그룹핑이 필요한 정보에만 사용").
 * 주문 요약 · 종목 상세의 내 보유 · 계좌 영향 · 내 정보 · 입금 한도가 쓴다.
 *
 * 프로토타입 `.soft` 실측 — 반경 10px · 안쪽 여백 16px · 옅은 회색 면.
 * 카드(`Card`)와 다르다. 카드는 흰 면에 테두리가 있고 이쪽은 테두리 없이 면색으로만 갈린다.
 *
 * 면색은 `--color-surface-soft` 다. `--color-primary-soft` 와 값이 거의 같지만
 * 역할이 다르다 — 근거는 토큰 파일 주석에 있다.
 */
export function SoftBox({ className = '', ...props }: ComponentProps<'div'>) {
  return (
    <div {...props} className={`rounded-sm bg-surface-soft p-4 ${className}`} />
  );
}

type SoftBoxRowProps = {
  label: ReactNode;
  value: ReactNode;
  /**
   * 등락색을 얹거나 굵기를 올릴 때 쓴다. **등락색은 이 자리에만 붙인다** (컨벤션 §11).
   * 예: `text-stock-up font-bold`
   */
  valueClassName?: string;
  /** `true` 면 위에 1px 구분선을 긋는다. 한도처럼 묶음이 갈릴 때 쓴다 */
  divided?: boolean;
};

/**
 * 키-값 한 줄. 줄 간격 10px 은 프로토타입 실측값이다.
 * 값은 고정폭 숫자로 그린다 — 시세·잔고가 갱신될 때 자리가 흔들리면 안 된다.
 *
 * **기본색 `text-text-primary` 는 값 `span` 이 아니라 행 `div` 에 둔다.**
 * `valueClassName` 이 색 유틸리티(`text-stock-up` 등)를 넘기면 값 `span` 자신의
 * 선언이 되고, 상속받은 색은 그 앞에서 진다 — 특이도나 스타일시트 순서와
 * 무관하게 요소 자신에게 직접 붙은 선언이 상속값을 항상 이기는 캐스케이드
 * 규칙이다. `valueClassName` 이 색을 넘기지 않으면(`font-bold` 처럼 굵기만
 * 넘기거나 아예 안 넘기면) 값은 그냥 컨테이너의 `text-text-primary` 를
 * 물려받는다. 이전 판은 값 `span` 에 기본색과 호출부 색을 특이도가 같은
 * 유틸리티로 나란히 넣어서 승자가 스타일시트 순서로 갈렸다 — 그 함정은
 * `DepositSummaryRow` 머리 주석이 설명한다. 조건 분기(`hasColorOverride`)로
 * 문자열을 검사해 막던 것을, 색을 아예 값의 것으로만 두는 구조로 없앴다.
 *
 * 라벨 `span` 은 `text-text-secondary` 를 늘 명시하므로 컨테이너 색과 무관하다.
 */
export function SoftBoxRow({
  label,
  value,
  valueClassName = '',
  divided = false,
}: SoftBoxRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 text-text-primary first:mt-0 ${
        divided ? 'mt-2.5 border-t border-border pt-2.5' : 'mt-2.5'
      }`}
    >
      <span className="text-body-2 text-text-secondary">{label}</span>
      <span
        className={`text-body-1 font-medium tabular-nums ${valueClassName}`}
      >
        {value}
      </span>
    </div>
  );
}
