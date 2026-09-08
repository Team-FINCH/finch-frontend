import { useState } from 'react';

import { isHttpError } from '@/shared/api';
import { ROUTES } from '@/shared/config/routes';
import { formatKstDate } from '@/shared/lib/formatDate';
import { type WikiFact, type WikiThesis } from '@/shared/types/ai/wiki';
import { AiStatus } from '@/shared/ui/AiStatus';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button, LinkButton } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';

import { useDeleteWikiFact } from '../api/useDeleteWikiFact';
import { usePortfolio } from '../api/usePortfolio';
import { useWiki } from '../api/useWiki';

import { ThesisEditSheet } from './ThesisEditSheet';
import { UnrecordedStockList } from './UnrecordedStockList';
import { WikiGuessCarousel } from './WikiGuessCarousel';

const SOURCE_LABEL: Record<WikiFact['source'], string> = {
  user_stated: '직접 말한 내용',
  derived_from_trades: '거래 내역에서 도출',
  ai_inferred: 'AI 추측',
};

const HORIZON_LABEL: Record<NonNullable<WikiThesis['horizon']>, string> = {
  short: '단기',
  mid: '중기',
  long: '장기',
};

/**
 * "투자 기준" 탭 — "AI가 이해한 나" 위키 (프로토타입 `isPfWiki` 블록, `pftab==="wiki"`).
 * `/portfolio?tab=wiki` 가 위키의 유일한 라우트다 — 프로토타입의 독립 화면
 * (`isWiki` 블록)은 만들지 않는다(ia.md §1 "라우트를 하나로 합친 이유").
 *
 * 세 섹션 — 확정된 투자 기준 · FINCH가 이해한 투자 기준(확인 필요) · 종목별 매수
 * 이유 — 은 `GET /wiki` 응답 하나(`profile[]`·`theses[]`)에서 `source`로 갈라 만든다.
 * `profile`·`theses`가 둘 다 비면 화면 전체를 빈 상태로 바꾸고 AI 채팅으로 보내는
 * 버튼만 둔다(ia.md §1 "빈 상태").
 */
