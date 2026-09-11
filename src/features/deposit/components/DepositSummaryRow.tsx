import { type ReactNode } from 'react';

/**
 * 입금 요약 카드의 한 줄. 입금 확인(`DepositPage`)과 입금 결과
 * (`DepositResultScreen`)가 함께 쓴다 — 프로토타입에서 두 카드가 같은 모양이다
 * (`isDeposit` 의 `확인` 카드 · `isPayReturn` 의 `payOk` 카드).
 *
 * **`shared/ui/SoftBoxRow` 를 쓰지 않는다.** 그쪽은 세 줄을 같은 크기로 그리는데,
 * 프로토타입은 **합계 줄만 키운다.** 값 클래스를 밖에서 덮어쓰는 방법
 * (`valueClassName`)도 있지만, `text-body-1` 과 `text-[19px]` 는 특이도가 같은
 * 유틸리티 둘이라 어느 쪽이 이길지 스타일시트 순서에 달린다 — `DepositPage` 가
 * 안내 카드에 `Card` 를 쓰지 않은 것과 같은 이유다. 줄 간격도 다르다(10px · 12px).
 *
 * 프로토타입 실측(`.card.d` 안):
 *
 * ```
 * 일반 줄   align-items:center  · 값 .b1 font-weight:500      · 줄 간격 12px
 * 합계 줄   align-items:baseline · 값 19px/700/-.01em          · margin-top 12 · padding-top 12 · border-top
 * ```
 *
 * 합계 줄이 `baseline` 인 이유는 값이 커져 `center` 로는 라벨과 밑선이 어긋나기
 * 때문이다. 19px/700 조합은 타이포 토큰에 없다 — `--text-title-3`(18px/600)·
 * `--text-section-title`(18px/700)과 1px 씩 다르다. `RecordSheet` 의 19px 제목과
 * 같은 방식으로 임의값을 쓴다.
 */
type DepositSummaryRowProps = {
  label: ReactNode;
  value: ReactNode;
  /**
   * 합계 줄. 위에 구분선을 긋고 값을 19px/700 으로 키운다.
   * **카드마다 하나뿐이다** — 제일 중요한 숫자를 가리키는 자리라 둘이면 뜻이 없다.
   */
  total?: boolean;
};

export function DepositSummaryRow({
  label,
  value,
  total = false,
}: DepositSummaryRowProps) {
  return (
    <div
      className={`flex justify-between gap-3 ${
        total
          ? 'mt-3 items-baseline border-t border-border pt-3'
          : 'mt-3 items-center first:mt-0'
      }`}
    >
      <span className="text-body-2 text-text-secondary">{label}</span>
      <span
        className={
          total
            ? 'text-[19px] font-bold tracking-[-0.01em] text-text-primary tabular-nums'
            : 'text-body-1 font-medium text-text-primary tabular-nums'
        }
      >
        {value}
      </span>
    </div>
  );
}
