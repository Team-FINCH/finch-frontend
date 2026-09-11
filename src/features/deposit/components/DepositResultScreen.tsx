import { formatKrw } from '@/shared/lib/formatNumber';
import { Button } from '@/shared/ui/Button';
import { SoftBox } from '@/shared/ui/SoftBox';

import { DepositSummaryRow } from './DepositSummaryRow';

/**
 * 충전 확정(`confirm`)의 결과 화면. 결제 복귀 성공(`DepositCompletePage`)과
 * 모의 이체(`DepositTransferPage`) 둘이 함께 쓴다 — 둘 다 마지막에 같은 `confirm`
 * 을 부르고 같은 세 갈래(확정 중·성공·실패)로 갈리기 때문이다.
 *
 * **실패는 하나다. 결제 만료에 전용 배리언트를 두지 않는다** — `design.md:967` 이
 * "결제 만료(15분)도 실패 상태로 처리하고 별도 화면을 만들지 않는다" 고 명시했다.
 * 만료를 나타내는 문장은 `depositConfirmErrorMessage` 가 `errorMessage` 로 넣는다.
 */
type DepositResultScreenProps = {
  variant: 'pending' | 'success' | 'error';
  amount?: number;
  cashBalanceAfter?: number;
  /**
   * `error` 일 때만 쓴다. 만료·한도 초과만 우리가 문장을 만들고 나머지는 서버
   * `message` 를 그대로 보여준다 — 어느 쪽인지는 `depositConfirmErrorMessage`
   * 가 판정한다(컨벤션 §5).
   */
  errorMessage?: string;
  primaryLabel: string;
  onPrimaryAction: () => void;
  /**
   * 주 버튼 아래에 함께 두는 보조 동작. **결제 결과에서는 빼지 않는다** —
   * `design.md:968` "어느 실패든 빠져나갈 보조 동작을 함께 둔다. 이 화면에는
   * 탭바도 뒤로가기도 없어 주 동작 하나만 두면 갇힌다".
   *
   * 확정 중(`pending`)에는 아직 결과가 없어 넘기지 않는다. 프로토타입도 버튼
   * 블록 전체를 `payDone` 으로 감싼다(template L2747).
   */
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
};

const SUCCESS_CONTENT = {
  glyph: '✓',
  title: '입금이 완료됐어요',
  description: '예수금에 반영됐어요.',
};

export function DepositResultScreen({
  variant,
  amount,
  cashBalanceAfter,
  errorMessage,
  primaryLabel,
  onPrimaryAction,
  secondaryLabel,
  onSecondaryAction,
}: DepositResultScreenProps) {
  if (variant === 'pending') {
    return (
      <div className="flex flex-col items-center px-6 pt-20 pb-5 text-center">
        <span
          aria-hidden="true"
          className="mb-4 flex size-9.5 items-center justify-center rounded-full bg-surface-soft text-text-muted"
        >
          ···
        </span>
        <p className="text-body-1 text-text-secondary">확인하고 있어요</p>
      </div>
    );
  }

  const content =
    variant === 'error'
      ? {
          glyph: '!',
          title: '입금을 확정하지 못했어요',
          description: errorMessage ?? '잠시 후 다시 시도해 주세요.',
        }
      : SUCCESS_CONTENT;

  return (
    <div className="flex flex-col items-center px-6 pt-14.5 pb-5 text-center">
      <span
        aria-hidden="true"
        className="mb-4 flex size-9.5 items-center justify-center rounded-full bg-ai-status-icon-surface text-ai-status-title font-medium text-text-primary"
      >
        {content.glyph}
      </span>
      <b className="text-ai-status-title tracking-[-.01em] text-text-primary">
        {content.title}
      </b>
      <p className="mt-2 text-label text-pretty text-text-secondary">
        {content.description}
      </p>

      {/*
       * **결과 화면도 `입금 후 예수금` 만 키운다.** 입금 확인 화면과 같은 값이다 —
       * 프로토타입 `payOk` 카드(L2772)가 확인 카드(L2704)와 같은 줄 구성에 같은
       * 19px/700/-.01em 을 쓴다. 둘 중 한쪽만 키우면 같은 라벨이 화면마다 다르게
       * 보인다. 값이 담기는 통은 서로 다르다(`payOk` 는 `.card.d`, 이쪽은
       * `SoftBox`) — 그 선택은 이 티켓에서 건드리지 않았다.
       */}
      {variant === 'success' && amount !== undefined && (
        <SoftBox className="mt-6 w-full text-left">
          <DepositSummaryRow label="입금 금액" value={formatKrw(amount)} />
          {cashBalanceAfter !== undefined && (
            <DepositSummaryRow
              label="입금 후 예수금"
              value={formatKrw(cashBalanceAfter)}
              total
            />
          )}
        </SoftBox>
      )}

      {/* 주 + 보조 세로 10px 간격. 프로토타입 `payDone` 블록의 실측값이다(template L2747). */}
      <div className="mt-8 flex w-full flex-col gap-2.5">
        <Button onClick={onPrimaryAction}>{primaryLabel}</Button>
        {secondaryLabel !== undefined && onSecondaryAction !== undefined && (
          <Button variant="secondary" onClick={onSecondaryAction}>
            {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