export function WikiTab() {
  const { data, isPending, isError, error, refetch } = useWiki();
  /**
   * "아직 적지 않은 종목" 을 만들려면 보유 목록이 필요하다. 홈·보유 탭과 같은
   * 쿼리 키라 대개 캐시에 이미 있다(`staleTime` 30초). 실패해도 이 섹션만
   * 빠지게 두고 위키 본문을 막지 않는다 — 곁가지가 본문을 가리면 안 된다.
   */
  const portfolio = usePortfolio('EVALUATION');
  const [infoOpen, setInfoOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<WikiFact | null>(null);
  const deleteFact = useDeleteWikiFact();
  const [editTarget, setEditTarget] = useState<WikiThesis | null>(null);

  if (isPending) {
    return (
      <div className="flex flex-col gap-3 pt-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError) {
    const message = isHttpError(error)
      ? error.message
      : '투자 기준을 불러오지 못했어요';
    return (
      <AiStatus
        code={isHttpError(error) ? (error.code ?? undefined) : undefined}
        title={message}
        description="잠시 후 다시 시도해 주세요."
        onRetry={() => void refetch()}
      />
    );
  }

  if (data === undefined) {
    return null;
  }

  const { profile, theses } = data;

  if (profile.length === 0 && theses.length === 0) {
    return (
      <EmptyState
        className="pt-8"
        title="아직 기록한 투자 기준이 없어요."
        description={
          <>
            투자하면서 남긴 기록이
            <br />
            조금씩 여기에 쌓여요.
          </>
        }
        action={
          <LinkButton to={ROUTES.chat} className="w-auto px-6.5">
            AI와 대화 시작하기
          </LinkButton>
        }
      />
    );
  }

  const confirmedFacts = profile.filter(
    (fact) => fact.source !== 'ai_inferred',
  );
  const guessFacts = profile.filter((fact) => fact.source === 'ai_inferred');

  // 논지가 있는 종목은 뺀다. 보유를 못 받았으면 빈 배열이라 섹션이 통째로 빠진다.
  const recordedTickers = new Set(theses.map((thesis) => thesis.ticker));
  const unrecordedHoldings = (portfolio.data?.holdings ?? []).filter(
    (holding) => !recordedTickers.has(holding.stockCode),
  );

  return (
    <div className="pt-3.5 pb-6">
      <div className="relative mb-9 flex items-center gap-2.5">
        <span className="flex-1 text-body-2 text-text-muted">
          확정{' '}
          <b className="font-semibold text-text-secondary">
            {confirmedFacts.length}
          </b>{' '}
          · 확인 필요{' '}
          <b className="font-semibold text-text-secondary">
            {guessFacts.length}
          </b>{' '}
          · 매수 이유{' '}
          <b className="font-semibold text-text-secondary">{theses.length}</b>
        </span>
        <button
          type="button"
          aria-label="선정 기준 보기"
          onClick={() => setInfoOpen((prev) => !prev)}
          className="flex size-5 flex-none items-center justify-center rounded-full border border-text-muted text-caption text-text-muted"
        >
          ?
        </button>
        {infoOpen && (
          <div className="absolute top-full right-0 left-0 z-10 mt-2 flex items-start gap-2.5 rounded-md bg-text-primary p-3.5 text-surface shadow-float">
            <span className="flex-1 text-caption text-pretty text-surface/86">
              대화에서 직접 말한 내용은 바로 확정하고, 투자 기록에서 읽어낸
              성향은 확인을 받은 뒤에만 확정해요. 확정된 기준만 분석과 답변에
              씁니다.
            </span>
            <button
              type="button"
              aria-label="닫기"
              onClick={() => setInfoOpen(false)}
              className="flex-none text-caption text-surface/50"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <section className="mb-12">
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-title-3 text-text-primary">
            확정된 투자 기준
          </span>
          <span className="text-caption text-text-secondary">
            {confirmedFacts.length}개
          </span>
        </div>
        {confirmedFacts.length === 0 ? (
          <p className="py-3.5 text-body-1 leading-6 text-text-secondary">
            아직 확정된 기준이 없어요.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border/40">
            {confirmedFacts.map((fact) => (
              <div key={fact.id} className="py-4">
                <p className="text-body-1 leading-6 font-medium text-pretty text-text-primary">
                  {fact.text}
                </p>
                <div className="mt-2.25 flex items-center justify-between gap-3">
                  <span className="text-caption text-text-secondary">
                    {SOURCE_LABEL[fact.source]} · {formatKstDate(fact.asOf)}
                  </span>
                  {fact.editable && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(fact)}
                      className="flex-none text-label text-text-muted"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {guessFacts.length > 0 && (
        <section className="mb-12">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-title-3 text-text-primary">
              FINCH가 이해한 투자 기준
            </span>
            <span className="text-caption font-semibold text-text-secondary">
              확인 필요 {guessFacts.length}개
            </span>
          </div>
          <p className="mb-3.5 text-caption text-text-secondary">
            아직 확인하지 않은 기준이 있어요.
          </p>
          <WikiGuessCarousel facts={guessFacts} />
        </section>
      )}

      <section>
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-title-3 text-text-primary">
            종목별 매수 이유
          </span>
          <span className="text-caption text-text-secondary">
            {theses.length}개
          </span>
        </div>
        <p className="mb-2.5 text-caption text-text-secondary">
          왜 샀는지 적어두면 AI가 근거로 삼아 더 맞는 추천을 해줘요.
        </p>
        {theses.length === 0 ? (
          <p className="pt-3 pb-0 text-body-1 leading-6 text-pretty text-text-secondary">
            아직 기록한 매수 이유가 없어요.
            <br />
            매수 이유를 남겨두면 AI가 그 기록을 근거로 더 맞는 추천을 해줘요.
          </p>
        ) : (
          <ThesisList theses={theses} onEditThesis={setEditTarget} />
        )}

        <UnrecordedStockList holdings={unrecordedHoldings} />
      </section>

      <BottomSheet
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="사실 삭제 확인"
      >
        <p className="pb-1 text-body-1 leading-6 text-pretty text-text-primary">
          이 기록을 삭제할까요? 삭제하면 이후 모든 분석과 답변에서 제외돼요.
        </p>
        {deleteTarget !== null && (
          <p className="mt-3 rounded-sm bg-surface-soft p-3.5 text-body-2 text-text-secondary">
            {deleteTarget.text}
          </p>
        )}
        <div className="mt-5 flex gap-2.5">
          <Button
            variant="secondary"
            onClick={() => setDeleteTarget(null)}
            className="flex-1"
          >
            취소
          </Button>
          <Button
            onClick={() => {
              if (deleteTarget === null) {
                return;
              }
              deleteFact.mutate(deleteTarget.id);
              setDeleteTarget(null);
            }}
            className="flex-1"
          >
            삭제
          </Button>
        </div>
      </BottomSheet>

      {/*
        `key`로 논지가 바뀔 때마다 새로 마운트한다 — `ThesisRecordSheet`가
        `initialText`를 마운트 시점에만 읽는다(`ThesisEditSheet.tsx` 머리 주석).
      */}
      <ThesisEditSheet
        key={editTarget?.id ?? 'none'}
        thesis={editTarget}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null);
          }
        }}
      />
    </div>
  );
}

/**
 * 종목별 매수 이유 목록. 행을 누르면 아코디언으로 펼쳐 기존 텍스트를 보여주고,
 * 펼친 안의 "기록 수정하기"를 누르면 `onEditThesis`(→ `ThesisEditSheet`)로 그
 * 종목의 기록 시트를 바로 연다 — 알림함(`/inbox`)으로 보내던 이전 동작을
 * FINCH-28-ai-entry에서 바꿨다. 이 섹션은 종목이 이미 정해져 있어(각 행이
 * 자기 `ticker`를 이미 안다) 알림함을 거칠 이유가 없다는 것이 사용자 결정이다.
 */
type ThesisListProps = {
  theses: WikiThesis[];
  onEditThesis: (thesis: WikiThesis) => void;
};

function ThesisList({ theses, onEditThesis }: ThesisListProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="flex flex-col">
      {theses.map((thesis) => {
        const isOpen = openId === thesis.id;
        const isClosed = thesis.status === 'closed';
        return (
          <div key={thesis.id} className="border-b border-border/55">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : thesis.id)}
              className="flex w-full items-center gap-2.5 py-3.75 text-left"
            >
              <span
                className={`flex-1 text-body-1 font-semibold ${
                  isClosed ? 'text-text-muted' : 'text-text-primary'
                }`}
              >
                {/*
                  이름을 못 찾으면 `name` 에 티커가 그대로 온다. 그때 코드를 두 번
                  찍지 않는다 — `005930 · 005930` 은 정보가 아니라 잡음이다.
                */}
                {thesis.name}
                {thesis.name !== thesis.ticker && (
                  <span className="ml-1.5 text-caption font-normal text-text-muted">
                    {thesis.ticker}
                  </span>
                )}
                {isClosed && (
                  <span className="ml-1.5 text-caption font-normal text-text-muted">
                    (비활성)
                  </span>
                )}
              </span>
              <span className="flex-none text-caption text-text-secondary">
                {formatKstDate(thesis.recordedAt)}
                {thesis.horizon === null
                  ? ''
                  : ` · ${HORIZON_LABEL[thesis.horizon]}`}
              </span>
              <span
                aria-hidden="true"
                className={`flex-none text-body-2 text-text-muted transition-transform duration-(--motion-normal) ${
                  isOpen ? 'rotate-180' : ''
                }`}
              >
                ⌄
              </span>
            </button>
            {isOpen && (
              <div className="pb-4">
                <p className="text-body-2 leading-6 text-pretty text-text-secondary">
                  {thesis.text}
                </p>
                <button
                  type="button"
                  onClick={() => onEditThesis(thesis)}
                  className="mt-3 flex w-auto items-center gap-1.5 text-label font-medium text-text-primary"
                >
                  기록 수정하기
                  <span aria-hidden="true" className="text-text-muted">
                    ›
                  </span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
