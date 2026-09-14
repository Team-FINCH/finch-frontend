import { useNavigate } from 'react-router-dom';

import { isHttpError } from '@/shared/api';
import { ROUTES } from '@/shared/config/routes';
import { formatKstDate } from '@/shared/lib/formatDate';
import { formatKrw } from '@/shared/lib/formatNumber';
import { AI_SERVICE_ERROR_CODES } from '@/shared/types/errorCodes';
import { type OrderSide } from '@/shared/types/order';
import { AiCard } from '@/shared/ui/AiCard';
import { AiStatus } from '@/shared/ui/AiStatus';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Skeleton } from '@/shared/ui/Skeleton';

import { useAiOrderPreview } from '../api/useAiOrderPreview';
import {
  selectOrderPreviewIndicatorRows,
  sortOrderPreviewWarnings,
} from '../lib/orderPreviewDisplay';

/**
 * AI 주문 전 점검 (ia.md §4 슬롯 4번, `POST /ai/orders/preview`, 프로토타입 `showCheck`).
 *
 * ## 세 덩어리를 다 그린다
 *
 * 기획서의 "내 포트폴리오 쏠림, 주요 리스크, 반대 근거를 한 번 더 점검" 이 응답의 세
 * 필드에 그대로 대응하고, **셋 중 하나라도 빠뜨리면 이 슬롯을 만든 이유가 없어진다**
 * (ia.md §4). `before`·`after`·`delta` → 전후 비교 · `warnings` → 확인해볼 점 ·
 * `thesisConflicts` → 기록해 둔 논지. 배열이 비면 그 덩어리만 감춘다.
 *
 * **`thesisConflicts` 는 사용자 자신이 과거에 적은 논지다.** 그래서 `conflict` 만
 * 띄우지 않고 원문(`fact`)과 기록 시점(`recordedAt`)을 함께 낸다 — 그러지 않으면
 * "AI 가 내 주문에 반대한다" 로 읽혀 기획 의도가 뒤집힌다 (ia.md §4).
 *
 * ## 주문을 막지 않는다
 *
 * 경고가 있어도 제출 버튼을 잠그지 않는다. AI 명세 §7 이 "승인·거절 판단은 하지
 * 않는다" 로 못박았고 버튼을 잠그는 것은 `GET /orders/available` 뿐이다 (ia.md §1·§4).
 * **예수금 부족도 에러가 아니다** — `feasible: false` + `shortfall` 이 200 응답의
 * 본문으로 오므로 실패 자리가 아니라 본문에 그린다 (AI 명세 §7).
 *
 * 제출 버튼과 붙여 놓지 않는다 (ia.md §4:538 — 주문 확인 단계에서 오탭하면 주문이
 * 나간다). 이 블록 아래 여백은 `OrderPage` 가 준다.
 */
type OrderAiPreviewProps = {
  stockCode: string;
  side: OrderSide;
  /** 화면이 들고 있는 수량. 0 이면 요청하지 않는다. */
  quantity: number;
};

