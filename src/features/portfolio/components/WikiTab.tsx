import { useState } from 'react';

import { ROUTES } from '@/shared/config/routes';
import { readAiErrorCode, readAiErrorMessage } from '@/shared/lib/aiErrorRetry';
import { formatKstDate } from '@/shared/lib/formatDate';
import { type WikiFact, type WikiThesis } from '@/shared/types/ai/wiki';
import { AiStatus } from '@/shared/ui/AiStatus';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button, LinkButton } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Skeleton } from '@/shared/ui/Skeleton';
import { StockLogo } from '@/shared/ui/StockLogo';

import { useConfirmWikiFact } from '../api/useConfirmWikiFact';
import { useDeleteWikiFact } from '../api/useDeleteWikiFact';
import { usePortfolio } from '../api/usePortfolio';
import { useWiki } from '../api/useWiki';

import { ThesisEditSheet, type ThesisSheetTarget } from './ThesisEditSheet';
import { UnrecordedStockList } from './UnrecordedStockList';
import { WikiGuessCarousel, WIKI_ACCENT_COLOR } from './WikiGuessCarousel';

/**
 * `source` 를 사용자에게 보일 말로 옮긴다. `derived_from_trades` 는 계약 이름이
 * `거래 내역에서 도출` 이지만 프로토타입이 `투자 기록에서 확인` 으로 한 번 더
 * 옮겨 보여준다(proto L4160-4161) — 화면 문구는 그쪽을 따른다.
 */
const SOURCE_LABEL: Record<WikiFact['source'], string> = {
  user_stated: '직접 말한 내용',
  derived_from_trades: '투자 기록에서 확인',
  ai_inferred: 'AI 추측',
};

