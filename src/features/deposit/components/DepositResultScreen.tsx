import { type ReactNode } from 'react';

import { formatKrw } from '@/shared/lib/formatNumber';
import { Button } from '@/shared/ui/Button';
import { SoftBox, SoftBoxRow } from '@/shared/ui/SoftBox';

/**
 * 충전 확정(`confirm`)의 결과 화면. 결제 복귀 성공(`DepositCompletePage`)과
 * 모의 이체(`DepositTransferPage`) 둘이 함께 쓴다 — 둘 다 마지막에 같은 `confirm`
 * 을 부르고 같은 세 갈래(성공·만료·그 밖의 에러)로 갈리기 때문이다.
 *
 * **만료(`expired`)는 `DEPOSIT_NOT_APPROVED`·`DEPOSIT_PAYMENT_FAILED` 두 코드를
 * 하나로 묶은 것이다** — 만료 정리 배치가 하루 1회만 돌아 어느 코드가 오는지가
 * 시각에 따라 갈리므로, 사용자에게는 같은 뜻("제시간에 확인되지 않았다")으로 보여준다.
 */
type DepositResultScreenProps = {
  variant: 'pending' | 'success' | 'expired' | 'error';
  amount?: number;
  cashBalanceAfter?: number;
  /** `error` 일 때만 쓴다. 서버 `message` 를 그대로 보여준다(컨벤션 §5). */
  errorMessage?: string;
  primaryLabel: string;
  onPrimaryAction: () => void;
  secondary?: ReactNode;
};

const CONTENT: Record<
  Exclude<DepositResultScreenProps['variant'], 'pending' | 'error'>,
  { glyph: string; title: string; description: string }
> = {
  success: {
    glyph: '✓',
    title: '입금이 완료됐어요',
    description: '예수금에 반영됐어요.',
  },
  expired: {
    glyph: '◌',
    title: '결제 확인 시간이 지났어요',
    description:
      '결제창이 열려 있던 사이 시간이 초과됐어요. 다시 입금해 주세요.',
  },
};

export function DepositResultScreen({
  variant,
  amount,
  cashBalanceAfter,
  errorMessage,
  primaryLabel,
  onPrimaryAction,
  secondary,
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
      : CONTENT[variant];

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

      {variant === 'success' && amount !== undefined && (
        <SoftBox className="mt-6 w-full text-left">
          <SoftBoxRow label="입금 금액" value={formatKrw(amount)} />
          {cashBalanceAfter !== undefined && (
            <SoftBoxRow
              label="입금 후 예수금"
              value={formatKrw(cashBalanceAfter)}
              divided
            />
          )}
        </SoftBox>
      )}

      <Button onClick={onPrimaryAction} className="mt-8">
        {primaryLabel}
      </Button>
      {secondary}
    </div>
  );
}