export function OrderAiPreview({
  stockCode,
  side,
  quantity,
}: OrderAiPreviewProps) {
  const navigate = useNavigate();
  const { preview, isSettling } = useAiOrderPreview(stockCode, side, quantity);

  /**
   * 아직 요청 전 (ia.md §4 "슬롯이 비어 있는 상태(아직 요청 전)와 로딩 상태를 구분").
   * 수량이 정해지지 않으면 점검할 것이 없어 자리째로 비운다 — 프로토타입도 수량이
   * 0 이면 점검 블록을 내지 않는다 (`showCheck: aiOk && s.qty>0`).
   */
  if (quantity <= 0) {
    return null;
  }

  if (isSettling || preview.isPending) {
    return (
      <div className="mt-8">
        <AiCard
          label="AI 주문 전 점검"
          headline="주문 뒤 계좌 변화를 계산하고 있어요."
        >
          {/* AiCard 는 onClick 이 없으면 <section> 이라 블록 요소를 넣어도 된다. */}
          <div className="mt-4">
            <Skeleton className="mb-2.5 h-3.5 w-[88%]" />
            <Skeleton className="mb-2.5 h-3.5 w-[70%]" />
            <Skeleton className="h-3.5 w-[80%]" />
          </div>
        </AiCard>
      </div>
    );
  }

  if (preview.isError) {
    const error = preview.error;
    const code = isHttpError(error) ? (error.code ?? undefined) : undefined;

    // 재시도가 무의미한 자리다. `AiStatus` 가 코드로 판정해 버튼을 내지 않는다.
    if (code === AI_SERVICE_ERROR_CODES.INSUFFICIENT_DATA) {
      return (
        <AiStatus
          code={code}
          /*
           * 제목이 `~할 수 없어요` 로 끝나지 않는다. 아래 `message` 가 세 갈래 모두
           * `~할 수 없습니다` 로 끝나서 같은 낱말을 쓰면 두 줄이 겹쳐 읽힌다.
           * `건너뛰었어요` 는 ia.md §4 의 "이 슬롯은 주문을 막지 않는다" 도 함께
           * 전달한다 — 사용자가 이 자리에서 막혔다고 오해하지 않게 한다.
           */
          title="주문 전 점검을 건너뛰었어요"
          /*
           * **활성 조건을 화면이 단정하지 않는다.** 이 슬롯의 `INSUFFICIENT_DATA` 는 세
           * 갈래에서 온다 (AI `app/api/routes/orders.py`) — 원장을 못 읽음
           * (`ledger_unavailable`) · LLM 키 없음(`llm_key_missing`) · 그 종목 종가 없음
           * (`reason` 없음). 어느 쪽인지는 서버만 안다.
           *
           * 그래서 `message` 를 그대로 쓴다. apiSpec §1.3 이 이 값을 "사용자에게 그대로
           * 보여도 되는 한국어 문구" 로 보장하고, 서버가 세 갈래를 각각 다른 문장으로
           * 구분해 준다. 아래 일반 실패 분기와 같은 방식이다 (컨벤션 §5).
           *
           * 직전 문구 `매수 이유를 기록하면 주문 전에 대조해드릴게요` 는 프로토타입의
           * 데모 토글(`aiState==="short"`)에서 옮겨온 것이라 서버 판정과 무관했다.
           * 실제로 온 응답은 `ledger_unavailable` 이었고, 그 상태에서는 매수 이유를
           * 아무리 적어도 이 블록이 열리지 않는다 — design.md §10 이 금지한
           * "`~하면 볼 수 있어요`" (기다리면 열린다는 거짓 인상) 그대로였다.
           */
          description={
            isHttpError(error)
              ? error.message
              : '주문 전 점검에 필요한 정보를 아직 불러오지 못했어요.'
          }
          className="pt-8.5 pb-4"
        />
      );
    }

    return (
      <AiStatus
        code={code}
        title="점검 결과를 불러오지 못했어요"
        // 문구는 서버가 완성해 준 message 를 그대로 쓴다 (컨벤션 §5).
        description={
          isHttpError(error) ? error.message : '잠시 후 다시 시도해 주세요.'
        }
        onRetry={() => void preview.refetch()}
        className="pt-8.5 pb-4"
      />
    );
  }

  const { feasible, shortfall, warnings, thesisConflicts, summary } =
    preview.data;
  const indicatorRows = selectOrderPreviewIndicatorRows(preview.data);
  const sortedWarnings = sortOrderPreviewWarnings(warnings);

  return (
    <div className="mt-8">
      <AiCard
        label="AI 주문 전 점검"
        headline={summary?.text ?? '점검 결과를 준비하지 못했어요.'}
      >
        {indicatorRows.length > 0 && (
          <div className="mt-4 flex flex-col gap-3.5">
            {indicatorRows.map((row) => (
              <div key={row.key}>
                <div className="mb-1 text-caption text-ai-text-muted">
                  {row.label}
                </div>
                {/* Before 는 회색, After 는 AI 액센트다 (design.md §7.7 "표현").
                    같은 값을 두 번 반복하지 않고 `17% · 큰 변화 없음` 으로 말한다. */}
                <div className="flex items-baseline gap-3">
                  <span className="text-body-2 text-ai-text-secondary tabular-nums">
                    {row.before}
                  </span>
                  {row.unchanged ? (
                    <span className="text-caption text-ai-text-secondary">
                      · 큰 변화 없음
                    </span>
                  ) : (
                    <>
                      <span
                        aria-hidden="true"
                        className="text-caption text-ai-text-muted"
                      >
                        →
                      </span>
                      <span className="text-body-1 font-bold text-ai-accent tabular-nums">
                        {row.after}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {sortedWarnings.length > 0 && (
          <div className="mt-4.5">
            {/* 경고 삼각형·빨간 강조를 쓰지 않는다 (design.md §7.7 "표현"). */}
            <div className="mb-1.5 flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-1 flex-none rounded-full bg-ai-accent"
              />
              <h3 className="text-caption font-semibold tracking-[.02em] text-ai-accent">
                확인해볼 점
              </h3>
            </div>
            {sortedWarnings.map((warning) => (
              <p
                key={warning.id}
                className="mt-1 text-body-2 text-pretty text-ai-text-primary first:mt-0"
              >
                {warning.text}
              </p>
            ))}
          </div>
        )}

        {thesisConflicts.length > 0 && (
          <div className="mt-4 border-l-2 border-ai-divider pl-3">
            {thesisConflicts.map((conflict) => (
              <div key={conflict.id} className="mt-3.5 first:mt-0">
                <div className="text-caption text-ai-text-muted">
                  {formatKstDate(conflict.recordedAt)} 기록
                </div>
                <p className="mt-1.5 text-body-2 text-pretty text-ai-text-primary">
                  {conflict.fact}
                </p>
                <p className="mt-1.5 text-body-2 text-pretty text-ai-text-secondary">
                  {conflict.conflict}
                </p>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-caption text-ai-text-muted">참고용 정보예요.</p>
      </AiCard>

      {/* 예수금이 모자란다. **에러 화면이 아니라 본문이다** — `feasible: false` 는
          200 응답이다 (AI 명세 §7, `mocks/handlers/ai.ts` 표). 부족액을 그대로 보여주고
          충전 화면으로 보낸다 (ia.md §4 — "주문 → 예수금 부족 → 충전 → 주문 복귀"
          흐름이 여기서 시작된다).
          빨간 박스를 쓰지 않고 원형 `!` + 문구다 (design.md §10 · §16). */}
      {!feasible && shortfall !== null && (
        <Card className="mt-4">
          <div className="flex items-start gap-2.25">
            <span
              aria-hidden="true"
              className="mt-1 flex size-4.5 flex-none items-center justify-center rounded-full border-[1.4px] border-text-muted text-[11px] font-bold text-text-muted"
            >
              !
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-body-1 font-semibold text-text-primary">
                주문할 수 있는 금액이 부족해요.
              </p>
              <p className="mt-1.25 text-body-2 leading-[21px] text-text-secondary">
                {formatKrw(shortfall)}이 더 필요해요.
              </p>
            </div>
          </div>
          {/* 라벨은 이미 있는 두 자리(홈 `TotalAssetsSummary`, 아래 주문 차단 안내)와
              같은 낱말을 쓴다. 프로토타입의 같은 버튼은 `충전하기` 라 갈리는데,
              이 티켓에서 정할 것이 아니라 그대로 두고 보고한다. */}
          <Button
            variant="secondary"
            className="mt-3.5"
            onClick={() => void navigate(ROUTES.deposit)}
          >
            입금하기
          </Button>
        </Card>
      )}
    </div>
  );
}
