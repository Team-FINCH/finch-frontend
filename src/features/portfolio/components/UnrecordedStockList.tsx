import { formatAmount, formatKrw } from '@/shared/lib/formatNumber';
import { type Holding } from '@/shared/types/portfolio';
import { StockLogo } from '@/shared/ui/StockLogo';

/**
 * "아직 적지 않은 종목" — 매수 이유를 남기지 않은 보유 종목 (프로토타입
 * `unrecorded`, FINCH-154). 종목이 없으면 섹션 자체가 나오지 않는다.
 *
 * ## "이유 적기" 는 시트를 연다
 *
 * 프로토타입과 같다. 행을 누르면 그 종목의 매수 이유 시트가 그 자리에서 열린다
 * (`ThesisEditSheet`, 신규 기록 갈래).
 *
 * **2026-09-11 까지는 AI 채팅으로 보냈다.** 프론트에 논지를 새로 만들 경로가 없어서
 * 우회한 것이다 — 가진 것은 수정(`PUT /wiki/theses/{stockCode}`)뿐이었고 그것도
 * 활성 논지가 없으면 서버가 거부하므로, 시트를 열어 봐야 저장할 곳이 없었다.
 * 그래서 논지가 실제로 생기는 유일한 길인 AI 채팅으로 종목 맥락을 실어 보냈다.
 * `POST /wiki/theses` 중계가 열리면서(이슈 #56 · apiSpec v0.8.8 · contracts C97)
 * 그 이유가 사라졌고, 목록과 문구는 그때 것을 그대로 쓴다.
 *
 * 이 목록은 제출 결과를 모른다 — 저장 뒤 `GET /wiki` 를 다시 부르면 그 종목에
 * 논지가 생겨 이 목록에서 저절로 빠진다(`WikiTab` 이 `theses` 로 거른다).
 */
type UnrecordedStockListProps = {
  holdings: Holding[];
  onRecord: (holding: Holding) => void;
};

export function UnrecordedStockList({
  holdings,
  onRecord,
}: UnrecordedStockListProps) {
  if (holdings.length === 0) {
    return null;
  }

  return (
    /*
      프로토타입은 위에 불투명도 .4 구분선을 두고 여백을 18px 만 준다
      (proto L2462-2464). 구분선 없이 48px 을 띄우던 것을 맞췄다.
    */
    <section className="mt-0.5 border-t border-border/40 pt-4.5 pb-1">
      <div className="flex items-baseline justify-between">
        <span className="text-[15px] font-semibold text-text-primary">
          아직 적지 않은 종목
        </span>
        <span className="text-caption text-text-secondary">
          {holdings.length}개
        </span>
      </div>
      <p className="mt-1.25 text-caption text-text-secondary">
        종목을 고르면 매수 이유를 적을 수 있어요.
      </p>

      <div className="mt-3 flex flex-col gap-0.5">
        {holdings.map((holding) => (
          <button
            key={holding.stockCode}
            type="button"
            onClick={() => onRecord(holding)}
            className="flex w-full items-center gap-3 py-2.75 text-left"
          >
            <StockLogo
              stockCode={holding.stockCode}
              stockName={holding.stockName}
              size="dense"
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[15px] leading-5 font-medium text-text-primary">
                {holding.stockName}
              </span>
              <span className="text-caption text-text-secondary">
                {formatAmount(holding.quantity)}주 ·{' '}
                {formatKrw(holding.avgBuyPrice)}
              </span>
            </span>
            <span className="flex flex-none items-center gap-1 text-[14px] font-medium text-text-secondary">
              이유 적기
              <span aria-hidden="true" className="text-text-muted">
                ›
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