/** 프로토타입 `.info` — 18px 원 · 1.4px 테두리 · 11px/700 · 왼쪽 5px (proto L1146). */
const INFO_BUTTON_CLASS =
  'ml-1.25 flex size-4.5 flex-none items-center justify-center rounded-full ' +
  'border-[1.4px] border-text-muted text-[11px] font-bold text-text-muted';

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
 *
 * **실제 백엔드에서는 `profile` 이 항상 빈 배열이다.** `wiki_facts` 를 채우는
 * 경로가 없기 때문이고(GitLab #52, 2026-09-09 Phase 1 제외 결정), 이 화면은
 * `profile.length === 0` 일 때 상단 요약 줄과 확정 섹션을 조건부로 접는다.
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
  const confirmFact = useConfirmWikiFact();
  /**
   * 시트가 여는 대상. 기존 논지(수정)와 미기록 보유 종목(신규)이 같은 시트를 쓰고
   * 저장 경로만 갈린다 — `ThesisEditSheet.tsx` 머리 주석을 본다.
   */
  const [sheetTarget, setSheetTarget] = useState<ThesisSheetTarget | null>(
    null,
  );

  if (isPending) {
    return (
      <div className="flex flex-col gap-3 pt-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError) {
    const code = readAiErrorCode(error);
    const message = readAiErrorMessage(error, '투자 기준을 불러오지 못했어요');
    return (
      <AiStatus
        code={code}
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
      // 프로토타입 `wikiEmpty` 는 `.est` 기본 여백(56/24/40)을 그대로 쓴다
      // (proto L2362-2368). 전에 두었던 `pt-8` 은 근거가 없어 걷었다.
      <EmptyState
        title="아직 기록한 투자 기준이 없어요."
        description="투자하며 남긴 기록이 조금씩 여기에 쌓여요."
        action={
          <LinkButton to={ROUTES.chat} className="w-auto px-6.5">
            FINCH와 이야기해보기
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
      {profile.length > 0 && (
        /*
          `profile` 이 비면 상단 요약 줄과 확정 섹션을 통째로 접는다. 실제
          백엔드는 `wiki_facts` 를 채우는 경로가 없다 — 행을 넣는 함수
          (`ai/app/wiki/store.py:39` `add_fact`)의 호출부가 `ai/tests/` 뿐이고
          `ai/app/` 안에는 없다. 사고가 아니라 GitLab 이슈 #52 에서 2026-09-09 에
          세 파트가 Phase 1 밖으로 빼기로 합의하고 닫은 결정이다. 조건부로만
          접어 두어, 생성기가 생기면 이 코드를 되돌릴 필요 없이 바로 채워진다.
        */
        <>
          <div className="relative mb-9 flex items-center gap-2.5">
            <span className="flex-1 text-body-2 text-text-muted">
              확정{' '}
              <b className="font-semibold text-text-secondary">
                {confirmedFacts.length}
              </b>{' '}
              · 확인 필요{' '}
              {/* 확인이 필요한 것만 눈에 띄게 한다 — 추측 카드와 같은 강조색이다. */}
              <b className="font-semibold" style={{ color: WIKI_ACCENT_COLOR }}>
                {guessFacts.length}
              </b>
            </span>
            <button
              type="button"
              aria-label="선정 기준 보기"
              onClick={() => setInfoOpen((prev) => !prev)}
              className={INFO_BUTTON_CLASS}
            >
              ?
            </button>
            {infoOpen && (
              <div className="absolute top-full right-0 left-0 z-10 mt-2 flex items-start gap-2.5 rounded-12 bg-text-primary px-3.5 py-[13px] text-surface shadow-float">
                <span className="flex-1 text-caption text-pretty text-surface/86">
                  대화에서 직접 말한 내용은 바로 기준이 돼요. FINCH가 대화에서
                  읽어낸 건 맞다고 확인해 주신 뒤에 기준이 되고요. 분석과
                  답변에는 확정된 기준만 써요.
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
              <span className="text-section-title text-text-primary">
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
                    <p className="text-body-1 leading-6 font-medium text-pretty whitespace-pre-line text-text-primary">
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
                          className="flex-none text-caption text-text-muted"
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
        </>
      )}

      {guessFacts.length > 0 && (
        <section className="mb-12">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-section-title text-text-primary">
              FINCH가 이해한 투자 기준
            </span>
            <span
              className="text-caption font-semibold"
              style={{ color: WIKI_ACCENT_COLOR }}
            >
              확인 필요 {guessFacts.length}개
            </span>
          </div>
          {/* 개수는 오른쪽 `확인 필요 N개` 가 이미 말한다 (FINCH-351).
              전에는 이 줄도 `아직 확인하지 않은 기준이 있어요.` 로 같은 사실을
              한 번 더 적었다. 남은 자리는 **그래서 뭘 하면 되는지**다. */}
          <p className="mb-3.5 text-caption text-text-secondary">
            맞는지 알려주시면 분석에 반영할게요.
          </p>
          <WikiGuessCarousel
            facts={guessFacts}
            onConfirm={(fact) => confirmFact.mutate({ factId: fact.id })}
            onReject={(fact) =>
              deleteFact.mutate({
                factId: fact.id,
                reason: 'guess_rejected',
              })
            }
            /*
              둘 중 어느 것이 돌든 카드의 두 버튼을 함께 잠근다. 같은 사실에
              승격과 삭제가 동시에 날아가면 나중에 닿는 쪽이 404 를 받는다.
            */
            isAnswering={confirmFact.isPending || deleteFact.isPending}
          />
        </section>
      )}

      <section>
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-section-title text-text-primary">
            종목별 매수 이유
          </span>
          <span className="text-caption text-text-secondary">
            {theses.length}개
          </span>
        </div>
        <p className="mb-2.5 text-caption text-text-secondary">
          왜 샀는지 다시 볼 수 있어요.
        </p>
        {theses.length === 0 ? (
          <p className="pt-3 pb-0 text-body-1 leading-6 text-pretty text-text-secondary">
            아직 기록한 매수 이유가 없어요.
            <br />
            매수 이유를 남겨두면 다음 투자 판단에서 다시 볼 수 있어요.
          </p>
        ) : (
          <ThesisList
            theses={theses}
            onEditThesis={(thesis) => setSheetTarget({ thesis })}
          />
        )}
      </section>

      {/*
        `종목별 매수 이유` 안에 중첩된 `<section>` 이었다 — 그 제목이 세는
        개수(theses.length)에 잡히지 않는 행이 같은 제목 아래 더 보였다.
        형제 섹션으로 뺐다.
      */}
      <UnrecordedStockList
        holdings={unrecordedHoldings}
        onRecord={(holding) =>
          setSheetTarget({
            stockCode: holding.stockCode,
            stockName: holding.stockName,
          })
        }
      />

      <BottomSheet
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="이 기준을 삭제할까요?"
      >
        {/* 제목이 묻고 본문이 결과를 말한다 (FINCH-351, `design.md` §13
            Confirmation). 전에는 제목이 `사실 삭제 확인` 이었다 — `사실` 은
            응답 필드(`profile[]`)의 이름이지 화면의 말이 아니고, 물음과 결과가
            본문 한 줄에 붙어 있어 무엇을 묻는지가 늦게 나왔다. */}
        <p className="pb-1 text-body-1 leading-6 text-pretty text-text-primary">
          삭제하면 FINCH가 이후 분석과 답변에서 이 기준을 참고하지 않아요.
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
              deleteFact.mutate({
                factId: deleteTarget.id,
                reason: 'user_deleted',
              });
              setDeleteTarget(null);
            }}
            className="flex-1"
          >
            삭제
          </Button>
        </div>
      </BottomSheet>

      {/*
        `key`로 대상이 바뀔 때마다 새로 마운트한다 — `ThesisRecordSheet`가
        `initialText`를 마운트 시점에만 읽는다(`ThesisEditSheet.tsx` 머리 주석).
        신규 기록 쪽은 종목코드가 키다.
      */}
      <ThesisEditSheet
        key={sheetTarget?.thesis?.id ?? sheetTarget?.stockCode ?? 'none'}
        target={sheetTarget}
        onOpenChange={(open) => {
          if (!open) {
            setSheetTarget(null);
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
 *
 * **원장에 없는 종목(`name === ticker`)의 표시 규칙은 이슈 #42 에서 정해졌다** —
 * 보조줄에 `보유하지 않는 종목` 을 앞세우고 썸네일은 코드 앞 두 자리로 그린다.
 * `이름 없음` 같은 표현은 쓰지 않는다. 매도로 청산했어도 종목 자체는 존재하므로
 * 행을 흐리게 하거나 잠그지 않는다 — `status: 'closed'`(비활성)와는 별개의 축이다.
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
        /*
          원장에 없는 종목이면 `name` 에 티커가 그대로 온다 (`ai/app/api/routes/
          wiki.py` `_thesis_names`). 청산했거나 애초에 보유한 적이 없는 종목이다.
        */
        const isUnowned = thesis.name === thesis.ticker;
        return (
          <div key={thesis.id} className="border-b border-border/55">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : thesis.id)}
              className="flex w-full items-center gap-2.5 py-3.75 text-left"
            >
              {/*
                이름을 못 찾았으면 `stockName` 을 `null` 로 넘긴다. 뱃지가 그때
                코드 앞 두 자리를 넣는다 — 첫 글자가 `0` 하나뿐이면 어느 종목인지
                못 읽기 때문이다 (이슈 #42 표시 규칙). 그 규칙은 FINCH-299 가
                `StockInitialBadge` 로 올렸다. 로고가 있는 종목이면 애초에 로고가
                나오므로 이 갈래까지 오지 않는다.
              */}
              <StockLogo
                stockCode={thesis.ticker}
                stockName={isUnowned ? null : thesis.name}
                size="dense"
              />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span
                  className={`truncate text-body-1 font-semibold tracking-[-0.01em] ${
                    isClosed ? 'text-text-muted' : 'text-text-primary'
                  }`}
                >
                  {/*
                    이름을 못 찾으면 `name` 에 티커가 그대로 온다. 그때 코드를 두 번
                    찍지 않는다 — `005930 · 005930` 은 정보가 아니라 잡음이다.
                  */}
                  {thesis.name}
                  {!isUnowned && (
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
                <span className="text-caption text-text-muted">
                  {/*
                    `이름 없음` 같은 말은 쓰지 않는다 — 사용자에게는 시스템 사정이라
                    의미가 없다. 왜 코드만 보이는지를 보조줄이 대신 설명한다
                    (이슈 #42 안서진 님 표시 규칙).
                  */}
                  {isUnowned ? '보유하지 않는 종목 · ' : ''}
                  {formatKstDate(thesis.recordedAt)} 기록
                  {thesis.horizon === null
                    ? ''
                    : ` · ${HORIZON_LABEL[thesis.horizon]}`}
                </span>
              </span>
              <span className="flex w-4 flex-none items-center justify-center">
                <ThesisChevron open={isOpen} />
              </span>
            </button>
            {isOpen && (
              <div className="pb-4">
                <p className="text-body-2 leading-[23px] text-pretty whitespace-pre-line text-text-secondary">
                  {thesis.text}
                </p>
                <button
                  type="button"
                  onClick={() => onEditThesis(thesis)}
                  className="mt-3 flex w-auto items-center gap-1.5 text-label font-medium text-text-muted"
                >
                  기록 수정하기
                  <span aria-hidden="true">›</span>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * 프로토타입 `.chev` — 문자 글리프가 아니라 두 변만 남긴 9px 정사각을 45° 돌린
 * 것이다(proto L1136-1137). 펼치면 -135° 로 뒤집힌다.
 */
function ThesisChevron({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={[
        'size-2.25 flex-none border-r-[1.6px] border-b-[1.6px] border-text-muted',
        'transition-transform duration-(--motion-normal) ease-standard',
        open ? 'mt-0.5 rotate-[-135deg]' : '-mt-1 rotate-45',
      ].join(' ')}
    />
  );
}
